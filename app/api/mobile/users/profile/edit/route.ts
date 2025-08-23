import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

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
    
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    console.log('[Mobile Profile Edit] Authorization header:', authorization)

    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.warn('[Mobile Profile Edit] No Bearer token found in Authorization header')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const token = authorization.replace('Bearer ', '')
    console.log('[Mobile Profile Edit] Extracted token:', token.substring(0, 20) + '...')

    const payload = await getPayload({ config })
    console.log('[Mobile Profile Edit] getPayload resolved')

    // Try to authenticate with Bearer token
    let user = null
    
    try {
      // First try Payload's built-in authentication
      const authHeaders = new Headers()
      authHeaders.set('Authorization', `Bearer ${token}`)
      
      const userAuthResult = await payload.auth({ headers: authHeaders })
      console.log('[Mobile Profile Edit] payload.auth result:', userAuthResult)
      
      if (userAuthResult?.user) {
        user = userAuthResult.user
      }
    } catch (authError) {
      console.error('[Mobile Profile Edit] Error in payload.auth:', authError)
      // Continue to manual token validation
    }
    
    // If Payload auth failed, try manual JWT validation
    if (!user) {
      try {
        // Try to decode the JWT token manually
        const tokenParts = token.split('.')
        if (tokenParts.length === 3 && tokenParts[1]) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
          console.log('[Mobile Profile Edit] Decoded token payload:', payload)
          
          if (payload.userId) {
            // Get user by ID from the token
            user = await payload.findByID({
              collection: 'users',
              id: String(payload.userId),
            })
            console.log('[Mobile Profile Edit] Found user by token userId:', user?.id)
          }
        }
      } catch (decodeError) {
        console.error('[Mobile Profile Edit] Error decoding token:', decodeError)
      }
    }
    
    if (!user) {
      console.log('❌ [Mobile Profile Edit] No authenticated user found for PUT')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    console.log('✅ [Mobile Profile Edit] Authenticated user for PUT:', user.id)

    const body: ProfileUpdateRequest = await request.json()

    // Get current user to check existing data
    const currentUser = await payload.findByID({
      collection: "users",
      id: String(user.id),
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
    if (body.name !== undefined) updateData.name = body.name ? String(body.name) : null
    if (body.bio !== undefined) updateData.bio = body.bio ? String(body.bio) : null

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
                { id: { not_equals: String(user.id) } }
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
          
          updateData.username = String(username)
          updateData.lastUsernameChange = new Date().toISOString()
        } else {
          // User is clearing their username
          updateData.username = null
        }
      }
    }

    // Handle location data
    if (body.location) {
      const locationData: any = {}
      if (body.location.city !== undefined) locationData.city = body.location.city ? String(body.location.city) : null
      if (body.location.state !== undefined) locationData.state = body.location.state ? String(body.location.state) : null
      if (body.location.country !== undefined) locationData.country = body.location.country ? String(body.location.country) : null
      
      // Only include location if there are actual values
      if (Object.keys(locationData).length > 0) {
        updateData.location = locationData
      }
    }

    // Handle interests
    if (body.interests) {
      updateData.interests = body.interests
        .filter(interest => interest && typeof interest === 'string' && interest.trim() !== '')
        .map(interest => String(interest))
    }

    // Handle social links
    if (body.socialLinks) {
      updateData.socialLinks = body.socialLinks
        .filter(link => link && link.platform && link.url)
        .map((link) => ({
          platform: String(link.platform),
          url: String(link.url),
        }))
    }

    // Handle profile image
    if (body.profileImage !== undefined) {
      console.log('📝 [Mobile Profile Edit] Processing profileImage:', {
        value: body.profileImage,
        type: typeof body.profileImage,
        isString: typeof body.profileImage === 'string',
        isNumber: typeof body.profileImage === 'number',
        isEmpty: body.profileImage === '',
        isNull: body.profileImage === null,
        isUndefined: body.profileImage === undefined
      })
      
      // Only set profileImage if it's a valid non-empty string, otherwise set to null
      if (body.profileImage && typeof body.profileImage === 'string' && body.profileImage.trim() !== '') {
        updateData.profileImage = String(body.profileImage)
        console.log('📝 [Mobile Profile Edit] Set profileImage to string:', updateData.profileImage)
      } else if (body.profileImage && typeof body.profileImage === 'number') {
        updateData.profileImage = String(body.profileImage)
        console.log('📝 [Mobile Profile Edit] Set profileImage to string from number:', updateData.profileImage)
      } else {
        updateData.profileImage = null
        console.log('📝 [Mobile Profile Edit] Set profileImage to null')
      }
    }

    console.log('📝 [Mobile Profile Edit] Update data:', JSON.stringify(updateData, null, 2))
    console.log('📝 [Mobile Profile Edit] User ID type:', typeof user.id, 'Value:', user.id)
    console.log('📝 [Mobile Profile Edit] Profile Image type:', typeof body.profileImage, 'Value:', body.profileImage)
    
    // Validate that we're not passing any invalid data
    for (const [key, value] of Object.entries(updateData)) {
      if (value === undefined) {
        delete updateData[key]
      }
    }
    
    // Additional validation for ObjectId fields
    console.log('📝 [Mobile Profile Edit] Final updateData keys:', Object.keys(updateData))
    for (const [key, value] of Object.entries(updateData)) {
      console.log(`📝 [Mobile Profile Edit] Field ${key}:`, {
        type: typeof value,
        value: value,
        isArray: Array.isArray(value),
        isObject: value && typeof value === 'object' && !Array.isArray(value)
      })
      
      // Check for potential ObjectId fields that might be invalid
      if (key === 'profileImage' && value && typeof value === 'string') {
        // Check if it looks like a valid ObjectId (24 character hex string) OR a valid URL
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(value)
        const isValidUrl = value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/api/media/') || value.startsWith('/')
        
        console.log(`📝 [Mobile Profile Edit] profileImage validation:`, {
          value: value,
          isValidObjectId: isValidObjectId,
          isValidUrl: isValidUrl,
          length: value.length
        })
        
        if (!isValidObjectId && !isValidUrl && value !== '') {
          console.warn(`📝 [Mobile Profile Edit] Invalid format for profileImage (not ObjectId or URL): ${value}`)
          // Remove invalid value - only if it's neither ObjectId nor URL
          delete updateData[key]
        } else {
          console.log(`📝 [Mobile Profile Edit] profileImage format is valid:`, { isValidObjectId, isValidUrl })
        }
      }
    }

    // Update the user in Payload CMS
    console.log('📝 [Mobile Profile Edit] About to update user with data:', JSON.stringify(updateData, null, 2))
    console.log('📝 [Mobile Profile Edit] profileImage in updateData:', updateData.profileImage)
    
    const updatedUser = await payload.update({
      collection: "users",
      id: String(user.id),
      data: updateData,
    })

    console.log('✅ [Mobile Profile Edit] User updated successfully:', updatedUser.id)
    console.log('📝 [Mobile Profile Edit] Updated user profileImage:', updatedUser.profileImage)

    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
      },
    })
  } catch (error) {
    console.error('❌ [Mobile Profile Edit] Error updating profile:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update profile" 
    }, { status: 500 })
  }
}

