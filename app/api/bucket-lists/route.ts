import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/bucket-lists - Get user's bucket lists
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Fetch bucket lists for the user
    const bucketListsResponse = await payload.find({
      collection: 'bucketLists',
      where: {
        owner: {
          equals: userId
        }
      },
      depth: 2, // Include nested data
      sort: '-createdAt'
    })

    // Format the response to match the expected interface
    const formattedBucketLists = bucketListsResponse.docs.map((list: any) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      type: list.type,
      owner: {
        id: list.owner.id || list.owner,
        name: list.owner.name || 'Unknown',
        profileImage: list.owner.profileImage || null
      },
      collaborators: list.collaborators || [],
      isPublic: list.isPublic || false,
      coverImage: list.coverImage || null,
      items: (list.items || []).map((item: any) => ({
        id: item.id,
        location: item.location || null,
        goal: item.goal || '',
        dueDate: item.dueDate || null,
        priority: item.priority || 'medium',
        status: item.status || 'not_started',
        completedAt: item.completedAt || null,
        completionData: item.completionData || null,
        addedAt: item.addedAt || new Date().toISOString(),
        notes: item.notes || null,
      })),
      stats: {
        totalItems: list.items?.length || 0,
        completedItems: list.items?.filter((item: any) => item.status === 'completed').length || 0,
        progressPercentage: list.items?.length > 0 
          ? Math.round((list.items.filter((item: any) => item.status === 'completed').length / list.items.length) * 100)
          : 0,
        lastActivity: list.updatedAt
      },
      createdAt: list.createdAt,
      updatedAt: list.updatedAt
    }))

    return NextResponse.json({
      success: true,
      bucketLists: formattedBucketLists
    })

  } catch (error) {
    console.error('Error fetching bucket lists:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bucket lists' },
      { status: 500 }
    )
  }
}

// POST /api/bucket-lists - Create new bucket list
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from auth header
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, type, isPublic, items, collaborators } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    // Create new bucket list
    const bucketList = await payload.create({
      collection: 'bucketLists',
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        type,
        owner: user.id,
        collaborators: type === 'shared' ? collaborators : [],
        isPublic,
        items: items.map((item: any) => {
          const bucketListItem: any = {
            goal: item.goal || '',
            priority: item.priority || 'medium',
            status: item.status || 'not_started',
            addedAt: item.addedAt || new Date().toISOString()
          }

          // Add location reference if available
          if (item.location && typeof item.location === 'string') {
            bucketListItem.location = item.location
          }

          // Add optional fields
          if (item.dueDate) bucketListItem.dueDate = item.dueDate
          if (item.completedAt) bucketListItem.completedAt = item.completedAt
          if (item.completionData) bucketListItem.completionData = item.completionData
          if (item.notes) bucketListItem.notes = item.notes

          return bucketListItem
        })
      }
    })

    // Format response to match expected interface
    const formattedBucketList = {
      id: bucketList.id,
      name: bucketList.name,
      description: bucketList.description,
      type: bucketList.type,
      owner: {
        id: user.id,
        name: user.name || 'Unknown',
        profileImage: user.profileImage || null
      },
      collaborators: bucketList.collaborators || [],
      isPublic: bucketList.isPublic,
      coverImage: bucketList.coverImage || null,
      items: bucketList.items.map((item: any) => ({
        id: item.id,
        location: item.location || null,
        goal: item.goal || '',
        dueDate: item.dueDate || null,
        priority: item.priority || 'medium',
        status: item.status || 'not_started',
        completedAt: item.completedAt || null,
        completionData: item.completionData || null,
        addedAt: item.addedAt || new Date().toISOString(),
        notes: item.notes || null,
      })),
      stats: {
        totalItems: bucketList.items.length,
        completedItems: bucketList.items.filter((item: any) => item.status === 'completed').length,
        progressPercentage: bucketList.items.length > 0 
          ? Math.round((bucketList.items.filter((item: any) => item.status === 'completed').length / bucketList.items.length) * 100)
          : 0,
        lastActivity: bucketList.updatedAt
      },
      createdAt: bucketList.createdAt,
      updatedAt: bucketList.updatedAt
    }

    return NextResponse.json({
      success: true,
      bucketList: formattedBucketList
    })

  } catch (error) {
    console.error('Error creating bucket list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create bucket list' },
      { status: 500 }
    )
  }
} 