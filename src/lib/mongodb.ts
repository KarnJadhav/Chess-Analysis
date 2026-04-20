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

// Validate configuration
if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set. Please add it to .env.local or .env');
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

export default clientPromise;
