// src/app/api/upload-image/route.ts
import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('filename') || 'unnamed'
  
  // Forward the raw body (file) to Vercel Blob
  if (!request.body) {
    return NextResponse.json({ error: 'Request body is null' }, { status: 400 })
  }

  const blob = await put(filename, request.body, {
    access: 'public',
    addRandomSuffix: true,
  })
  
  return NextResponse.json(blob)
}