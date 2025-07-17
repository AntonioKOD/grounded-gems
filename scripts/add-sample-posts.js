import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function addSamplePosts() {
  try {
    const payload = await getPayload({ config })
    
    console.log('📝 Adding sample posts...')
    
    // First, get a user to use as the author
    const users = await payload.find({
      collection: 'users',
      limit: 1
    })
    
    if (users.docs.length === 0) {
      console.error('❌ No users found. Please create a user first.')
      process.exit(1)
    }
    
    const author = users.docs[0]
    console.log(`👤 Using author: ${author.name || author.email}`)
    
    // Sample posts data
    const samplePosts = [
      {
        title: 'Amazing Coffee Shop Discovery!',
        content: 'Just found this incredible coffee shop downtown. The atmosphere is perfect for working, and their lattes are absolutely divine! ☕️ Highly recommend checking it out if you\'re in the area.',
        type: 'post',
        author: author.id,
        status: 'published',
        tags: [{ tag: 'coffee' }, { tag: 'work' }, { tag: 'downtown' }],
        likeCount: 12,
        commentCount: 3,
        shareCount: 2,
        saveCount: 5,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        title: 'Hidden Gem Restaurant Review',
        content: 'Discovered this amazing Italian restaurant tucked away in a quiet neighborhood. The pasta is homemade and the service is exceptional. Five stars! ⭐️⭐️⭐️⭐️⭐️',
        type: 'review',
        rating: 5,
        author: author.id,
        status: 'published',
        tags: [{ tag: 'italian' }, { tag: 'restaurant' }, { tag: 'hidden-gem' }],
        likeCount: 8,
        commentCount: 1,
        shareCount: 1,
        saveCount: 3,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        title: 'Perfect Weekend Hike',
        content: 'Just completed an amazing hike at the local nature reserve. The views were breathtaking and the trails were well-maintained. Perfect for a weekend adventure! 🏃‍♂️🌲',
        type: 'recommendation',
        author: author.id,
        status: 'published',
        tags: [{ tag: 'hiking' }, { tag: 'outdoors' }, { tag: 'weekend' }],
        likeCount: 15,
        commentCount: 4,
        shareCount: 3,
        saveCount: 7,
        createdAt: new Date().toISOString() // Today
      },
      {
        title: 'New Art Gallery Opening',
        content: 'Excited to share that a new contemporary art gallery just opened in the arts district! The inaugural exhibition features some incredible local artists. Definitely worth a visit! 🎨✨',
        type: 'post',
        author: author.id,
        status: 'published',
        tags: [{ tag: 'art' }, { tag: 'gallery' }, { tag: 'local' }],
        likeCount: 6,
        commentCount: 2,
        shareCount: 1,
        saveCount: 2,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      },
      {
        title: 'Best Pizza in Town',
        content: 'After trying every pizza place in the city, I can confidently say this is the best! The crust is perfectly crispy and the toppings are always fresh. A must-try for pizza lovers! 🍕',
        type: 'recommendation',
        author: author.id,
        status: 'published',
        tags: [{ tag: 'pizza' }, { tag: 'food' }, { tag: 'best' }],
        likeCount: 22,
        commentCount: 6,
        shareCount: 4,
        saveCount: 9,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
      }
    ]
    
    for (const postData of samplePosts) {
      try {
        const post = await payload.create({
          collection: 'posts',
          data: postData
        })
        console.log(`✅ Added post: ${post.title}`)
      } catch (error) {
        console.error(`❌ Failed to add post ${postData.title}:`, error.message)
      }
    }
    
    // Verify posts were created
    const posts = await payload.find({
      collection: 'posts',
      limit: 100,
      where: { status: { equals: 'published' } }
    })
    
    console.log(`\n📊 Summary:`)
    console.log(`   - Total published posts: ${posts.docs.length}`)
    console.log(`   - Posts created in this script: ${samplePosts.length}`)
    
    console.log('\n🎉 Sample posts added successfully!')
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Error adding sample posts:', error)
    process.exit(1)
  }
}

addSamplePosts() 