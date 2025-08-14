import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"

interface BlockUserRequest {
  targetUserId: string
  reason?: string
}

interface BlockUserResponse {
  success: boolean
  message: string
  data?: {
    isBlocked: boolean
    blockedUserId: string
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

export async function POST(request: NextRequest): Promise<NextResponse<BlockUserResponse>> {
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
    const body: BlockUserRequest = await request.json()
    
    if (!body.targetUserId) {
      return NextResponse.json({
        success: false,
        message: "Target user ID required",
        error: "Target user ID is required",
        code: "MISSING_TARGET_USER"
      }, { status: 400 })
    }
    
    // Prevent self-blocking
    if (user.id === body.targetUserId) {
      return NextResponse.json({
        success: false,
        message: "Cannot block yourself",
        error: "You cannot block your own account",
        code: "SELF_BLOCK"
      }, { status: 400 })
    }
    
    // Check if target user exists
    const targetUser = await payload.findByID({
      collection: "users",
      id: body.targetUserId,
      overrideAccess: true
    })
    
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        message: "User not found",
        error: "The user you're trying to block does not exist",
        code: "USER_NOT_FOUND"
      }, { status: 404 })
    }
    
    // Check if already blocked
    const existingBlock = await payload.find({
      collection: "userBlocks",
      where: {
        and: [
          { blocker: { equals: user.id } },
          { blockedUser: { equals: body.targetUserId } }
        ]
      },
      limit: 1
    })
    
    if (existingBlock.docs.length > 0) {
      return NextResponse.json({
        success: false,
        message: "User already blocked",
        error: "This user is already blocked",
        code: "ALREADY_BLOCKED"
      }, { status: 400 })
    }
    
    // Create the block
    const block = await payload.create({
      collection: "userBlocks",
      data: {
        blocker: user.id,
        blockedUser: body.targetUserId,
        reason: body.reason || "",
        createdAt: new Date()
      }
    })
    
    // Remove any existing follow relationships
    await removeFollowRelationships(payload, String(user.id), body.targetUserId)
    
    return NextResponse.json({
      success: true,
      message: "User blocked successfully",
      data: {
        isBlocked: true,
        blockedUserId: body.targetUserId
      }
    })
    
  } catch (error) {
    console.error("Error blocking user:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to block user",
      error: "An unexpected error occurred while blocking the user",
      code: "INTERNAL_ERROR"
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<BlockUserResponse>> {
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
    
    // Get target user ID from query params
    const url = new URL(request.url)
    const targetUserId = url.searchParams.get("targetUserId")
    
    if (!targetUserId) {
      return NextResponse.json({
        success: false,
        message: "Target user ID required",
        error: "Target user ID is required",
        code: "MISSING_TARGET_USER"
      }, { status: 400 })
    }
    
    // Find and delete the block
    const existingBlock = await payload.find({
      collection: "userBlocks",
      where: {
        and: [
          { blocker: { equals: user.id } },
          { blockedUser: { equals: targetUserId } }
        ]
      },
      limit: 1
    })
    
    if (existingBlock.docs.length === 0) {
      return NextResponse.json({
        success: false,
        message: "User not blocked",
        error: "This user is not blocked",
        code: "NOT_BLOCKED"
      }, { status: 400 })
    }
    
    // Delete the block
    if (existingBlock.docs[0]) {
      await payload.delete({
        collection: "userBlocks",
        id: existingBlock.docs[0].id,
        overrideAccess: true
      })
    }
    
    return NextResponse.json({
      success: true,
      message: "User unblocked successfully",
      data: {
        isBlocked: false,
        blockedUserId: targetUserId
      }
    })
    
  } catch (error) {
    console.error("Error unblocking user:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to unblock user",
      error: "An unexpected error occurred while unblocking the user",
      code: "INTERNAL_ERROR"
    }, { status: 500 })
  }
}

async function removeFollowRelationships(payload: any, blockerId: string, blockedUserId: string) {
  try {
    // Get both users
    const blocker = await payload.findByID({
      collection: "users",
      id: blockerId,
      overrideAccess: true
    })
    
    const blockedUser = await payload.findByID({
      collection: "users",
      id: blockedUserId,
      overrideAccess: true
    })
    
    if (blocker && blockedUser) {
      // Remove blocked user from blocker's following list
      const blockerFollowing = blocker.following || []
      const updatedBlockerFollowing = blockerFollowing.filter((id: string) => id !== blockedUserId)
      
      await payload.update({
        collection: "users",
        id: blockerId,
        data: {
          following: updatedBlockerFollowing
        },
        overrideAccess: true
      })
      
      // Remove blocker from blocked user's followers list
      const blockedUserFollowers = blockedUser.followers || []
      const updatedBlockedUserFollowers = blockedUserFollowers.filter((id: string) => id !== blockerId)
      
      await payload.update({
        collection: "users",
        id: blockedUserId,
        data: {
          followers: updatedBlockedUserFollowers
        },
        overrideAccess: true
      })
    }
  } catch (error) {
    console.error("Error removing follow relationships:", error)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
