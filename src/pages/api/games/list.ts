import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/sessionUtils';
import { Game } from '@/models/Game';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await requireAuth(req, res);
    if (!authResult.authenticated) {
      return;
    }
    const userId = authResult.userEmail!;

    // Connect to database
    const client = await clientPromise;
    const db = client.db();

    // Build query
    const { search = '' } = req.query;
    const query: Record<string, unknown> = { userId };

    if (search && typeof search === 'string') {
      query.$or = [
        { opponent: { $regex: search, $options: 'i' } },
        { opening: { $regex: search, $options: 'i' } },
        { result: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch games sorted by date (newest first)
    const games = await db
      .collection<Game>('games')
      .find(query)
      .sort({ date: -1 })
      .toArray();

    const maxPendingMs = parseInt(process.env.ANALYSIS_MAX_PENDING_MS || '600000', 10);
    const now = Date.now();
    const stalePendingIds: ObjectId[] = [];

    for (const game of games) {
      if (game.analysisComplete || game.analysisStatus !== 'pending') continue;
      const createdAt = game.date instanceof Date ? game.date.getTime() : new Date(game.date).getTime();
      if (!Number.isFinite(createdAt)) continue;
      if (now - createdAt > maxPendingMs && game._id) {
        stalePendingIds.push(new ObjectId(game._id));
        game.analysisStatus = 'failed';
        game.analysisError = 'Analysis timed out on server. Please try uploading again.';
      }
    }

    if (stalePendingIds.length > 0) {
      await db.collection('games').updateMany(
        { _id: { $in: stalePendingIds }, userId, analysisStatus: 'pending', analysisComplete: false },
        {
          $set: {
            analysisStatus: 'failed',
            analysisError: 'Analysis timed out on server. Please try uploading again.',
            analysisComplete: false,
          },
        }
      );
    }

    res.status(200).json({ games });
  } catch (err) {
    console.error('List games error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: 'Failed to fetch games: ' + errorMsg });
  }
}
