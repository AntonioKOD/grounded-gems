"use client"

import React, { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  resetKeys?: Array<string | number>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export default class ErrorBoundary extends React.Component<Props, State> {
  private resetTimeoutId: number | undefined

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Enhanced error logging for profile pages
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname
      if (currentUrl.includes('/profile/')) {
        console.error('Profile page error details:', {
          url: currentUrl,
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        })
      }
    }
    
    this.props.onError?.(error, errorInfo)
    this.setState({ errorInfo })
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props
    const { hasError } = this.state
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey)) {
        this.resetErrorBoundary()
      }
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    }, 0)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Check if this is a profile page error
      const isProfileError = typeof window !== 'undefined' && 
                           window.location.pathname.includes('/profile/')

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">😵</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900">
                {isProfileError ? 'Profile Error' : 'Something went wrong'}
              </h1>
              <p className="text-gray-600">
                {isProfileError 
                  ? 'There was an issue loading this user profile.'
                  : 'An unexpected error occurred. Please try again.'
                }
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.resetErrorBoundary}
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    if (isProfileError) {
                      window.location.href = '/explorer'
                    } else {
                      window.location.href = '/'
                    }
                  }
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isProfileError ? 'Browse Users' : 'Go Home'}
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left text-sm text-gray-600 bg-gray-100 p-4 rounded">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 whitespace-pre-wrap text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Oops! Something went wrong
        </h1>
        
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Don't worry, this happens sometimes.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <Button 
            onClick={resetError}
            className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            onClick={handleReload}
            variant="outline"
            className="w-full"
          >
            Reload App
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          If this problem persists, please restart the app.
        </p>
      </div>
    </div>
  )
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo)
    
    if (typeof window !== 'undefined') {
      console.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      })
    }
  }
} 