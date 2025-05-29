import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface SignupRequestBody {
  name: string;
  email: string;
  password: string;
  coords?: {
    latitude: number;
    longitude: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  preferences?: {
    categories: string[];
    radius: number;
    notifications: boolean;
  };
  // Enhanced signup data matching the web app
  additionalData?: {
    username?: string;
    interests?: string[];
    onboardingData?: {
      primaryUseCase?: string;
      travelRadius?: string;
      budgetPreference?: string;
      onboardingCompleted?: boolean;
      signupStep?: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body: SignupRequestBody = await request.json()
    
    const { name, email, password, coords, location, preferences, additionalData } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required' },
        { status: 400 }
      )
    }

    // Prepare user data similar to the web app's signupUser function
    const userData: any = {
      email,
      password,
      name,
    };

    // Add username if provided
    if (additionalData?.username) {
      userData.username = additionalData.username;
    }

    // Add location data if provided
    if (coords || location) {
      userData.location = {
        coordinates: {
          latitude: coords?.latitude || location?.latitude,
          longitude: coords?.longitude || location?.longitude,
        }
      };
      
      // Add address if provided
      if (location?.address) {
        userData.location.address = location.address;
      }
    }

    // Add preferences and enhanced data
    const enhancedAdditionalData: any = {};

    // Include interests/categories
    if (additionalData?.interests && additionalData.interests.length > 0) {
      enhancedAdditionalData.interests = additionalData.interests;
    } else if (preferences?.categories && preferences.categories.length > 0) {
      enhancedAdditionalData.interests = preferences.categories;
    }

    // Include onboarding data if provided
    if (additionalData?.onboardingData) {
      enhancedAdditionalData.onboardingData = {
        primaryUseCase: additionalData.onboardingData.primaryUseCase,
        travelRadius: additionalData.onboardingData.travelRadius || preferences?.radius?.toString() || '5',
        budgetPreference: additionalData.onboardingData.budgetPreference,
        onboardingCompleted: additionalData.onboardingData.onboardingCompleted || true,
        signupStep: additionalData.onboardingData.signupStep || 3,
      };
    }

    // Store additional data if we have any
    if (Object.keys(enhancedAdditionalData).length > 0) {
      userData.additionalData = enhancedAdditionalData;
    }

    // Store preferences if provided
    if (preferences) {
      userData.preferences = {
        categories: preferences.categories,
        radius: preferences.radius,
        notifications: preferences.notifications,
      };
    }

    console.log('Creating user with enhanced data:', {
      email: userData.email,
      name: userData.name,
      username: userData.username,
      hasLocation: !!userData.location,
      hasAdditionalData: !!userData.additionalData,
      hasPreferences: !!userData.preferences,
    });

    // Create the user in Payload CMS
    const user = await payload.create({
      collection: 'users',
      data: userData,
    });

    console.log('User created successfully:', user.id);

    // Optionally auto-login the user after signup
    const loginResult = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
      req: request,
    });

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        location: user.location,
        preferences: user.preferences,
        additionalData: user.additionalData,
        role: user.role,
      },
      // Include token for mobile app authentication
      token: loginResult.token,
    })

    // Set the authentication cookie for web compatibility
    if (loginResult.token) {
      response.cookies.set('payload-token', loginResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      })
    }

    return response

  } catch (error: any) {
    console.error('Enhanced signup error:', error)
    
    // Handle specific Payload CMS errors
    if (error.message?.includes('E11000') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }
    
    if (error.message?.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid user data provided' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Account creation failed. Please try again.' },
      { status: 500 }
    )
  }
} 