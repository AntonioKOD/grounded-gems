import { cookies } from "next/headers"

export async function getServerSideUser() {
  try {
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get("payload-token")?.value

    if (!payloadToken) {
      console.log("No auth cookie found")
      return null
    }

    // Use Payload's built-in /api/users/me endpoint for authentication
    // This works because we're making the request with the same cookie
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/users/me`, {
      headers: {
        Cookie: `payload-token=${payloadToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.log(`Failed to fetch user: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error("Error fetching user data:", error)
    return null
  }
}
