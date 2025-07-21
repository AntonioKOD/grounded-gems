import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// POST /api/mobile/search - Search guides, locations, and posts (mobile)
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    const { query } = body
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Query is required and must be at least 2 characters.' }, { status: 400 })
    }
    // Search guides
    const guidesResult = await payload.find({
      collection: 'guides',
      where: { title: { like: query } },
      limit: 10,
      sort: '-createdAt',
      depth: 1
    })
    const guides = guidesResult.docs.map((g: any) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      featuredImage: g.featuredImage?.url || null,
      createdAt: g.createdAt
    }))
    // Search locations
    const locationsResult = await payload.find({
      collection: 'locations',
      where: { name: { like: query } },
      limit: 10,
      sort: '-createdAt',
      depth: 1
    })
    const locations = locationsResult.docs.map((l: any) => ({
      id: l.id,
      name: l.name,
      address: typeof l.address === 'string' ? l.address : '',
      featuredImage: l.featuredImage?.url || null,
      createdAt: l.createdAt
    }))
    // Search posts
    const postsResult = await payload.find({
      collection: 'posts',
      where: { content: { like: query } },
      limit: 10,
      sort: '-createdAt',
      depth: 1
    })
    const posts = postsResult.docs.map((p: any) => ({
      id: p.id,
      content: p.content,
      author: p.author?.name || null,
      createdAt: p.createdAt
    }))
    // Search users
    const usersResult = await payload.find({
      collection: 'users',
      where: {
        or: [
          { name: { like: query } },
          { username: { like: query } }
        ]
      },
      limit: 10,
      sort: '-createdAt',
      depth: 1
    })
    const users = usersResult.docs.map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username || null,
      email: u.email,
      profileImage: u.profileImage?.url || null,
      createdAt: u.createdAt
    }))
    return NextResponse.json({
      success: true,
      data: {
        query,
        guides,
        locations,
        posts,
        users
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to perform search' }, { status: 500 })
  }
} 