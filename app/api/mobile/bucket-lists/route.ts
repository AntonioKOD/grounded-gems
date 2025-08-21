import { NextRequest, NextResponse } from 'next/server'
import { 
  createBucketList,
  getUserBucketLists,
  addItemToBucketList,

  getBucketListItems
} from '@/app/actions'
import { getPayload } from 'payload'
import config from '@payload-config'

// GET /api/v1/mobile/bucket-lists - Get user's bucket lists
export async function GET(request: NextRequest) {
  try {
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const payload = await getPayload({ config })
    
    // Use Payload's built-in authentication with Bearer token
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'my' // my, shared, public
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const includeItems = searchParams.get('includeItems') === 'true'

    console.log(`Mobile API: Getting ${type} bucket lists for user ${user.id}`)

    let bucketLists: any[] = []

    switch (type) {
      case 'my':
        bucketLists = await getUserBucketLists(String(user.id))
        break
        
      case 'shared':
        // Get bucket lists shared with the user
        const { getPayload } = await import('payload')
        const config = (await import('@payload-config')).default
        const payload = await getPayload({ config })
        
        const sharedResult = await payload.find({
          collection: 'bucketLists',
          where: {
            'sharedWith.user': { equals: String(user.id) }
          },
          limit,
          page,
          depth: 2
        })
        
        bucketLists = sharedResult.docs
        break
        
      case 'public':
        // Get public bucket lists (if you have this feature)
        const { getPayload: getPayloadPublic } = await import('payload')
        const configPublic = (await import('@payload-config')).default
        const payloadPublic = await getPayloadPublic({ config: configPublic })
        
        const publicResult = await payloadPublic.find({
          collection: 'bucketLists',
          where: {
            isPublic: { equals: true },
            createdBy: { not_equals: String(user.id) } // Exclude own lists
          },
          limit,
          page,
          depth: 1,
          sort: '-createdAt'
        })
        
        bucketLists = publicResult.docs
        break
    }

    // Format bucket lists for mobile
    const formattedBucketLists = await Promise.all(
      bucketLists.map(async (list: any) => {
        let items: any[] = []
        
        if (includeItems) {
          try {
            const itemsResult = await getBucketListItems(list.id)
            items = itemsResult.map((item: any) => ({
              id: item.id,
              location: item.location ? {
                id: typeof item.location === 'object' ? item.location.id : item.location,
                name: typeof item.location === 'object' ? item.location.name : 'Unknown Location',
                featuredImage: typeof item.location === 'object' ? item.location.featuredImage?.url : undefined,
                rating: typeof item.location === 'object' ? item.location.averageRating : undefined
              } : null,
              notes: item.notes,
              priority: item.priority || 'medium',
              completed: item.completed || false,
              completedAt: item.completedAt,
              addedAt: item.addedAt || item.createdAt
            }))
          } catch (error) {
            console.warn(`Could not fetch items for bucket list ${list.id}:`, error)
          }
        }

        return {
          id: list.id,
          title: list.title,
          description: list.description,
          isPublic: list.isPublic || false,
          itemCount: list.itemCount || items.length,
          completedCount: list.completedCount || items.filter(item => item.completed).length,
          createdBy: {
            id: typeof list.createdBy === 'object' ? list.createdBy.id : list.createdBy,
            name: typeof list.createdBy === 'object' ? list.createdBy.name : 'Unknown User',
            avatar: typeof list.createdBy === 'object' ? list.createdBy.profileImage?.url : undefined
          },
          sharedWith: list.sharedWith?.map((share: any) => ({
            user: {
              id: typeof share.user === 'object' ? share.user.id : share.user,
              name: typeof share.user === 'object' ? share.user.name : 'Unknown User'
            },
            permission: share.permission
          })) || [],
          items: includeItems ? items : undefined,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        bucketLists: formattedBucketLists,
        meta: {
          type,
          includeItems,
          total: formattedBucketLists.length
        }
      }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching bucket lists:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bucket lists',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/mobile/bucket-lists - Create a new bucket list
export async function POST(request: NextRequest) {
  try {
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      isPublic = false,
      initialItems = [] // Array of location IDs to add initially
    } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    console.log(`Mobile API: Creating bucket list for user ${user.id}`)

    const bucketListData = {
      title: title.trim(),
      description: description?.trim(),
      isPublic,
      createdBy: String(user.id)
    }

    const bucketList = await createBucketList(bucketListData as any)

    // Add initial items if provided
    if (initialItems.length > 0) {
      try {
        await Promise.all(
          initialItems.map((locationId: string) =>
            addItemToBucketList(String(bucketList.id), locationId)
          )
        )
      } catch (error) {
        console.warn('Some initial items could not be added:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bucket list created successfully',
      data: { 
        bucketList: {
          id: bucketList.id,
          title: bucketList.title,
          description: bucketList.description,
          isPublic: bucketList.isPublic,
          itemCount: initialItems.length,
          completedCount: 0,
          createdAt: bucketList.createdAt
        }
      }
    })
  } catch (error) {
    console.error('Mobile API: Error creating bucket list:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create bucket list',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/mobile/bucket-lists/[id] - Update bucket list
export async function PUT(request: NextRequest) {
  try {
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const bucketListId = pathParts[pathParts.length - 1]

    const body = await request.json()
    const { title, description, isPublic } = body

    console.log(`Mobile API: Updating bucket list ${bucketListId}`)

    // Update bucket list using payload directly

    // Check ownership first
    const bucketList = await payload.findByID({
      collection: 'bucketLists',
      id: String(bucketListId),
      depth: 0
    })

    if (!bucketList) {
      return NextResponse.json(
        { success: false, error: 'Bucket list not found' },
        { status: 404 }
      )
    }

    const ownerId = typeof bucketList.createdBy === 'string' 
      ? bucketList.createdBy 
      : bucketList.createdBy?.id

    if (ownerId !== String(user.id)) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim()
    if (isPublic !== undefined) updateData.isPublic = isPublic

    const updatedBucketList = await payload.update({
      collection: 'bucketLists',
      id: String(bucketListId),
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Bucket list updated successfully',
      data: { bucketList: updatedBucketList }
    })
  } catch (error) {
    console.error('Mobile API: Error updating bucket list:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update bucket list',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/mobile/bucket-lists/[id] - Delete bucket list
export async function DELETE(request: NextRequest) {
  try {
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const bucketListId = pathParts[pathParts.length - 1]

    console.log(`Mobile API: Deleting bucket list ${bucketListId}`)

    // Delete bucket list using payload directly

    // Check ownership first
    const bucketList = await payload.findByID({
      collection: 'bucketLists',
      id: String(bucketListId),
      depth: 0
    })

    if (!bucketList) {
      return NextResponse.json(
        { success: false, error: 'Bucket list not found' },
        { status: 404 }
      )
    }

    const ownerId = typeof bucketList.createdBy === 'string' 
      ? bucketList.createdBy 
      : bucketList.createdBy?.id

    if (ownerId !== String(user.id)) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    await payload.delete({
      collection: 'bucketLists',
      id: String(bucketListId)
    })

    return NextResponse.json({
      success: true,
      message: 'Bucket list deleted successfully'
    })
  } catch (error) {
    console.error('Mobile API: Error deleting bucket list:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete bucket list',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 