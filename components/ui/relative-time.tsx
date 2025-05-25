"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"

interface RelativeTimeProps {
  date: Date | string
  className?: string
}

export function RelativeTime({ date, className = "" }: RelativeTimeProps) {
  const [formattedDate, setFormattedDate] = useState<string>("")

  useEffect(() => {
    // Initial format
    const updateTime = () => {
      const dateObj = typeof date === "string" ? new Date(date) : date
      setFormattedDate(formatDistanceToNow(dateObj, { addSuffix: true }))
    }
    
    updateTime()

    // Update every minute
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [date])

  // Don't render anything during SSR
  if (!formattedDate) return null

  return <span className={className}>{formattedDate}</span>
} 