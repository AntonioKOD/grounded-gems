// app/(frontend)/login/page.tsx
import LoginForm from "@/components/LoginForm"

// Force this route to always render on-demand (no static prerender)
export const dynamic = "force-dynamic"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <LoginForm />
    </div>
  )
}