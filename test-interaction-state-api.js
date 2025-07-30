// Test script for the interaction state API
// Use global fetch if available (Node 18+), otherwise require node-fetch
let fetch;
if (typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch;
} else {
  try {
    fetch = require('node-fetch');
  } catch (error) {
    console.error('❌ Please install node-fetch: npm install node-fetch');
    process.exit(1);
  }
}

async function testInteractionStateAPI() {
    const baseURL = 'http://localhost:3000/api/mobile';
    
    // First, let's get a valid token by logging in
    console.log('🔐 Testing login...');
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
        })
    });
    
    if (!loginResponse.ok) {
        console.error('❌ Login failed:', await loginResponse.text());
        return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data?.token;
    
    if (!token) {
        console.error('❌ No token received');
        return;
    }
    
    console.log('✅ Login successful, token received');
    
    // Now test the interaction state API
    console.log('\n🔄 Testing interaction state API...');
    
    // Get some post IDs from the feed first
    const feedResponse = await fetch(`${baseURL}/posts/feed`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!feedResponse.ok) {
        console.error('❌ Feed fetch failed:', await feedResponse.text());
        return;
    }
    
    const feedData = await feedResponse.json();
    const posts = feedData.data?.posts || [];
    
    if (posts.length === 0) {
        console.log('⚠️ No posts found in feed');
        return;
    }
    
    // Extract post IDs (limit to 5 for testing)
    const postIds = posts.slice(0, 5).map(post => post.id);
    console.log(`📱 Found ${postIds.length} posts to test:`, postIds);
    
    // Test the interaction state API
    const interactionResponse = await fetch(`${baseURL}/posts/interaction-state`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            postIds: postIds
        })
    });
    
    if (!interactionResponse.ok) {
        console.error('❌ Interaction state API failed:', await interactionResponse.text());
        return;
    }
    
    const interactionData = await interactionResponse.json();
    console.log('✅ Interaction state API response:');
    console.log(JSON.stringify(interactionData, null, 2));
    
    // Verify the response structure
    if (interactionData.success && interactionData.data) {
        console.log(`\n📊 Summary:`);
        console.log(`- Total posts checked: ${interactionData.data.totalPosts}`);
        console.log(`- Posts liked by user: ${interactionData.data.totalLiked}`);
        console.log(`- Posts saved by user: ${interactionData.data.totalSaved}`);
        console.log(`- Interactions returned: ${interactionData.data.interactions.length}`);
        
        // Show details for each interaction
        interactionData.data.interactions.forEach(interaction => {
            console.log(`\n📝 Post ${interaction.postId}:`);
            console.log(`  - Liked: ${interaction.isLiked}`);
            console.log(`  - Saved: ${interaction.isSaved}`);
            console.log(`  - Like count: ${interaction.likeCount}`);
            console.log(`  - Save count: ${interaction.saveCount}`);
        });
    } else {
        console.error('❌ Invalid response structure');
    }
}

// Run the test
testInteractionStateAPI().catch(console.error); 