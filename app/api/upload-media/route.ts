import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get("file") as File
    const alt = (formData.get("alt") as string) || "Location image"

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
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    // Return the media object from Payload
    const media = await response.json()
    return NextResponse.json(media)
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

// Required for streaming uploads
export const config = {
  api: {
    bodyParser: false,
  },
}
