import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"

interface DeleteAccountRequest {
  password: string
  reason?: string
}

interface DeleteAccountResponse {
  success: boolean
  message: string
  data?: {
    deletionId: string
    scheduledFor: string
  }
  error?: string
  code?: string
}

async function verifyPayloadToken(token: string) {
  try {
    const payload = await getPayload({ config })
    const headers = new Headers()
    headers.set('authorization', `Bearer ${token}`)
    const { user } = await payload.auth({ headers })
    return user
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<DeleteAccountResponse>> {
  try {
    const payload = await getPayload({ config })
    
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({
        success: false,
        message: "Authentication required",
        error: "Missing or invalid authorization header",
        code: "AUTH_REQUIRED"
      }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const user = await verifyPayloadToken(token)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: "Authentication failed",
        error: "Invalid or expired token",
        code: "AUTH_FAILED"
      }, { status: 401 })
    }
    
    // Parse request body
    const body: DeleteAccountRequest = await request.json()
    
    if (!body.password) {
      return NextResponse.json({
        success: false,
        message: "Password required",
        error: "Password is required to delete account",
        code: "PASSWORD_REQUIRED"
      }, { status: 400 })
    }
    
    // Verify password
    try {
      // Create a test login to verify password
      const testLogin = await payload.login({
        collection: "users",
        data: {
          email: user.email || "",
          password: body.password
        }
      })
      
      if (!testLogin.user) {
        throw new Error("Invalid password")
      }
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: "Invalid password",
        error: "The password you entered is incorrect",
        code: "INVALID_PASSWORD"
      }, { status: 400 })
    }
    
    // Check if user has any active content that prevents deletion
    const hasActiveContent = await checkUserActiveContent(payload, String(user.id))
    
    if (hasActiveContent) {
      return NextResponse.json({
        success: false,
        message: "Cannot delete account with active content",
        error: "Please remove or transfer your published guides, active events, or pending applications before deleting your account",
        code: "ACTIVE_CONTENT"
      }, { status: 400 })
    }
    
    // Create deletion record for audit trail
    const deletionRecord = await payload.create({
      collection: "accountDeletions",
      data: {
        userId: String(user.id),
        userEmail: user.email || "",
        reason: body.reason || "User requested account deletion",
        scheduledFor: new Date(),
        status: "pending"
      }
    })
    
    // Delete the user account
    await payload.delete({
      collection: "users",
      id: String(user.id),
      overrideAccess: true
    })
    
    // Log the deletion for audit purposes
    console.log(`Account deleted for user ${user.id} (${user.email}) at ${new Date().toISOString()}`)
    
    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
      data: {
        deletionId: String(deletionRecord.id),
        scheduledFor: deletionRecord.scheduledFor
      }
    })
    
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to delete account",
      error: "An unexpected error occurred while deleting your account",
      code: "INTERNAL_ERROR"
    }, { status: 500 })
  }
}

async function checkUserActiveContent(payload: any, userId: string): Promise<boolean> {
  try {
    // Check for published guides
    const guides = await payload.find({
      collection: "guides",
      where: {
        and: [
          { creator: { equals: userId } },
          { status: { equals: "published" } }
        ]
      },
      limit: 1
    })
    
    if (guides.docs.length > 0) {
      return true
    }
    
    // Check for active events
    const events = await payload.find({
      collection: "events",
      where: {
        and: [
          { organizer: { equals: userId } },
          { status: { equals: "active" } }
        ]
      },
      limit: 1
    })
    
    if (events.docs.length > 0) {
      return true
    }
    
    // Check for pending business owner applications
    const applications = await payload.find({
      collection: "businessOwnerApplications",
      where: {
        and: [
          { user: { equals: userId } },
          { status: { equals: "pending" } }
        ]
      },
      limit: 1
    })
    
    if (applications.docs.length > 0) {
      return true
    }
    
    return false
  } catch (error) {
    console.error("Error checking user active content:", error)
    return false
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
