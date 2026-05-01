import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/sessionUtils';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await requireAuth(req, res);
    if (!authResult.authenticated) {
      return;
    }

    // Validate gameId parameter
    const { gameId } = req.query;
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid gameId' });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: 'Invalid gameId format' });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db();

    if (req.method === 'GET') {
      const game = await db.collection('games').findOne({
        _id: new ObjectId(gameId),
        userId: authResult.userEmail,
      });

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      return res.status(200).json({
        analysis: game.analysis || null,
        analysisStatus: game.analysisStatus || (game.analysisComplete ? 'completed' : 'pending'),
        analysisError: game.analysisError || null,
        analysisComplete: !!game.analysisComplete,
      });
    }

    const { analysis, analysisStatus, analysisError } = req.body || {};

    if (analysisStatus === 'failed') {
      await db.collection('games').updateOne(
        { _id: new ObjectId(gameId), userId: authResult.userEmail },
        {
          $set: {
            analysisStatus: 'failed',
            analysisComplete: false,
            analysisError: typeof analysisError === 'string' ? analysisError : 'Analysis failed',
          },
        }
      );

      return res.status(200).json({ message: 'Analysis failure recorded' });
    }

    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({ error: 'Missing analysis payload' });
    }

    await db.collection('games').updateOne(
      { _id: new ObjectId(gameId), userId: authResult.userEmail },
      {
        $set: {
          analysis,
          analysisStatus: 'completed',
          analysisComplete: true,
          analysisError: null,
        },
      }
    );

    res.status(200).json({ message: 'Analysis saved successfully' });
  } catch (err) {
    console.error('Analysis endpoint error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: 'Failed to process analysis: ' + errorMsg });
  }
}
