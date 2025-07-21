import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"
import { getServerSideUser } from "@/lib/auth-server"

interface ProfileUpdateData {
  name?: string
  username?: string
  bio?: string
  location?: {
    city?: string
    state?: string
    country?: string
  }
  interests?: string[]
  socialLinks?: {
    platform: "instagram" | "twitter" | "tiktok" | "youtube" | "website"
    url: string
  }[]
  profileImage?: string | null
}

interface ProfileUpdateRequest {
  name?: string
  username?: string
  bio?: string
  location?: {
    city?: string
    state?: string
    country?: string
  }
  interests?: string[]
  socialLinks?: {
    platform: "instagram" | "twitter" | "tiktok" | "youtube" | "website"
    url: string
  }[]
  profileImage?: string | null
}

// PUT /api/mobile/users/profile/edit - Update user profile
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 [Mobile Profile Edit] PUT request received')
    const user = await getServerSideUser()
    if (!user) {
      console.log('❌ [Mobile Profile Edit] No authenticated user found for PUT')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    console.log('✅ [Mobile Profile Edit] Authenticated user for PUT:', user.id)

    const body: ProfileUpdateRequest = await request.json()
    const payload = await getPayload({ config })

    // Get current user to check existing data
    const currentUser = await payload.findByID({
      collection: "users",
      id: user.id,
    })

    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Prepare the update data
    const updateData: Record<string, any> = {}

    // Handle basic fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.bio !== undefined) updateData.bio = body.bio

    // Handle username with validation and cooldown check
    if (body.username !== undefined) {
      const username = body.username.trim().toLowerCase()
      
      // Only process username change if it's actually different
      if (currentUser.username !== username) {
        if (username) {
          // Check cooldown if username is being changed
          if (currentUser.username && currentUser.lastUsernameChange) {
            const lastChange = new Date(currentUser.lastUsernameChange)
            const now = new Date()
            const daysSinceLastChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
            
            if (daysSinceLastChange < 7) {
              const daysRemaining = 7 - daysSinceLastChange
              return NextResponse.json({ 
                success: false, 
                error: `You can change your username again in ${daysRemaining} day(s)` 
              }, { status: 400 })
            }
          }

          // Validate username format
          if (!/^[a-z0-9_-]+$/.test(username)) {
            return NextResponse.json({ 
              success: false, 
              error: "Username can only contain lowercase letters, numbers, hyphens, and underscores" 
            }, { status: 400 })
          }
          if (username.length < 3) {
            return NextResponse.json({ 
              success: false, 
              error: "Username must be at least 3 characters long" 
            }, { status: 400 })
          }
          if (username.length > 30) {
            return NextResponse.json({ 
              success: false, 
              error: "Username must be less than 30 characters" 
            }, { status: 400 })
          }
          
          // Check if username is already taken
          const existingUser = await payload.find({
            collection: "users",
            where: {
              and: [
                { username: { equals: username } },
                { id: { not_equals: user.id } }
              ]
            },
            limit: 1
          })
          
          if (existingUser.docs.length > 0) {
            return NextResponse.json({ 
              success: false, 
              error: "Username is already taken" 
            }, { status: 400 })
          }
          
          updateData.username = username
          updateData.lastUsernameChange = new Date().toISOString()
        } else {
          // User is clearing their username
          updateData.username = ''
        }
      }
    }

    // Handle location
    if (body.location) {
      const locationData: any = {}
      if (body.location.city !== undefined) locationData.city = body.location.city || null
      if (body.location.state !== undefined) locationData.state = body.location.state || null
      if (body.location.country !== undefined) locationData.country = body.location.country || null
      
      if (Object.keys(locationData).length > 0) {
        updateData.location = locationData
      }
    }

    // Handle interests
    if (body.interests) {
      updateData.interests = body.interests.filter(interest => interest.trim() !== '')
    }

    // Handle social links
    if (body.socialLinks) {
      updateData.socialLinks = body.socialLinks.map((link) => ({
        platform: link.platform,
        url: link.url,
      }))
    }

    // Handle profile image
    if (body.profileImage !== undefined) {
      updateData.profileImage = body.profileImage
    }

    // Update the user in Payload CMS
    const updatedUser = await payload.update({
      collection: "users",
      id: user.id,
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          username: updatedUser.username,
          bio: updatedUser.bio,
          location: updatedUser.location,
          interests: updatedUser.interests,
          socialLinks: updatedUser.socialLinks,
          profileImage: updatedUser.profileImage ? {
            url: typeof updatedUser.profileImage === 'object' && updatedUser.profileImage.url
              ? updatedUser.profileImage.url 
              : typeof updatedUser.profileImage === 'string'
              ? updatedUser.profileImage
              : ''
          } : null,
        }
      }
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/mobile/users/profile/edit - Get current user data for editing
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Mobile Profile Edit] GET request received')
    const user = await getServerSideUser()
    if (!user) {
      console.log('❌ [Mobile Profile Edit] No authenticated user found')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    console.log('✅ [Mobile Profile Edit] Authenticated user:', user.id)

    const payload = await getPayload({ config })

    const currentUser = await payload.findByID({
      collection: "users",
      id: user.id,
      depth: 1,
    })

    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Check username change cooldown
    let canChangeUsername = true
    let nextChangeDate = null
    let daysRemaining = 0

    if (currentUser.lastUsernameChange) {
      const lastChange = new Date(currentUser.lastUsernameChange)
      const now = new Date()
      const daysSinceLastChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
      daysRemaining = Math.max(0, 7 - daysSinceLastChange)
      canChangeUsername = daysSinceLastChange >= 7
      
      if (!canChangeUsername) {
        nextChangeDate = new Date(lastChange)
        nextChangeDate.setDate(nextChangeDate.getDate() + 7)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          bio: currentUser.bio,
          location: currentUser.location,
          interests: currentUser.interests || [],
          socialLinks: currentUser.socialLinks || [],
          profileImage: currentUser.profileImage ? {
            url: typeof currentUser.profileImage === 'object' && currentUser.profileImage.url
              ? currentUser.profileImage.url 
              : typeof currentUser.profileImage === 'string'
              ? currentUser.profileImage
              : ''
          } : null,
        },
        usernameCooldown: {
          canChange: canChangeUsername,
          nextChangeDate: nextChangeDate?.toISOString(),
          daysRemaining
        }
      }
    })

  } catch (error) {
    console.error('Error fetching profile data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch profile data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 