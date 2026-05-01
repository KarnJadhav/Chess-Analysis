import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthSecret } from '@/lib/authSecret';

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    mongodb_uri: boolean;
    nextauth_secret: boolean;
    nextauth_url: string | undefined;
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse<HealthResponse>) {
  const hasMongoUri = !!process.env.MONGODB_URI;
  const secret = getAuthSecret();
  const hasRealSecret = secret !== 'chanakya-fallback-auth-secret';
  const nextauthUrl = process.env.NEXTAUTH_URL;

  const allOk = hasMongoUri && hasRealSecret;
  const status = allOk ? 'ok' : 'degraded';

  res.status(200).json({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      mongodb_uri: hasMongoUri,
      nextauth_secret: hasRealSecret,
      nextauth_url: nextauthUrl,
    },
  });
}
