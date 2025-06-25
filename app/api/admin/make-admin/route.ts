import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔧 Making user admin...')
    
    // Find the user by email
    const users = await payload.find({
      collection: 'users',
      where: {
        email: { equals: 'antonio_kodheli@icloud.com' }
      }
    })
    
    if (users.docs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }
    
    const user = users.docs[0]
    console.log('👤 Found user:', user.email, 'Current role:', user.role)
    
    if (user.role !== 'admin') {
      console.log('🔧 Updating user role to admin...')
      
      const updatedUser = await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          role: 'admin'
        }
      })
      
      console.log('✅ User role updated to:', updatedUser.role)
      
      return NextResponse.json({
        success: true,
        message: 'User role updated to admin',
        user: {
          email: updatedUser.email,
          role: updatedUser.role
        }
      })
    } else {
      console.log('✅ User already has admin role')
      
      return NextResponse.json({
        success: true,
        message: 'User already has admin role',
        user: {
          email: user.email,
          role: user.role
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Error making user admin:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update user role',
      details: error.message
    }, { status: 500 })
  }
} 