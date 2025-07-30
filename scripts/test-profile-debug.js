import { getPayload } from 'payload';
import config from '../payload.config.ts';

async function testProfileAPI() {
  try {
    console.log('🧪 [Test] Starting profile API test...');
    
    const payload = await getPayload({ config });
    
    // Get the first user to test with
    const usersResult = await payload.find({
      collection: 'users',
      limit: 1,
      depth: 3,
    });
    
    if (usersResult.docs.length === 0) {
      console.log('❌ [Test] No users found in database');
      return;
    }
    
    const testUser = usersResult.docs[0];
    console.log('🧪 [Test] Testing with user:', testUser.name, '(ID:', testUser.id, ')');
    
    // Test posts query
    console.log('🧪 [Test] Testing posts query...');
    const postsResult = await payload.find({
      collection: 'posts',
      where: {
        author: { equals: testUser.id },
        status: { equals: 'published' }
      },
      sort: 'createdAt-desc',
      limit: 10,
      depth: 2
    });
    
    console.log('🧪 [Test] Posts found:', postsResult.docs.length);
    postsResult.docs.forEach((post, index) => {
      console.log(`  Post ${index + 1}:`, {
        id: post.id,
        title: post.title,
        content: post.content?.substring(0, 50) + '...',
        type: post.type,
        status: post.status,
        author: post.author,
        featuredImage: post.featuredImage,
        createdAt: post.createdAt
      });
    });
    
    // Test categories query for interests
    console.log('🧪 [Test] Testing categories query...');
    if (testUser.interests && testUser.interests.length > 0) {
      const categoriesResult = await payload.find({
        collection: 'categories',
        where: {
          id: { in: testUser.interests }
        },
        limit: 100,
        depth: 0
      });
      
      console.log('🧪 [Test] Categories found:', categoriesResult.docs.length);
      categoriesResult.docs.forEach((category, index) => {
        console.log(`  Category ${index + 1}:`, {
          id: category.id,
          name: category.name,
          title: category.title
        });
      });
    } else {
      console.log('🧪 [Test] No interests found for user');
    }
    
    // Test user data structure
    console.log('🧪 [Test] User data structure:');
    console.log('  - Name:', testUser.name);
    console.log('  - Email:', testUser.email);
    console.log('  - Username:', testUser.username);
    console.log('  - Bio:', testUser.bio);
    console.log('  - Interests:', testUser.interests);
    console.log('  - Social Links:', testUser.socialLinks);
    console.log('  - Role:', testUser.role);
    console.log('  - Is Creator:', testUser.isCreator);
    console.log('  - Is Verified:', testUser.isVerified);
    console.log('  - Followers:', testUser.followers?.length || 0);
    console.log('  - Following:', testUser.following?.length || 0);
    console.log('  - Created At:', testUser.createdAt);
    
    // Test stats calculation
    console.log('🧪 [Test] Calculating stats...');
    const stats = {
      postsCount: postsResult.totalDocs,
      followersCount: testUser.followers?.length || 0,
      followingCount: testUser.following?.length || 0,
      savedPostsCount: 0,
      likedPostsCount: 0,
      locationsCount: 0,
      reviewCount: 0,
      recommendationCount: 0,
      averageRating: undefined,
    };
    
    console.log('🧪 [Test] Calculated stats:', stats);
    
    console.log('✅ [Test] Profile API test completed successfully');
    
  } catch (error) {
    console.error('❌ [Test] Profile API test failed:', error);
    console.error('❌ [Test] Error stack:', error.stack);
  }
}

// Run the test
testProfileAPI(); 