/**
 * Session utilities - standardized session handling for API routes
 */

import { getServerSession } from 'next-auth/next';
import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

interface SessionUser {
  id?: string;
  email?: string;
  name?: string;
}

interface AuthSession {
  user?: SessionUser;
  expires?: string;
}

/**
 * Get authenticated session from request
 * Consistent method for all API routes (uses server-side getServerSession)
 */
export async function getAuthenticatedSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthSession | null> {
  const session = await getServerSession(req, res, authOptions);
  return session as AuthSession | null;
}

/**
 * Verify session and extract user email
 * Returns email if authenticated, null otherwise
 */
export async function getAuthenticatedUserEmail(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const session = await getAuthenticatedSession(req, res);
  return session?.user?.email ?? null;
}

/**
 * Require authentication middleware
 * Returns error response and false if not authenticated
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ authenticated: boolean; userEmail?: string }> {
  const userEmail = await getAuthenticatedUserEmail(req, res);
  
  if (!userEmail) {
    res.status(401).json({ error: 'Unauthorized: Please sign in' });
    return { authenticated: false };
  }

  return { authenticated: true, userEmail };
}
