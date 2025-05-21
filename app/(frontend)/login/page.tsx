// app/(frontend)/login/page.tsx
import LoginForm from "@/components/LoginForm"

// Force this route to always render on-demand (no static prerender)
export const dynamic = "force-dynamic"

export default function LoginPage() {
  return <LoginForm />
}