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