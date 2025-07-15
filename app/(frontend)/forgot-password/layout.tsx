import { usePathname } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hide navigation for /forgot-password/webview only
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const isWebview = pathname.endsWith('/forgot-password/webview')

  if (isWebview) {
    return <>{children}</>
  }

  // Default: render children (with navigation in parent layout)
  return <>{children}</>
} 