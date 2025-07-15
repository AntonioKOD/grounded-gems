"use client"
import { usePathname } from "next/navigation"

export default function NoNavWrapper({ children, navigation, footer, fab }: { children: React.ReactNode, navigation?: React.ReactNode, footer?: React.ReactNode, fab?: React.ReactNode }) {
  const pathname = usePathname()
  const isWebview = pathname === "/forgot-password/webview" || pathname.endsWith("/forgot-password/webview")

  if (isWebview) {
    return <>{children}</>
  }

  return (
    <>
      {navigation}
      {children}
      {footer}
      {fab}
    </>
  )
} 