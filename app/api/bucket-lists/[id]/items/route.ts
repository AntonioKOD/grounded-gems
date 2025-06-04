import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { User, BucketList } from '@/payload-types'

interface PostParams {
  params: {
    id: string // Bucket List ID
  }
}

export async function POST(req: NextRequest, { params }: PostParams) {
  const payload = await getPayload({ config })

  try {
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: listId } = params
    const body = await req.json()

    const { location, goal, priority = 'medium', status = 'not_started', dueDate } = body

    // Validate input
    if (!listId) {
      return NextResponse.json({ error: 'Missing listId' }, { status: 400 })
    }
    if (!location) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 })
    }
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 })
    }
    if (status && !['not_started', 'planned', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const originalList = await payload.findByID({
      collection: 'bucketLists',
      id: listId,
      depth: 2, // To get items populated
    })

    if (!originalList) {
      return NextResponse.json({ error: 'Bucket list not found' }, { status: 404 })
    }

    // Check ownership or collaboration rights
    const isOwner = originalList.owner === user.id || (typeof originalList.owner === 'object' && originalList.owner.id === user.id)
    // TODO: Add collaborator check if implementing shared list editing
    
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this list.' }, { status: 403 })
    }

    // Check if location already exists in the bucket list
    const existingItem = originalList.items?.find((item: any) => {
      if (typeof item.location === 'string') {
        return item.location === location
      } else if (typeof item.location === 'object' && item.location?.id) {
        return item.location.id === location
      }
      return false
    })

    if (existingItem) {
      return NextResponse.json({ error: 'This location is already in your bucket list' }, { status: 400 })
    }

    // Create new item
    const newItem = {
      location,
      goal: goal?.trim() || '',
      priority,
      status,
      addedAt: new Date().toISOString(),
      ...(dueDate && { dueDate }),
      ...(status === 'completed' && { completedAt: new Date().toISOString() })
    }

    const updatedItems = [...(originalList.items || []), newItem]

    // Calculate stats after update
    const completedItemsCount = updatedItems.filter(item => item.status === 'completed').length
    const totalItemsCount = updatedItems.length
    const progressPercentage = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0
    
    const updatedList = await payload.update({
      collection: 'bucketLists',
      id: listId,
      data: {
        items: updatedItems,
        stats: {
          ...originalList.stats,
          completedItems: completedItemsCount,
          totalItems: totalItemsCount,
          progressPercentage: progressPercentage,
          lastActivity: new Date().toISOString(),
        },
      },
      user: user as User, 
    })

    return NextResponse.json({ 
      message: 'Item added to bucket list successfully', 
      item: newItem, 
      listStats: updatedList.stats 
    }, { status: 201 })

  } catch (error: any) {
    payload.logger.error(`Error adding item to bucket list: ${error.message}`)
    return NextResponse.json({ error: 'Failed to add item to bucket list', details: error.message }, { status: 500 })
  }
} 