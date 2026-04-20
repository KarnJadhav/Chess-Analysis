const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const uriMatch = envContent
  .split('\n')
  .find(line => line.startsWith('MONGODB_URI='));

if (!uriMatch) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

const uri = uriMatch.split('=')[1].trim();

console.log('Testing MongoDB connection...');
const domain = uri.split('@')[1]?.split('/')[0] || 'unknown';
console.log(`Cluster: ${domain}`);
console.log(`Full URI: ${uri.substring(0, 80)}...\n`);

(async () => {
  try {
    const client = new MongoClient(uri, { 
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    
    console.log('⏳ Connecting...');
    await client.connect();
    
    console.log('✓ Connection successful!\n');
    
    // Test database access
    const db = client.db();
    const adminDb = client.db('admin');
    const status = await adminDb.command({ ping: 1 });
    console.log('✓ Ping successful');
    
    const collections = await db.listCollections().toArray();
    console.log(`✓ Collections found: ${collections.map(c => c.name).join(', ') || '(none)'}\n`);
    
    await client.close();
    console.log('✓ Connection closed - All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Connection failed!\n');
    console.error(`Error: ${err.message}\n`);
    console.error('Troubleshooting steps:');
    console.error('  1. Verify cluster exists at: https://cloud.mongodb.com/');
    console.error('  2. Check username & password in MONGODB_URI');
    console.error('  3. Add your IP to Network Access: https://cloud.mongodb.com/v2/[cluster-id]#security/network/accessList');
    console.error('  4. Ensure stable internet connection');
    console.error('  5. Try from a different network (if behind corporate firewall)');
    process.exit(1);
  }
})();
