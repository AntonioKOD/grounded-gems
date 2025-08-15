import { getPayload } from 'payload';
import config from '../payload.config.ts';

async function fixFollowingRelationships() {
  console.log('🔧 Starting to fix following/followers relationships...');
  
  try {
    const payload = await getPayload({ config });
    
    // Get all users
    const allUsers = await payload.find({
      collection: 'users',
      limit: 1000, // Adjust as needed
    });
    
    console.log(`📊 Found ${allUsers.totalDocs} users to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const user of allUsers.docs) {
      try {
        console.log(`🔄 Processing user: ${user.name} (${user.id})`);
        
        // Clear existing following and followers arrays
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            following: [],
            followers: []
          },
          overrideAccess: true
        });
        
        console.log(`✅ Cleared relationships for user: ${user.name}`);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.name}:`, error);
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
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
  
  process.exit(0);
}

// Run the script
fixFollowingRelationships();
