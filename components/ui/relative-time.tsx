"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"

interface RelativeTimeProps {
  date: Date | string
  className?: string
  fallbackText?: string
}

export function RelativeTime({ date, className = "", fallbackText = "Just now" }: RelativeTimeProps) {
  const [formattedDate, setFormattedDate] = useState<string>(fallbackText)
  const [isClient, setIsClient] = useState(false)

  // Prevent hydration mismatch by only updating on client
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Initial format after client hydration
    const updateTime = () => {
      const dateObj = typeof date === "string" ? new Date(date) : date
      setFormattedDate(formatDistanceToNow(dateObj, { addSuffix: true }))
    }
    
    updateTime()

    // Update every minute
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [date, isClient])

  // Always render consistent content during SSR and initial client render
  return <span className={className}>{formattedDate}</span>
} 