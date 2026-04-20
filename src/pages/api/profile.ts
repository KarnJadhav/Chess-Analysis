import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { getSession } from 'next-auth/react';
import { User } from '@/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const client = await clientPromise;
  const db = client.db();
  const email = session.user.email;

  if (req.method === 'GET') {
    const user = await db.collection<User>('users').findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  }

  if (req.method === 'POST') {
    const { displayName, lichessAccount, chesscomAccount, theme } = req.body;
    await db.collection<User>('users').updateOne(
      { email },
      { $set: {
        username: displayName,
        lichessAccount,
        chesscomAccount,
        theme,
      } }
    );
    return res.status(200).json({ message: 'Profile updated' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
