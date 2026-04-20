import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import { User } from '@/models/User';
import { validateEmail, validatePassword, sanitizeEmail, sanitizeUsername } from '@/lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, username } = req.body;

    // Validate required fields
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: passwordValidation.errors 
      });
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedUsername = sanitizeUsername(username);

    if (!sanitizedUsername) {
      return res.status(400).json({ error: 'Username contains invalid characters' });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db();

    // Check if email already exists
    const existing = await db.collection<User>('users').findOne({ email: sanitizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Check if username already exists
    const usernameExists = await db.collection<User>('users').findOne({ username: sanitizedUsername });
    if (usernameExists) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await hash(password, 10);

    // Create user
    const user: User = {
      username: sanitizedUsername,
      email: sanitizedEmail,
      passwordHash,
    };

    await db.collection<User>('users').insertOne(user);

    return res.status(201).json({ 
      message: 'User created successfully',
      user: { email: sanitizedEmail, username: sanitizedUsername }
    });
  } catch (err) {
    console.error('Signup error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: 'Failed to create user: ' + errorMsg });
  }
}
