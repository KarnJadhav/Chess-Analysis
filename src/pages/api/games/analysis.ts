import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/sessionUtils';
import { ObjectId } from 'mongodb';
import { getAIReview, getMoveExplanation } from '@/lib/aiReview';

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

    const gameIdFromQuery = typeof req.query.gameId === 'string' ? req.query.gameId : undefined;
    const gameIdFromBody =
      req.method === 'POST' && req.body && typeof req.body.gameId === 'string'
        ? req.body.gameId
        : undefined;
    const gameId = gameIdFromQuery || gameIdFromBody;

    if (!gameId) {
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

    const { analysis, analysisStatus, analysisError, generateAi, forceAi, useStoredAnalysis } = req.body || {};

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

    let analysisPayload = analysis as Record<string, unknown> | undefined;

    if ((!analysisPayload || typeof analysisPayload !== 'object') && useStoredAnalysis) {
      const existingGame = await db.collection('games').findOne(
        { _id: new ObjectId(gameId), userId: authResult.userEmail },
        { projection: { analysis: 1 } }
      );
      if (existingGame?.analysis && typeof existingGame.analysis === 'object') {
        analysisPayload = existingGame.analysis as Record<string, unknown>;
      }
    }

    if (!analysisPayload || typeof analysisPayload !== 'object') {
      return res.status(400).json({ error: 'Missing analysis payload' });
    }

    const analysisToSave = { ...(analysisPayload as Record<string, unknown>) };

    const existingAiReview = (analysisPayload as { aiReview?: unknown }).aiReview;
    const shouldGenerateAi = generateAi !== false && (forceAi || !existingAiReview);

    if (shouldGenerateAi && process.env.OPENROUTER_API_KEY) {
      try {
        const game = await db.collection('games').findOne(
          { _id: new ObjectId(gameId), userId: authResult.userEmail },
          { projection: { opening: 1 } }
        );

        const reviewMovesSource =
          (analysisPayload as { review?: { reviewedMoves?: any[] }; reviewedMoves?: any[] }).review?.reviewedMoves ||
          (analysisPayload as { reviewedMoves?: any[] }).reviewedMoves ||
          [];

        const criticalMoves = reviewMovesSource
          .filter((move) => ['blunder', 'mistake', 'brilliant'].includes(move.classification))
          .slice(0, 6);

        const aiComments = await Promise.all(
          criticalMoves.map(async (move) => {
            const explanation = await getMoveExplanation({
              move: move.san,
              evalBefore: move.evalBefore,
              evalAfter: move.evalAfter,
              bestMove: move.bestMove,
              classification: move.classification,
            });
            return { moveNumber: move.moveNumber, aiComment: explanation };
          })
        );

        const aiCommentByMove = new Map<number, string>();
        aiComments.forEach((entry) => {
          if (typeof entry.aiComment === 'string' && entry.aiComment.trim()) {
            aiCommentByMove.set(entry.moveNumber, entry.aiComment.trim());
          }
        });

        const updateMovesWithAi = (moves: any[]) =>
          moves.map((move) => {
            const aiComment = aiCommentByMove.get(move.moveNumber);
            if (!aiComment) return move;
            return { ...move, aiComment };
          });

        const playerSummary = (analysisPayload as { playerSummary?: any }).playerSummary;
        const accuracyWhite =
          (analysisPayload as { accuracyWhite?: number }).accuracyWhite ??
          playerSummary?.white?.accuracy ??
          0;
        const accuracyBlack =
          (analysisPayload as { accuracyBlack?: number }).accuracyBlack ??
          playerSummary?.black?.accuracy ??
          0;

        const blunders = (playerSummary?.white?.blunders ?? 0) + (playerSummary?.black?.blunders ?? 0);
        const mistakes = (playerSummary?.white?.mistakes ?? 0) + (playerSummary?.black?.mistakes ?? 0);
        const inaccuracies = (playerSummary?.white?.inaccuracies ?? 0) + (playerSummary?.black?.inaccuracies ?? 0);

        const criticalPositions =
          (analysisPayload as { criticalPositions?: any[] }).criticalPositions ||
          criticalMoves.map((move) => ({
            moveNumber: move.moveNumber,
            classification: move.classification,
            evalBefore: move.evalBefore,
            evalAfter: move.evalAfter,
            bestMove: move.bestMove,
            san: move.san,
            side: move.side,
          }));

        const aiReview = await getAIReview({
          opening: typeof game?.opening === 'string' ? game.opening : '',
          accuracyWhite,
          accuracyBlack,
          blunders,
          mistakes,
          inaccuracies,
          criticalPositions: criticalPositions.slice(0, 6),
        });

        analysisToSave.aiReview = aiReview;
        analysisToSave.aiReviewStatus = 'completed';
        analysisToSave.aiReviewError = null;

        if ((analysisPayload as { review?: { reviewedMoves?: any[] } }).review?.reviewedMoves) {
          analysisToSave.review = {
            ...(analysisPayload as { review?: Record<string, unknown> }).review,
            reviewedMoves: updateMovesWithAi(
              (analysisPayload as { review?: { reviewedMoves?: any[] } }).review?.reviewedMoves || []
            ),
          };
        }

        if ((analysisPayload as { reviewedMoves?: any[] }).reviewedMoves) {
          analysisToSave.reviewedMoves = updateMovesWithAi(
            (analysisPayload as { reviewedMoves?: any[] }).reviewedMoves || []
          );
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate AI review';
        analysisToSave.aiReviewStatus = 'failed';
        analysisToSave.aiReviewError = errorMsg;
      }
    } else if (generateAi !== false && !process.env.OPENROUTER_API_KEY) {
      analysisToSave.aiReviewStatus = 'skipped';
      analysisToSave.aiReviewError = 'OPENROUTER_API_KEY is not set';
    }

    await db.collection('games').updateOne(
      { _id: new ObjectId(gameId), userId: authResult.userEmail },
      {
        $set: {
          analysis: analysisToSave,
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
