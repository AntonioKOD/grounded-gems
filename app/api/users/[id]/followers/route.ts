import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest, context: any) {
  const params = typeof context.params?.then === 'function' ? await context.params : context.params || {};
  try {
    const payload = await getPayload({ config })
    const user = await payload.findByID({ collection: 'users', id: params.id, depth: 1 })
    if (!user) return NextResponse.json({ users: [] })
    const followers = Array.isArray(user.followers) ? user.followers : []
    // followers may be array of IDs or objects
    const followerObjs = await Promise.all(
      followers.map(async (f: any) => {
        if (typeof f === 'object' && f !== null && f.id) return f
        try {
          return await payload.findByID({ collection: 'users', id: f })
        } catch {
          return null
        }
      })
    )
    const users = followerObjs.filter(Boolean).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      profileImage: u.profileImage || null,
    }))
    return NextResponse.json({ users })
  } catch (err: any) {
    return NextResponse.json({ users: [] })
  }
} 