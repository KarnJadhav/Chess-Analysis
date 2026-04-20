import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/sessionUtils';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await requireAuth(req, res);
    if (!authResult.authenticated) {
      return;
    }
    const userId = authResult.userEmail!;

    // Validate game ID parameter
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid game ID' });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db();

    // Delete game (verify ownership)
    const result = await db.collection('games').deleteOne({ 
      _id: new ObjectId(id), 
      userId 
    });

    if (result.deletedCount === 1) {
      // Also delete associated analysis
      try {
        await db.collection('analysis').deleteOne({ gameId: id });
      } catch (err) {
        console.warn('Failed to delete analysis record:', err);
        // Don't fail the response if analysis deletion fails
      }

      return res.status(200).json({ message: 'Game deleted successfully' });
    } else {
      return res.status(404).json({ error: 'Game not found or not owned by user' });
    }
  } catch (err) {
    console.error('Delete game error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: 'Failed to delete game: ' + errorMsg });
  }
}
