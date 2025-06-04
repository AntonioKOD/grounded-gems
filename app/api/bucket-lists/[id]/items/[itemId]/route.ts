import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { User, BucketList } from '@/payload-types'

interface PatchParams {
  params: {
    id: string // Bucket List ID
    itemId: string // Bucket List Item ID
  }
}

export async function PATCH(req: NextRequest, { params }: PatchParams) {
  const payload = await getPayload({ config })

  try {
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: listId, itemId } = params
    const body = await req.json()

    const { status, completionData } = body

    // Validate input
    if (!listId || !itemId) {
      return NextResponse.json({ error: 'Missing listId or itemId' }, { status: 400 })
    }
    if (status && !['not_started', 'planned', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }
    if (completionData && typeof completionData !== 'object') {
        return NextResponse.json({ error: 'Invalid completionData format' }, { status: 400 })
    }


    const originalList = await payload.findByID({
      collection: 'bucketLists',
      id: listId,
      depth: 2, // To get items populated
    })

    if (!originalList) {
      return NextResponse.json({ error: 'Bucket list not found' }, { status: 404 })
    }

    // Check ownership or collaboration rights (simplified for now)
    const isOwner = originalList.owner === user.id || (typeof originalList.owner === 'object' && originalList.owner.id === user.id)
    // TODO: Add collaborator check if implementing shared list editing
    
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this list.' }, { status: 403 })
    }

    const itemIndex = originalList.items?.findIndex((item: any) => item.id === itemId)

    if (itemIndex === undefined || itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found in the bucket list' }, { status: 404 })
    }

    const updatedItems = [...(originalList.items || [])]
    const itemToUpdate = { ...updatedItems[itemIndex] }

    if (status) {
      itemToUpdate.status = status
      if (status === 'completed' && !itemToUpdate.completedAt) {
        itemToUpdate.completedAt = new Date().toISOString()
      } else if (status !== 'completed') {
        itemToUpdate.completedAt = undefined // Clear completedAt if not completed
      }
    }

    if (completionData) {
      itemToUpdate.completionData = {
        ...(itemToUpdate.completionData || {}),
        ...completionData,
      }
      // If rating is explicitly set to null or 0, remove it
      if (completionData.rating === null || completionData.rating === 0) {
        delete itemToUpdate.completionData.rating
      }
       // If memory is explicitly set to empty string, remove it
      if (completionData.memory === '') {
        delete itemToUpdate.completionData.memory
      }
    }
    
    updatedItems[itemIndex] = itemToUpdate

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

    return NextResponse.json({ message: 'Item updated successfully', item: updatedItems[itemIndex], listStats: updatedList.stats }, { status: 200 })

  } catch (error: any) {
    payload.logger.error(`Error updating bucket list item: ${error.message}`)
    return NextResponse.json({ error: 'Failed to update bucket list item', details: error.message }, { status: 500 })
  }
} 