/**
 * API Error Handler Utility
 * Provides consistent error handling across all API routes
 */

import { NextApiResponse } from 'next';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function handleApiError(err: unknown, res: NextApiResponse) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  if (err instanceof Error) {
    console.error('API Error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  const errorMessage = String(err);
  console.error('Unknown Error:', errorMessage);
  return res.status(500).json({
    error: 'Internal server error',
  });
}

// Common API errors
export const ApiErrors = {
  UNAUTHORIZED: new ApiError(401, 'Unauthorized: Please sign in'),
  FORBIDDEN: new ApiError(403, 'Forbidden: You do not have permission'),
  NOT_FOUND: new ApiError(404, 'Not found'),
  BAD_REQUEST: (message = 'Bad request') => new ApiError(400, message),
  CONFLICT: (message = 'Conflict') => new ApiError(409, message),
  INTERNAL_ERROR: (message = 'Internal server error') => new ApiError(500, message),
};