// GET /api/mobile/users/profile/edit - Get current user data for editing
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Mobile Profile Edit] GET request received')
    
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    console.log('[Mobile Profile Edit] Authorization header:', authorization)

    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.warn('[Mobile Profile Edit] No Bearer token found in Authorization header')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const token = authorization.replace('Bearer ', '')
    console.log('[Mobile Profile Edit] Extracted token:', token.substring(0, 20) + '...')

    const payload = await getPayload({ config })
    console.log('[Mobile Profile Edit] getPayload resolved')

    // Use Payload's built-in authentication with Bearer token
    let userAuthResult
    try {
      // Create headers object with the Bearer token
      const authHeaders = new Headers()
      authHeaders.set('Authorization', `Bearer ${token}`)
      
      userAuthResult = await payload.auth({ headers: authHeaders })
      console.log('[Mobile Profile Edit] payload.auth result:', userAuthResult)
    } catch (authError) {
      console.error('[Mobile Profile Edit] Error in payload.auth:', authError)
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication failed',
        details: authError instanceof Error ? authError.message : authError 
      }, { status: 401 })
    }
    
    const { user } = userAuthResult || {}
    
    if (!user) {
      console.log('❌ [Mobile Profile Edit] No authenticated user found')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    console.log('✅ [Mobile Profile Edit] Authenticated user:', user.id)

    const currentUser = await payload.findByID({
      collection: "users",
      id: String(user.id),
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
            id: typeof currentUser.profileImage === 'object' && currentUser.profileImage.id
              ? String(currentUser.profileImage.id)
              : typeof currentUser.profileImage === 'string' && /^[0-9a-fA-F]{24}$/.test(currentUser.profileImage)
              ? currentUser.profileImage
              : null,
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