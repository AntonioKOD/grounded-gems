import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"

interface ReportRequest {
  contentType: 'post' | 'comment' | 'user' | 'location' | 'guide' | 'event'
  contentId: string
  reason: 'spam' | 'inappropriate' | 'harassment' | 'violence' | 'copyright' | 'other'
  description?: string
  evidence?: string[]
}

interface ReportResponse {
  success: boolean
  message: string
  data?: {
    reportId: string
    status: string
    estimatedReviewTime: string
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

export async function POST(request: NextRequest): Promise<NextResponse<ReportResponse>> {
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
    const body: ReportRequest = await request.json()
    
    if (!body.contentType || !body.contentId || !body.reason) {
      return NextResponse.json({
        success: false,
        message: "Missing required fields",
        error: "Content type, content ID, and reason are required",
        code: "MISSING_FIELDS"
      }, { status: 400 })
    }
    
    // Check if user has already reported this content recently
    const existingReport = await payload.find({
      collection: "reports",
      where: {
        and: [
          { reporter: { equals: user.id } },
          { contentId: { equals: body.contentId } },
          { contentType: { equals: body.contentType } },
          { createdAt: { greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Last 24 hours
        ]
      },
      limit: 1
    })
    
    if (existingReport.docs.length > 0) {
      return NextResponse.json({
        success: false,
        message: "Report already submitted",
        error: "You have already reported this content recently. Please wait 24 hours before submitting another report.",
        code: "DUPLICATE_REPORT"
      }, { status: 400 })
    }
    
    // Create the report
    const report = await payload.create({
      collection: "reports",
      data: {
        contentType: body.contentType,
        contentId: body.contentId,
        reason: body.reason,
        description: body.description || "",
        evidence: body.evidence || [],
        reporter: String(user.id),
        status: "pending",
        priority: getReportPriority(body.reason),
        reviewedBy: null,
        reviewedAt: null,
        action: null,
        adminNotes: ""
      }
    })
    
    // Send notification to admins (if configured)
    await notifyAdmins(payload, report)
    
    return NextResponse.json({
      success: true,
      message: "Report submitted successfully",
      data: {
        reportId: String(report.id),
        status: report.status,
        estimatedReviewTime: "24 hours"
      }
    })
    
  } catch (error) {
    console.error("Error creating report:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to submit report",
      error: "An unexpected error occurred while submitting your report",
      code: "INTERNAL_ERROR"
    }, { status: 500 })
  }
}

function getReportPriority(reason: string): 'low' | 'medium' | 'high' | 'urgent' {
  switch (reason) {
    case 'violence':
    case 'harassment':
      return 'urgent'
    case 'inappropriate':
      return 'high'
    case 'copyright':
      return 'medium'
    case 'spam':
    case 'other':
    default:
      return 'low'
  }
}

async function notifyAdmins(payload: any, report: any) {
  try {
    // Find admin users
    const admins = await payload.find({
      collection: "users",
      where: {
        role: { equals: "admin" }
      }
    })
    
    // Create notifications for admins
    for (const admin of admins.docs) {
      await payload.create({
        collection: "notifications",
        data: {
          recipient: String(admin.id),
          type: "report",
          title: "New Content Report",
          message: `New ${report.contentType} report submitted for review`,
          data: {
            reportId: report.id,
            contentType: report.contentType,
            reason: report.reason,
            priority: report.priority
          },
          read: false
        }
      })
    }
  } catch (error) {
    console.error("Error notifying admins:", error)
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
