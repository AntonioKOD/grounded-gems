"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MobilePageContainerProps {
  children: ReactNode
  className?: string
  fullHeight?: boolean
  noPadding?: boolean
}

export default function MobilePageContainer({ 
  children, 
  className = "",
  fullHeight = false,
  noPadding = false
}: MobilePageContainerProps) {
  return (
    <div 
      className={cn(
        "w-full mx-auto",
        // Mobile spacing for floating navigation
        "md:pt-0 md:pb-0", // No extra spacing on desktop
        !noPadding && "mobile-content-spacing", // Apply mobile spacing unless disabled
        fullHeight && "min-h-screen",
        className
      )}
    >
      <div className={cn(
        "w-full",
        !noPadding && "px-4 md:px-6 lg:px-8", // Horizontal padding
        "mobile-smooth-scroll" // Enhanced mobile scrolling
      )}>
        {children}
      </div>
    </div>
  )
} 