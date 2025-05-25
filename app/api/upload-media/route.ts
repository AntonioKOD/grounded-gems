import { NextResponse } from "next/server"

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/jpg',
  'image/jfif',
  'image/pjpeg',
  'image/pjp',
]

export async function POST(request: Request) {
  try {
    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get("file") as File
    const alt = (formData.get("alt") as string) || "Location image"

    // Validate file type
    if (!file || !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: `Invalid file type. Allowed types are: ${ALLOWED_MIME_TYPES.join(', ')}`,
          providedType: file?.type 
        }, 
        { status: 400 }
      )
    }

    // Create a new FormData instance for the Payload request
    const payloadFormData = new FormData()
    payloadFormData.append("file", file)
    payloadFormData.append("alt", alt)

    // Upload to Payload CMS Media collection
    const response = await fetch(`${process.env.NEXT_PUBLIC_PAYLOAD_API_URL}/api/media`, {
      method: "POST",
      body: payloadFormData,
      // Include credentials if your Payload instance requires authentication
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Upload failed: ${response.statusText}. ${JSON.stringify(errorData)}`)
    }

    // Return the media object from Payload
    const media = await response.json()
    return NextResponse.json(media)
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { 
        error: (error as Error).message,
        details: "If this error persists, please try a different image format (JPG, PNG, or WebP)"
      }, 
      { status: 400 }
    )
  }
}

// Required for streaming uploads
export const config = {
  api: {
    bodyParser: false,
  },
}
