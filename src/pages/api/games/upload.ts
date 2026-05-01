import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/sessionUtils';
import { Game } from '@/models/Game';
import { parsePGNMetadata } from '@/lib/pgnParser';
import { validatePGN } from '@/lib/validation';
import { detectOpeningFromPgn } from '@/lib/openings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await requireAuth(req, res);
    if (!authResult.authenticated) {
      return;
    }
    const userId = authResult.userEmail!;

    // Validate PGN input
    const { pgn } = req.body;
    let validatedPgn: string;
    try {
      validatedPgn = validatePGN(pgn);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Invalid PGN';
      return res.status(400).json({ error: errorMsg });
    }

    // Parse PGN metadata
    const meta = parsePGNMetadata(validatedPgn);
    const detectedOpening = meta.opening || detectOpeningFromPgn(validatedPgn);

    // Connect to database
    const client = await clientPromise;
    const db = client.db();

    // Create game record
    const game: Game = {
      userId,
      pgn: validatedPgn,
      result: meta.result,
      date: meta.date ? new Date(meta.date) : new Date(),
      opponent: meta.opponent,
      opening: detectedOpening !== 'Unknown Opening' ? detectedOpening : undefined,
      analysisStatus: 'pending',
      analysisComplete: false,
    };

    // Insert game
    const result = await db.collection<Game>('games').insertOne(game);

    // Trigger Stockfish analysis asynchronously (fire and forget)
    // This prevents the API response from being delayed by analysis
    (async () => {
      try {
        const { analyzePGNAndSave } = await import('@/lib/stockfishAnalysis');
        await analyzePGNAndSave({ pgn: validatedPgn, userId, gameId: result.insertedId.toString() });
      } catch (err) {
        console.error('Stockfish analysis failed for game:', result.insertedId, err);
        // Update game record to mark analysis as failed
        try {
          await db.collection<Game>('games').updateOne(
            { _id: result.insertedId },
            {
              $set: {
                analysisStatus: 'failed',
                analysisComplete: false,
                analysisError: err instanceof Error ? err.message : 'Unknown error',
              },
            }
          );
        } catch (updateErr) {
          console.error('Failed to update analysis status:', updateErr);
        }
      }
    })();

    return res.status(201).json({ 
      message: 'Game uploaded successfully. Analysis will be available shortly.',
      gameId: result.insertedId 
    });
  } catch (err) {
    console.error('Upload error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: 'Failed to upload game: ' + errorMsg });
  }
}
