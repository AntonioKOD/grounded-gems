import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params
    const payload = await getPayload({ config })
    const { type } = await req.json()

    // Get user from auth
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate type
    if (!['like', 'save'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid interaction type' },
        { status: 400 }
      )
    }

    // Check if location exists
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    if (type === 'save') {
      // Handle save/unsave
      try {
        // Check if already saved
        const existingSave = await payload.find({
          collection: 'user-saved-locations',
          where: {
            and: [
              { user: { equals: user.id } },
              { location: { equals: locationId } }
            ]
          }
        })

        if (existingSave.docs.length > 0) {
          // Remove save
          await payload.delete({
            collection: 'user-saved-locations',
            id: existingSave.docs[0].id
          })
          
          return NextResponse.json({ 
            success: true, 
            action: 'removed',
            message: 'Location removed from saved' 
          })
        } else {
          // Add save
          await payload.create({
            collection: 'user-saved-locations',
            data: {
              user: user.id,
              location: locationId,
            }
          })
          
          return NextResponse.json({ 
            success: true, 
            action: 'added',
            message: 'Location saved' 
          })
        }
      } catch (error) {
        console.error('Error handling save interaction:', error)
        return NextResponse.json(
          { error: 'Failed to save location' },
          { status: 500 }
        )
      }
    } else if (type === 'like') {
      // Handle like/unlike
      try {
        // For now, just return success - you can implement likes collection later
        return NextResponse.json({ 
          success: true, 
          action: 'liked',
          message: 'Location liked' 
        })
      } catch (error) {
        console.error('Error handling like interaction:', error)
        return NextResponse.json(
          { error: 'Failed to like location' },
          { status: 500 }
        )
      }
    }

  } catch (error) {
    console.error('Error in location interactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params
    const payload = await getPayload({ config })

    // Get user from auth
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json({
        isLiked: false,
        isSaved: false
      })
    }

    // Check if location is saved
    const savedCheck = await payload.find({
      collection: 'user-saved-locations',
      where: {
        and: [
          { user: { equals: user.id } },
          { location: { equals: locationId } }
        ]
      }
    })

    return NextResponse.json({
      isLiked: false, // For now
      isSaved: savedCheck.docs.length > 0
    })

  } catch (error) {
    console.error('Error checking location interactions:', error)
    return NextResponse.json({
      isLiked: false,
      isSaved: false
    })
  }
} 