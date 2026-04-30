const FALLBACK_SECRET = 'chanakya-fallback-auth-secret';

export function getAuthSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || FALLBACK_SECRET;
}
