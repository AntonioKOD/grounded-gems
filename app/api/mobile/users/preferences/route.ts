import { NextRequest, NextResponse } from 'next/server'

import { getPayload } from 'payload'
import config from '@/payload.config'

interface UserPreferences {
  categories: string[]
  radius: number
  notifications: boolean
  interests: string[]
  location?: {
    coordinates?: {
      latitude: number
      longitude: number
    }
    address?: string
  }
  preferences: {
    priceRange?: 'budget' | 'moderate' | 'expensive' | 'luxury'
    preferredTimes?: string[]
    accessibility?: {
      wheelchairAccess?: boolean
      parking?: boolean
      other?: string
    }
    dietaryRestrictions?: string[]
    activityLevel?: 'low' | 'medium' | 'high'
  }
  onboardingData?: {
    primaryUseCase?: string
    travelRadius?: string
    budgetPreference?: string
    onboardingCompleted: boolean
    signupStep: number
  }
}

interface PreferencesResponse {
  success: boolean
  message: string
  data?: {
    preferences: UserPreferences
    categories: Array<{
      id: string
      name: string
      icon?: string
      color?: string
    }>
  }
  error?: string
  code?: string
}

// GET /api/mobile/users/preferences - Get user preferences
export async function GET(request: NextRequest): Promise<NextResponse<PreferencesResponse>> {
  try {
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required to access preferences'
      }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required to access preferences'
      }, { status: 401 })
    }

    // Get user with preferences
    const userDoc = await payload.findByID({
      collection: 'users',
      id: String(user.id),
      depth: 2
    })

    // Get available categories
    const categoriesResult = await payload.find({
      collection: 'categories',
      where: {
        isActive: { equals: true }
      },
      limit: 100,
      sort: 'order'
    })

    const preferences: UserPreferences = {
      categories: userDoc.preferences?.categories || [],
      radius: userDoc.preferences?.radius || 25,
      notifications: userDoc.preferences?.notifications ?? true,
      interests: userDoc.additionalData?.interests || [],
      location: userDoc.location,
      preferences: {
        priceRange: userDoc.preferences?.priceRange,
        preferredTimes: userDoc.preferences?.preferredTimes || [],
        accessibility: userDoc.preferences?.accessibility,
        dietaryRestrictions: userDoc.preferences?.dietaryRestrictions || [],
        activityLevel: userDoc.preferences?.activityLevel || 'medium'
      },
      onboardingData: userDoc.additionalData?.onboardingData
    }

    return NextResponse.json({
      success: true,
      message: 'User preferences retrieved successfully',
      data: {
        preferences,
        categories: categoriesResult.docs.map(cat => ({
          id: String(cat.id),
          name: cat.name || '',
          icon: cat.icon?.url || undefined,
          color: cat.color || undefined
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/mobile/users/preferences - Update user preferences
export async function PUT(request: NextRequest): Promise<NextResponse<PreferencesResponse>> {
  try {
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required to update preferences'
      }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required to update preferences'
      }, { status: 401 })
    }

    const body = await request.json()
    const {
      categories,
      radius,
      notifications,
      interests,
      location,
      preferences,
      onboardingData
    } = body

    // Validate categories if provided
    let validCategories: string[] = []
    if (categories && Array.isArray(categories)) {
      const categoryIds = categories.filter(catId => 
        typeof catId === 'string' && /^[0-9a-fA-F]{24}$/.test(catId)
      )
      
      if (categoryIds.length > 0) {
        const existingCategories = await payload.find({
          collection: 'categories',
          where: {
            id: { in: categoryIds }
          },
          limit: 100
        })
        validCategories = existingCategories.docs.map(cat => String(cat.id))
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (validCategories.length > 0) {
      updateData.preferences = {
        ...updateData.preferences,
        categories: validCategories
      }
    }

    if (typeof radius === 'number' && radius > 0) {
      updateData.preferences = {
        ...updateData.preferences,
        radius
      }
    }

    if (typeof notifications === 'boolean') {
      updateData.preferences = {
        ...updateData.preferences,
        notifications
      }
    }

    if (interests && Array.isArray(interests)) {
      updateData.additionalData = {
        ...updateData.additionalData,
        interests
      }
    }

    if (location) {
      updateData.location = location
    }

    if (preferences) {
      updateData.preferences = {
        ...updateData.preferences,
        ...preferences
      }
    }

    if (onboardingData) {
      updateData.additionalData = {
        ...updateData.additionalData,
        onboardingData
      }
    }

    // Update user
    const updatedUser = await payload.update({
      collection: 'users',
      id: String(user.id),
      data: updateData
    })

    // Get updated preferences
    const updatedPreferences: UserPreferences = {
      categories: updatedUser.preferences?.categories || [],
      radius: updatedUser.preferences?.radius || 25,
      notifications: updatedUser.preferences?.notifications ?? true,
      interests: updatedUser.additionalData?.interests || [],
      location: updatedUser.location,
      preferences: {
        priceRange: updatedUser.preferences?.priceRange,
        preferredTimes: updatedUser.preferences?.preferredTimes || [],
        accessibility: updatedUser.preferences?.accessibility,
        dietaryRestrictions: updatedUser.preferences?.dietaryRestrictions || [],
        activityLevel: updatedUser.preferences?.activityLevel || 'medium'
      },
      onboardingData: updatedUser.additionalData?.onboardingData
    }

    return NextResponse.json({
      success: true,
      message: 'User preferences updated successfully',
      data: {
        preferences: updatedPreferences,
        categories: [] // Will be populated by GET request if needed
      }
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update user preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/mobile/users/preferences - Add preference interaction for ML
export async function POST(request: NextRequest): Promise<NextResponse<PreferencesResponse>> {
  try {
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required to record interaction'
      }, { status: 401 })
    }

    const payloadInstance = await getPayload({ config })
    const { user } = await payloadInstance.auth({ headers: request.headers })
    
    if (!user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required to record interaction'
      }, { status: 401 })
    }

    const body = await request.json()
    const {
      action,
      itemId,
      itemType,
      category,
      location,
      feedback
    } = body

    // Record user interaction for ML training
    const interactionData = {
      user: String(user.id),
      action, // 'like', 'save', 'visit', 'skip', 'report'
      itemId,
      itemType, // 'location', 'post', 'event'
      category,
      location,
      feedback, // 'positive', 'negative', 'neutral'
      timestamp: new Date().toISOString()
    }

    // Store interaction in a new collection for ML training
    try {
      await payloadInstance.create({
        collection: 'userInteractions',
        data: interactionData
      })
    } catch (error) {
      console.warn('Could not store user interaction:', error)
      // Don't fail the request if interaction storage fails
    }

    // Update user preferences based on interaction
    let preferenceUpdates: any = {}

    if (action === 'like' || action === 'save') {
      // Strengthen category preference
      if (category) {
        const currentUser = await payloadInstance.findByID({
          collection: 'users',
          id: String(user.id)
        })

        const currentCategories = currentUser.preferences?.categories || []
        if (!currentCategories.includes(category)) {
          preferenceUpdates.preferences = {
            ...currentUser.preferences,
            categories: [...currentCategories, category]
          }
        }
      }
    }

    if (action === 'skip' && feedback === 'negative') {
      // Weaken category preference or add to excluded categories
      if (category) {
        const currentUser = await payloadInstance.findByID({
          collection: 'users',
          id: String(user.id)
        })

        const currentCategories = currentUser.preferences?.categories || []
        const updatedCategories = currentCategories.filter((cat: string) => cat !== category)
        
        preferenceUpdates.preferences = {
          ...currentUser.preferences,
          categories: updatedCategories
        }
      }
    }

    // Apply preference updates if any
    if (Object.keys(preferenceUpdates).length > 0) {
      await payloadInstance.update({
        collection: 'users',
        id: String(user.id),
        data: preferenceUpdates
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Interaction recorded successfully',
      data: {
        preferences: preferenceUpdates.preferences || {},
        categories: []
      }
    })
  } catch (error) {
    console.error('Error recording user interaction:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to record interaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
} 