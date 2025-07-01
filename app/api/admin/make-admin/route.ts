import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../payload.config'

// List of authorized admin emails
const AUTHORIZED_ADMIN_EMAILS = [
  'antonio_kodheli@icloud.com',
  'ermir1mata@yahoo.com'
]

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔧 Making user admin...')
    
    // Get email from request body, default to original admin email if not provided
    const body = await request.json().catch(() => ({}))
    const emailToMakeAdmin = body.email || 'antonio_kodheli@icloud.com'
    
    console.log('📧 Target email:', emailToMakeAdmin)
    
    // Verify the email is in the authorized list
    if (!AUTHORIZED_ADMIN_EMAILS.includes(emailToMakeAdmin)) {
      return NextResponse.json({ 
        success: false, 
        error: `Email ${emailToMakeAdmin} is not authorized for admin access` 
      }, { status: 403 })
    }
    
    // Find the user by email
    const users = await payload.find({
      collection: 'users',
      where: {
        email: { equals: emailToMakeAdmin }
      }
    })
    
    if (users.docs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `User with email ${emailToMakeAdmin} not found. They need to sign up first.` 
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
        message: `User ${emailToMakeAdmin} role updated to admin`,
        user: {
          email: updatedUser.email,
          role: updatedUser.role
        }
      })
    } else {
      console.log('✅ User already has admin role')
      
      return NextResponse.json({
        success: true,
        message: `User ${emailToMakeAdmin} already has admin role`,
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

// GET endpoint to check admin status of authorized emails
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔍 Checking admin status for authorized emails...')
    
    const adminStatuses = []
    
    for (const email of AUTHORIZED_ADMIN_EMAILS) {
      const users = await payload.find({
        collection: 'users',
        where: {
          email: { equals: email }
        }
      })
      
      if (users.docs.length > 0) {
        const user = users.docs[0]
        adminStatuses.push({
          email: user.email,
          role: user.role,
          isAdmin: user.role === 'admin',
          exists: true
        })
      } else {
        adminStatuses.push({
          email: email,
          role: null,
          isAdmin: false,
          exists: false
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      adminStatuses,
      authorizedEmails: AUTHORIZED_ADMIN_EMAILS
    })
    
  } catch (error) {
    console.error('❌ Error checking admin status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check admin status',
      details: error.message
    }, { status: 500 })
  }
} 