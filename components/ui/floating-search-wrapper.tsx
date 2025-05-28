"use client"

import React, { useEffect, useState } from 'react'
import FloatingSearchButton from './floating-search-button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

export default function FloatingSearchWrapper() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading || !isAuthenticated) return null

  return (
    <div className={cn(
      'floating-button-wrapper bottom-fab right-safe',
      'transition-all duration-300 ease-in-out',
      'opacity-100 translate-y-0'
    )}>
      <FloatingSearchButton />
    </div>
  )
} 