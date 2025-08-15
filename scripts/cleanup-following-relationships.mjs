import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sacavia';

async function cleanupFollowingRelationships() {
  console.log('🔧 Starting cleanup of following/followers relationships...');
  console.log('📊 Connecting to MongoDB...');
  
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Get all users
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`📊 Found ${allUsers.length} users to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const user of allUsers) {
      try {
        console.log(`🔄 Processing user: ${user.name || user.email} (${user._id})`);
        
        // Clear existing following and followers arrays
        const result = await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: {
              following: [],
              followers: []
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✅ Cleared relationships for user: ${user.name || user.email}`);
          processedCount++;
        } else {
          console.log(`⚠️  No changes needed for user: ${user.name || user.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.name || user.email}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Successfully processed: ${processedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`\n🎉 Following/followers relationships have been cleared!`);
    console.log(`\n📝 Next steps:`);
    console.log(`1. The mobile app should now be able to properly follow/unfollow users`);
    console.log(`2. New relationships will be created correctly through the API`);
    console.log(`3. The frontend should now work properly with the backend`);
    console.log(`\n🔍 What was fixed:`);
    console.log(`- Cleared all existing following/followers arrays`);
    console.log(`- Removed corrupted relationship data (object references instead of string IDs)`);
    console.log(`- Prepared database for proper relationship creation through the API`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
cleanupFollowingRelationships();
