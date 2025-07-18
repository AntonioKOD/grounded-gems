import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Verifying test user for iOS app testing...')
    
    const payload = await getPayload({ config })
    
    // Find the test user
    const users = await payload.find({
      collection: 'users',
      where: {
        email: { equals: 'test@example.com' }
      }
    })
    
    if (users.docs.length === 0) {
      console.log('❌ Test user not found. Creating one...')
      
      // Create a verified test user
      const testUser = await payload.create({
        collection: 'users',
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'TestPass123',
          username: 'testuser',
          _verified: true, // Mark as verified
          role: 'user'
        }
      })
      
      console.log('✅ Created verified test user:', testUser.email)
      
      return NextResponse.json({
        success: true,
        message: 'Created verified test user',
        user: {
          email: testUser.email,
          name: testUser.name,
          verified: testUser._verified
        }
      })
    }
    
    const user = users.docs[0]
    console.log('👤 Found test user:', user.email, 'Verified:', user._verified)
    
    if (!user._verified) {
      console.log('🔧 Verifying test user...')
      
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          _verified: true
        }
      })
      
      console.log('✅ Test user verified successfully!')
    } else {
      console.log('✅ Test user is already verified!')
    }
    
    // Test login
    console.log('🧪 Testing login...')
    const loginResult = await payload.login({
      collection: 'users',
      data: { 
        email: 'test@example.com', 
        password: 'TestPass123' 
      }
    })
    
    if (loginResult && loginResult.token) {
      console.log('✅ Login test successful!')
      console.log('🔑 Token:', loginResult.token.substring(0, 20) + '...')
      
      return NextResponse.json({
        success: true,
        message: 'Test user verified and login test successful',
        user: {
          email: user.email,
          name: user.name,
          verified: true
        },
        loginTest: 'successful',
        tokenPreview: loginResult.token.substring(0, 20) + '...'
      })
    } else {
      console.log('❌ Login test failed!')
      
      return NextResponse.json({
        success: false,
        message: 'Test user verified but login test failed',
        user: {
          email: user.email,
          name: user.name,
          verified: true
        },
        loginTest: 'failed'
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 