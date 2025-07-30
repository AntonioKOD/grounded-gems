import fetch from 'node-fetch'

async function testProfilePosts() {
  console.log('🧪 [Test] Testing profile posts API...')
  
  try {
    // Test the profile API to see the response structure
    const profileResponse = await fetch('http://localhost:3000/api/mobile/users/profile?includeFullData=true&includePosts=true&postsLimit=20', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await profileResponse.text()
    console.log('🧪 [Test] Response status:', profileResponse.status)
    console.log('🧪 [Test] Response data:', data)
    
    if (profileResponse.ok) {
      const jsonData = JSON.parse(data)
      console.log('✅ [Test] Profile API response parsed successfully')
      console.log('  - Success:', jsonData.success)
      console.log('  - Has data:', !!jsonData.data)
      
      if (jsonData.data) {
        console.log('  - User name:', jsonData.data.user?.name)
        console.log('  - Has recentPosts:', !!jsonData.data.recentPosts)
        console.log('  - Recent posts count:', jsonData.data.recentPosts?.length || 0)
        
        if (jsonData.data.recentPosts && jsonData.data.recentPosts.length > 0) {
          console.log('  - First post structure:')
          const firstPost = jsonData.data.recentPosts[0]
          console.log('    - ID:', firstPost.id)
          console.log('    - Type:', firstPost.type)
          console.log('    - Content:', firstPost.content?.substring(0, 100) + '...')
          console.log('    - Has featuredImage:', !!firstPost.featuredImage)
          console.log('    - Featured image URL:', firstPost.featuredImage?.url)
          console.log('    - Like count:', firstPost.likeCount)
          console.log('    - Comment count:', firstPost.commentCount)
          console.log('    - Created at:', firstPost.createdAt)
          console.log('    - All post keys:', Object.keys(firstPost))
        } else {
          console.log('  - No posts found in response')
        }
        
        // Check user stats
        console.log('  - User stats:')
        console.log('    - Posts count:', jsonData.data.user?.stats?.postsCount)
        console.log('    - Followers count:', jsonData.data.user?.stats?.followersCount)
        console.log('    - Following count:', jsonData.data.user?.stats?.followingCount)
      }
    } else {
      console.log('❌ [Test] Profile API request failed')
      if (data) {
        try {
          const errorData = JSON.parse(data)
          console.log('  - Error message:', errorData.message)
          console.log('  - Error code:', errorData.code)
        } catch (e) {
          console.log('  - Raw error response:', data)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ [Test] Test failed:', error)
  }
}

testProfilePosts() 