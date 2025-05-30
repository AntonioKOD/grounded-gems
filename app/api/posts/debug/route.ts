import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Debug endpoint called')
    
    const payload = await getPayload({ config })
    
    // Test basic database connection
    console.log('📊 Testing database connection...')
    
    // Get all posts (limited to 5 for debugging)
    const postsResult = await payload.find({
      collection: 'posts',
      limit: 5,
      depth: 2,
    })
    
    console.log(`Found ${postsResult.totalDocs} total posts in database`)
    console.log(`Retrieved ${postsResult.docs.length} posts for debug`)
    
    // Test users collection
    const usersResult = await payload.find({
      collection: 'users',
      limit: 3,
    })
    
    console.log(`Found ${usersResult.totalDocs} total users in database`)
    
    // Test categories collection
    const categoriesResult = await payload.find({
      collection: 'categories',
      limit: 5,
    })
    
    console.log(`Found ${categoriesResult.totalDocs} total categories in database`)
    
    return NextResponse.json({
      success: true,
      message: 'Debug info retrieved successfully',
      data: {
        posts: {
          total: postsResult.totalDocs,
          sample: postsResult.docs.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content?.substring(0, 100) + '...',
            author: post.author?.name || 'Unknown',
            status: post.status,
            createdAt: post.createdAt,
            likesCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentsCount: Array.isArray(post.comments) ? post.comments.length : 0,
          }))
        },
        users: {
          total: usersResult.totalDocs,
          sample: usersResult.docs.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
          }))
        },
        categories: {
          total: categoriesResult.totalDocs,
          sample: categoriesResult.docs.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
          }))
        },
        database: {
          connected: true,
          collections: ['posts', 'users', 'categories', 'media', 'locations']
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Debug failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
} 