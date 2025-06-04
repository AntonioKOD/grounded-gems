"use client"

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

interface MainContentWrapperProps {
  children: ReactNode
}

function MainContentWrapper({ children }: MainContentWrapperProps) {
  const pathname = usePathname()
  
  // Only feed should be fullscreen, all other pages get navbar offset
  const isFullscreen = pathname === '/feed'
  
  return (
    <main className={isFullscreen ? "fullscreen-main" : "navbar-offset"}>
      {children}
    </main>
  )
}

export default MainContentWrapper 