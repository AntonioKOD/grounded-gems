"use client"

import React, { useState, useEffect } from 'react'
import { Input } from './input'
import { Label } from './label'
import { Button } from './button'
import { Badge } from './badge'
import { Loader2, Check, X, AlertCircle, RefreshCw, User } from 'lucide-react'
import { useUsernameAvailability, useUsernameSuggestions } from '@/hooks/use-username-availability'
import { cn } from '@/lib/utils'

interface UsernameInputProps {
  value: string
  onChange: (value: string) => void
  onValidationChange?: (isValid: boolean) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  autoGenerate?: boolean
  userFullName?: string
  className?: string
  showSuggestions?: boolean
}

export function UsernameInput({
  value,
  onChange,
  onValidationChange,
  label = "Username",
  placeholder = "your_username",
  required = false,
  disabled = false,
  autoGenerate = false,
  userFullName = "",
  className,
  showSuggestions = true
}: UsernameInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false)
  
  // Clean username input in real-time
  const cleanUsername = (input: string) => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .substring(0, 30)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = cleanUsername(e.target.value)
    onChange(cleaned)
  }

  // Real-time availability checking
  const { available, error, message, isChecking } = useUsernameAvailability(
    value, 
    value.length >= 3 && !disabled
  )

  // Username suggestions
  const { suggestions, isGenerating, generateSuggestions } = useUsernameSuggestions(
    userFullName || value
  )

  // Auto-generate initial username if requested
  useEffect(() => {
    if (autoGenerate && !value && userFullName && userFullName.length > 0) {
      const initialUsername = cleanUsername(userFullName) + Math.floor(Math.random() * 100)
      if (initialUsername.length >= 3) {
        onChange(initialUsername)
      }
    }
  }, [autoGenerate, userFullName, value, onChange])

  // Update validation state
  useEffect(() => {
    const isValid = available === true && value.length >= 3
    onValidationChange?.(isValid)
  }, [available, value, onValidationChange])

  // Auto-show suggestions when input is focused and empty or invalid
  useEffect(() => {
    if (isFocused && showSuggestions && (!value || available === false)) {
      setShowSuggestionsPanel(true)
    } else {
      setShowSuggestionsPanel(false)
    }
  }, [isFocused, value, available, showSuggestions])

  const getStatusIcon = () => {
    if (disabled) return null
    if (value.length < 3) return <User className="h-4 w-4 text-gray-400" />
    if (isChecking) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    if (available === true) return <Check className="h-4 w-4 text-green-500" />
    if (available === false) return <X className="h-4 w-4 text-red-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusMessage = () => {
    if (disabled) return null
    if (value.length === 0) return null
    if (value.length < 3) return "Username must be at least 3 characters"
    if (isChecking) return "Checking availability..."
    if (available === true && message) return message
    if (available === false && error) return error
    return null
  }

  const getStatusColor = () => {
    if (value.length < 3) return "text-gray-500"
    if (isChecking) return "text-blue-600"
    if (available === true) return "text-green-600"
    if (available === false) return "text-red-600"
    return "text-yellow-600"
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setShowSuggestionsPanel(false)
  }

  const handleGenerateNew = () => {
    generateSuggestions()
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="username-input" className="flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm select-none">
            @
          </span>
          <Input
            id="username-input"
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              // Delay hiding suggestions to allow clicking
              setTimeout(() => setShowSuggestionsPanel(false), 200)
            }}
            disabled={disabled}
            required={required}
            className={cn(
              "pl-8 pr-10 transition-all duration-200",
              available === true && "border-green-300 focus:border-green-500 focus:ring-green-500",
              available === false && "border-red-300 focus:border-red-500 focus:ring-red-500",
              isChecking && "border-blue-300 focus:border-blue-500 focus:ring-blue-500"
            )}
            autoComplete="username"
            spellCheck={false}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getStatusIcon()}
          </div>
        </div>

        {/* Suggestions Panel */}
        {showSuggestionsPanel && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Suggested usernames
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateNew}
                  disabled={isGenerating}
                  className="h-6 text-xs"
                >
                  {isGenerating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {!isGenerating && "New"}
                </Button>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors flex items-center justify-between group"
                >
                  <span className="font-mono">@{suggestion}</span>
                  <Badge 
                    variant="secondary" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    Available
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Message */}
      {getStatusMessage() && (
        <p className={cn("text-xs transition-colors duration-200", getStatusColor())}>
          {getStatusMessage()}
        </p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        Only lowercase letters, numbers, hyphens, and underscores allowed
        {value.length > 0 && ` • ${value.length}/30 characters`}
      </p>
    </div>
  )
} 