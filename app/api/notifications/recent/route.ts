/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPayload } from 'payload';
import  config  from '@payload-config';

export async function GET() {
  // 1) Grab the Payload session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('payload-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) Initialize Payload and verify the JWT
  const payload = await getPayload({config});
  let decoded;
  try {
    decoded = await (payload.auth as any).verifyJWT(token);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const userId = decoded.id; // Payload puts the user ID here

  // 3) Fetch recent notifications
  const { docs: notifications } = await payload.find({
    collection: 'notifications',
    where: { recipient: { equals: userId } },
    sort: '-createdAt',
    limit: 5,
    depth: 0,
  });

  return NextResponse.json({ notifications });
}