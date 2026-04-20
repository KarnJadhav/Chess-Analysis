import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/sessionUtils';
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

    // Fetch analysis
    const analysis = await db.collection('analysis').findOne({ 
      gameId: new ObjectId(gameId)
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.status(200).json({ analysis });
  } catch (err) {
    console.error('Get analysis error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: 'Failed to fetch analysis: ' + errorMsg });
  }
}
