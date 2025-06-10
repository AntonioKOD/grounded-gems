"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { log } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  level?: 'page' | 'component' | 'section'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  retryCount: number
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private readonly maxRetries = 3
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props
    
    // Enhanced error logging
    log.error('React Error Boundary caught error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      level,
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    })

    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler
    onError?.(error, errorInfo)

    // Report to external error tracking service
    this.reportError(error, errorInfo)
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Send to error tracking service (Sentry, LogRocket, etc.)
    if (typeof window !== 'undefined') {
      // Google Analytics error tracking
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          error_id: this.state.errorId
        })
      }

      // Custom error reporting endpoint
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo: {
            componentStack: errorInfo.componentStack
          },
          errorId: this.state.errorId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(reportError => {
        log.warn('Failed to report error to server', { reportError })
      })
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state

    if (retryCount >= this.maxRetries) {
      log.warn('Max retry attempts reached', { errorId: this.state.errorId })
      return
    }

    log.info('Retrying after error', { 
      errorId: this.state.errorId, 
      attempt: retryCount + 1 
    })

    // Clear previous timeout
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))

    // Exponential backoff retry
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
    
    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      })
    }, delay)

    this.retryTimeouts.push(timeout)
  }

  private handleRefreshPage = () => {
    log.info('User refreshing page after error', { errorId: this.state.errorId })
    window.location.reload()
  }

  private handleGoHome = () => {
    log.info('User navigating to home after error', { errorId: this.state.errorId })
    window.location.href = '/'
  }

  private handleReportBug = () => {
    const { error, errorId } = this.state
    const subject = `Bug Report - Error ${errorId}`
    const body = `Error ID: ${errorId}\nError: ${error?.message}\nURL: ${window.location.href}\nTime: ${new Date().toISOString()}`
    
    window.open(`mailto:support@sacavia.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  componentWillUnmount() {
    // Clean up timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  render() {
    const { hasError, error, retryCount, errorId } = this.state
    const { children, fallback, showDetails = false, level = 'component' } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Different error UIs based on level
      if (level === 'page') {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Oops! Something went wrong</CardTitle>
                <CardDescription>
                  We encountered an unexpected error. Please try again or contact support if the problem persists.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={this.handleRetry}
                    disabled={retryCount >= this.maxRetries}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {retryCount >= this.maxRetries ? 'Max retries reached' : 'Try Again'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleRefreshPage}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="w-full"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Home
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={this.handleReportBug}
                    className="w-full text-sm"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Report Bug
                  </Button>
                </div>

                {showDetails && error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-32">
                      <p><strong>Error ID:</strong> {errorId}</p>
                      <p><strong>Error:</strong> {error.message}</p>
                      {process.env.NODE_ENV === 'development' && (
                        <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
                      )}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        )
      }

      if (level === 'section') {
        return (
          <div className="w-full p-6 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-medium text-red-800">Section Error</h3>
            </div>
            <p className="text-red-700 mb-4">
              This section encountered an error and couldn't load properly.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={this.handleRetry}
                disabled={retryCount >= this.maxRetries}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={this.handleReportBug}
              >
                Report
              </Button>
            </div>
          </div>
        )
      }

      // Component level error (default)
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Component Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Unable to load this component.
          </p>
          {retryCount < this.maxRetries && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={this.handleRetry}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      )
    }

    return children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    log.error('Manual error triggered', { error, errorInfo })
    throw error
  }
}

export default EnhancedErrorBoundary 