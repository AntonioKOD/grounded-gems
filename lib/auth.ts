import { cookies } from "next/headers"

export async function getServerSideUser() {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get("auth_token")?.value

    if (!authCookie) {
      console.log("No auth cookie found")
      return null
    }

    // Add a timeout to the fetch to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
      headers: {
        Cookie: `auth_token=${authCookie}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(`Failed to fetch user: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error("Error fetching user data:", error)
    // Return null on error, but don't let errors crash the app
    return null
  }
}
