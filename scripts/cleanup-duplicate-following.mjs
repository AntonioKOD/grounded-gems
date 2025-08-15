import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sacavia';

async function cleanupDuplicateFollowing() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Find all users with following arrays
    const users = await usersCollection.find({ following: { $exists: true } }).toArray();
    console.log(`🔍 Found ${users.length} users with following arrays`);
    
    let totalDuplicatesRemoved = 0;
    let usersUpdated = 0;
    
    for (const user of users) {
      if (Array.isArray(user.following) && user.following.length > 0) {
        const originalLength = user.following.length;
        const uniqueFollowing = [...new Set(user.following)];
        const duplicatesRemoved = originalLength - uniqueFollowing.length;
        
        if (duplicatesRemoved > 0) {
          console.log(`🧹 User ${user.name || user.email} (${user._id}): Removed ${duplicatesRemoved} duplicates from following list`);
          console.log(`   Original: ${originalLength} entries, Cleaned: ${uniqueFollowing.length} entries`);
          
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { following: uniqueFollowing } }
          );
          
          totalDuplicatesRemoved += duplicatesRemoved;
          usersUpdated++;
        }
      }
    }
    
    console.log('\n✅ Cleanup completed!');
    console.log(`📊 Users updated: ${usersUpdated}`);
    console.log(`📊 Total duplicates removed: ${totalDuplicatesRemoved}`);
    
    // Also clean up followers arrays
    console.log('\n🧹 Cleaning up followers arrays...');
    
    const usersWithFollowers = await usersCollection.find({ followers: { $exists: true } }).toArray();
    console.log(`🔍 Found ${usersWithFollowers.length} users with followers arrays`);
    
    let followersDuplicatesRemoved = 0;
    let followersUsersUpdated = 0;
    
    for (const user of usersWithFollowers) {
      if (Array.isArray(user.followers) && user.followers.length > 0) {
        const originalLength = user.followers.length;
        const uniqueFollowers = [...new Set(user.followers)];
        const duplicatesRemoved = originalLength - uniqueFollowers.length;
        
        if (duplicatesRemoved > 0) {
          console.log(`🧹 User ${user.name || user.email} (${user._id}): Removed ${duplicatesRemoved} duplicates from followers list`);
          console.log(`   Original: ${originalLength} entries, Cleaned: ${uniqueFollowers.length} entries`);
          
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { followers: uniqueFollowers } }
          );
          
          followersDuplicatesRemoved += duplicatesRemoved;
          followersUsersUpdated++;
        }
      }
    }
    
    console.log('\n✅ Followers cleanup completed!');
    console.log(`📊 Users updated: ${followersUsersUpdated}`);
    console.log(`📊 Total duplicates removed: ${followersDuplicatesRemoved}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await client.close();
    console.log('🔗 Disconnected from MongoDB');
  }
}

cleanupDuplicateFollowing();
