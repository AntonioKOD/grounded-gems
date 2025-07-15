import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET individual bucket list
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    
    const bucketList = await payload.findByID({
      collection: 'bucketLists',
      id: params.id,
      depth: 2
    })

    if (!bucketList) {
      return NextResponse.json(
        { success: false, error: 'Bucket list not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      bucketList
    })

  } catch (error) {
    console.error('Error fetching bucket list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bucket list' },
      { status: 500 }
    )
  }
}

// PATCH (update) bucket list
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from auth header
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Check if bucket list exists
    const existingList = await payload.findByID({
      collection: 'bucketLists',
      id: params.id
    })

    if (!existingList) {
      return NextResponse.json(
        { success: false, error: 'Bucket list not found' },
        { status: 404 }
      )
    }

    // Check ownership
    const isOwner = existingList.owner === user.id || (typeof existingList.owner === 'object' && existingList.owner.id === user.id)
    
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this list.' }, { status: 403 })
    }

    // Update the bucket list
    const updatedList = await payload.update({
      collection: 'bucketLists',
      id: params.id,
      data: body,
      user: user
    })

    return NextResponse.json({
      success: true,
      bucketList: updatedList,
      message: 'Bucket list updated successfully'
    })

  } catch (error) {
    console.error('Error updating bucket list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update bucket list' },
      { status: 500 }
    )
  }
}

// DELETE bucket list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from auth header
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if bucket list exists
    const existingList = await payload.findByID({
      collection: 'bucketLists',
      id: params.id
    })

    if (!existingList) {
      return NextResponse.json(
        { success: false, error: 'Bucket list not found' },
        { status: 404 }
      )
    }

    // Check ownership - only the owner can delete the list
    const isOwner = existingList.owner === user.id || (typeof existingList.owner === 'object' && existingList.owner.id === user.id)
    
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this list.' }, { status: 403 })
    }

    // Delete the bucket list
    await payload.delete({
      collection: 'bucketLists',
      id: params.id,
      user: user
    })

    return NextResponse.json({
      success: true,
      message: 'Bucket list deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting bucket list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete bucket list' },
      { status: 500 }
    )
  }
} 