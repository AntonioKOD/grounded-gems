import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function testPostCreation() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🧪 Testing post creation...')
    
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
    
    // Test creating a simple post
    const testPost = await payload.create({
      collection: 'posts',
      data: {
        content: 'This is a test post created by the test script!',
        type: 'post',
        author: author.id,
        status: 'published',
        visibility: 'public',
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        saveCount: 0,
      }
    })
    
    console.log('✅ Test post created successfully!')
    console.log('📝 Post details:', {
      id: testPost.id,
      content: testPost.content,
      type: testPost.type,
      author: testPost.author,
      status: testPost.status,
      visibility: testPost.visibility,
      createdAt: testPost.createdAt
    })
    
    // Test creating a post with title
    const testPostWithTitle = await payload.create({
      collection: 'posts',
      data: {
        title: 'Test Post with Title',
        content: 'This is a test post with a title!',
        type: 'post',
        author: author.id,
        status: 'published',
        visibility: 'public',
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        saveCount: 0,
      }
    })
    
    console.log('✅ Test post with title created successfully!')
    console.log('📝 Post with title details:', {
      id: testPostWithTitle.id,
      title: testPostWithTitle.title,
      content: testPostWithTitle.content,
      type: testPostWithTitle.type
    })
    
    // Test creating a review post
    const testReview = await payload.create({
      collection: 'posts',
      data: {
        title: 'Test Review',
        content: 'This is a test review post!',
        type: 'review',
        rating: 4,
        author: author.id,
        status: 'published',
        visibility: 'public',
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        saveCount: 0,
      }
    })
    
    console.log('✅ Test review post created successfully!')
    console.log('📝 Review post details:', {
      id: testReview.id,
      title: testReview.title,
      content: testReview.content,
      type: testReview.type,
      rating: testReview.rating
    })
    
    // Test creating a post with tags
    const testPostWithTags = await payload.create({
      collection: 'posts',
      data: {
        content: 'This is a test post with tags!',
        type: 'post',
        author: author.id,
        status: 'published',
        visibility: 'public',
        tags: [
          { tag: 'test' },
          { tag: 'example' },
          { tag: 'demo' }
        ],
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        saveCount: 0,
      }
    })
    
    console.log('✅ Test post with tags created successfully!')
    console.log('📝 Post with tags details:', {
      id: testPostWithTags.id,
      content: testPostWithTags.content,
      tags: testPostWithTags.tags
    })
    
    console.log('🎉 All post creation tests passed!')
    
    // Clean up test posts
    console.log('🧹 Cleaning up test posts...')
    await payload.delete({
      collection: 'posts',
      id: testPost.id
    })
    await payload.delete({
      collection: 'posts',
      id: testPostWithTitle.id
    })
    await payload.delete({
      collection: 'posts',
      id: testReview.id
    })
    await payload.delete({
      collection: 'posts',
      id: testPostWithTags.id
    })
    
    console.log('✅ Test posts cleaned up successfully!')
    
  } catch (error) {
    console.error('❌ Error testing post creation:', error)
    process.exit(1)
  }
}

testPostCreation() 