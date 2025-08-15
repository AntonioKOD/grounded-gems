import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sacavia';

async function verifyCleanup() {
  console.log('🔍 Verifying cleanup of following/followers relationships...');
  console.log('📊 Connecting to MongoDB...');
  
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check for users with non-empty following/followers
    const usersWithFollowing = await usersCollection.find({
      following: { $exists: true, $ne: [] }
    }).toArray();
    
    const usersWithFollowers = await usersCollection.find({
      followers: { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`📊 Users with following relationships: ${usersWithFollowing.length}`);
    console.log(`📊 Users with followers relationships: ${usersWithFollowers.length}`);
    
    if (usersWithFollowing.length > 0) {
      console.log('\n⚠️  Users still have following relationships:');
      usersWithFollowing.forEach(user => {
        console.log(`   - ${user.name || user.email}: ${user.following.length} following`);
      });
    }
    
    if (usersWithFollowers.length > 0) {
      console.log('\n⚠️  Users still have followers relationships:');
      usersWithFollowers.forEach(user => {
        console.log(`   - ${user.name || user.email}: ${user.followers.length} followers`);
      });
    }
    
    if (usersWithFollowing.length === 0 && usersWithFollowers.length === 0) {
      console.log('\n✅ Cleanup successful! All following/followers relationships have been cleared.');
      console.log('\n🎯 The database is now ready for the mobile app to create new relationships.');
      console.log('\n📱 Next steps:');
      console.log('1. Test the mobile app follow/unfollow functionality');
      console.log('2. New relationships will be created properly through the API');
      console.log('3. The frontend should now work correctly');
    } else {
      console.log('\n❌ Cleanup incomplete. Some relationships still exist.');
      console.log('💡 You may need to run the cleanup script again.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
verifyCleanup();
