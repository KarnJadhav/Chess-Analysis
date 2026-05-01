import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Validate configuration. Do not throw during module import to avoid crashing serverless functions.
if (!uri) {
  // Create a rejected promise so callsites receive a clear error when they attempt DB access.
  // This prevents module-level throws that result in 500s with less helpful stack traces.
  // Consumers should set MONGODB_URI in their environment (e.g., .env.local, Vercel env vars).
  console.warn('MONGODB_URI environment variable is not set. Database operations will fail until it is provided.');
}

if (process.env.NODE_ENV === 'development') {
  // Use global in development to preserve client across reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client
      .connect()
      .catch((err) => {
        console.error('Failed to connect to MongoDB:', err.message);
        throw err;
      });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client
    .connect()
    .catch((err) => {
      console.error('Failed to connect to MongoDB:', err.message);
      throw err;
    });
}

// If uri was empty, export a rejected promise to surface the configuration error at call sites.
if (!uri) {
  clientPromise = Promise.reject(new Error('MONGODB_URI environment variable is not set')) as Promise<MongoClient>;
}

export default clientPromise;
