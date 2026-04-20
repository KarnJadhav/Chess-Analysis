import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/sessionUtils';
import { Game } from '@/models/Game';

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

    res.status(200).json({ games });
  } catch (err) {
    console.error('List games error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: 'Failed to fetch games: ' + errorMsg });
  }
}
