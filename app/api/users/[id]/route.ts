import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"

export async function GET(request: NextRequest, context: any) {
  const params = typeof context.params?.then === 'function' ? await context.params : context.params || {};
  try {
    const payload = await getPayload({ config })
    
    const user = await payload.findByID({
      collection: "users",
      id: params.id,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        profileImage: true,
      },
      overrideAccess: true,
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: any) {
  const params = typeof context.params?.then === 'function' ? await context.params : context.params || {};
  
  try {
    const payload = await getPayload({ config })
    
    // Get the current user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    // Ensure user can only delete their own account
    if (user.id !== params.id) {
      return NextResponse.json({ error: "You can only delete your own account" }, { status: 403 })
    }
    
    // Get the user document to check for any restrictions
    const userDoc = await payload.findByID({
      collection: "users",
      id: params.id,
      overrideAccess: true,
    })
    
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // Check if user has any active content that needs to be handled
    const hasActiveContent = await checkUserActiveContent(payload, params.id)
    
    if (hasActiveContent) {
      return NextResponse.json({ 
        error: "Account cannot be deleted while you have active content. Please remove or transfer your content first.",
        hasActiveContent: true
      }, { status: 400 })
    }
    
    // Delete the user account
    await payload.delete({
      collection: "users",
      id: params.id,
      overrideAccess: true,
    })
    
    return NextResponse.json({ 
      success: true, 
      message: "Account deleted successfully" 
    })
    
  } catch (error) {
    console.error("Error deleting user account:", error)
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
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