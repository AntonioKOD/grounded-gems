// app/(frontend)/login/page.tsx
import LoginForm from "@/components/LoginForm"

// Force this route to always render on-demand (no static prerender)
export const dynamic = "force-dynamic"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300">
      <LoginForm />
    </div>
  )
}