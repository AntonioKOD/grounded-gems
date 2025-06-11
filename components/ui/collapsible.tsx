"use client"

import React, { createContext, useContext, useState } from 'react'

interface CollapsibleContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = createContext<CollapsibleContextType | undefined>(undefined)

export interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Collapsible({ 
  open: controlledOpen, 
  onOpenChange,
  children 
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const handleOpenChange = onOpenChange || setUncontrolledOpen

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div>{children}</div>
    </CollapsibleContext.Provider>
  )
}

export interface CollapsibleTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleTrigger({ 
  children, 
  className 
}: CollapsibleTriggerProps) {
  const context = useContext(CollapsibleContext)
  
  if (!context) {
    throw new Error('CollapsibleTrigger must be used within a Collapsible')
  }

  const { open, onOpenChange } = context

  return (
    <div 
      className={className}
      onClick={() => onOpenChange(!open)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenChange(!open)
        }
      }}
    >
      {children}
    </div>
  )
}

export interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

export function CollapsibleContent({ 
  children, 
  className 
}: CollapsibleContentProps) {
  const context = useContext(CollapsibleContext)
  
  if (!context) {
    throw new Error('CollapsibleContent must be used within a Collapsible')
  }

  const { open } = context

  if (!open) return null

  return (
    <div className={className}>
      {children}
    </div>
  )
} 