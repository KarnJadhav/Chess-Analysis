import NextAuth, { type AuthOptions, type Session } from 'next-auth';
import { type JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import clientPromise from '@/lib/mongodb';
import { User as UserModel } from '@/models/User';
import { compare } from 'bcryptjs';
import { getAuthSecret } from '@/lib/authSecret';

export const authOptions: AuthOptions = {
  secret: getAuthSecret(),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email and password required');
          }

          const normalizedEmail = credentials.email.trim().toLowerCase();

          const client = await clientPromise;
          const db = client.db();
          const user = await db.collection<UserModel>('users').findOne({ email: normalizedEmail });

          if (!user) {
            return null;
          }

          const isPasswordValid = await compare(credentials.password, user.passwordHash);
          if (!isPasswordValid) {
            return null;
          }

          return { 
            id: user._id?.toString() || '', 
            name: user.username, 
            email: user.email 
          };
        } catch (err) {
          if (err instanceof Error && err.message === 'Email and password required') {
            throw err;
          }
          console.error('Authorization error:', err);
          throw new Error('Authorization failed');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      const jwtToken = token as JWT & { id?: string };
      if (user) {
        jwtToken.id = user.id;
        jwtToken.email = user.email;
      }
      return jwtToken;
    },
    async session({ session, token }) {
      const sessionWithId = session as Session & {
        user?: Session['user'] & { id?: string };
      };
      const jwtToken = token as JWT & { id?: string };
      if (sessionWithId.user) {
        sessionWithId.user.id = jwtToken.id;
      }
      return sessionWithId;
    },
  },
};

export default NextAuth(authOptions);
