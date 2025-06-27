"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { safeNavigate, getSafeRedirectPath, clearAuthRedirectHistory } from '@/lib/redirect-loop-prevention'

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'already-verified'

export default function VerifyEmailComponent() {
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Invalid verification link. Please check your email for the correct link.')
        return
      }

      try {
        // Call Payload's verify endpoint
        const response = await fetch('/api/users/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage('Your email has been verified successfully!')
          setEmail(data.user?.email || '')
          
          // Clear auth redirect history to prevent future loops
          clearAuthRedirectHistory()
          
          // Use safe navigation instead of timer-based redirect
          setTimeout(() => {
            const safeRedirect = getSafeRedirectPath('/login?verified=true', '/feed')
            safeNavigate(safeRedirect, router)
          }, 3000)
        } else {
          if (data.error?.includes('already verified')) {
            setStatus('already-verified')
            setMessage('Your email is already verified. You can log in now.')
          } else if (data.error?.includes('expired')) {
            setStatus('expired')
            setMessage('This verification link has expired. Please request a new one.')
            setEmail(data.email || '')
          } else {
            setStatus('error')
            setMessage(data.error || 'Email verification failed. Please try again.')
          }
        }
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage('Something went wrong. Please try again or contact support.')
      }
    }

    verifyEmail()
  }, [token, router])

  const handleResendVerification = async () => {
    if (!email) return

    try {
      const response = await fetch('/api/resend-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setMessage('A new verification email has been sent to your inbox. Don\'t forget to check your spam/junk folder if you don\'t see it!')
      } else {
        setMessage('Failed to resend verification email. Please try again.')
      }
    } catch (error) {
      setMessage('Failed to resend verification email. Please try again.')
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-[#FF6B6B]" />
      case 'success':
      case 'already-verified':
        return <CheckCircle className="h-12 w-12 text-green-500" />
      case 'error':
      case 'expired':
        return <XCircle className="h-12 w-12 text-red-500" />
      default:
        return <Mail className="h-12 w-12 text-gray-400" />
    }
  }

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Your Email...'
      case 'success':
        return 'Email Verified!'
      case 'already-verified':
        return 'Already Verified'
      case 'expired':
        return 'Link Expired'
      case 'error':
        return 'Verification Failed'
      default:
        return 'Email Verification'
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>
            {status === 'loading' && (
              <div className="space-y-2 text-left">
                <p className="text-center">Please wait while we verify your email address...</p>
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-800 mb-1">💡 Quick Tip:</p>
                  <p>If you haven't received the verification email, check your <strong>spam or junk folder</strong> - emails sometimes end up there!</p>
                </div>
              </div>
            )}
            {status === 'success' && 'Welcome to Sacavia! Redirecting you to login...'}
            {status === 'already-verified' && 'Your account is ready to use.'}
            {status === 'expired' && 'The verification link has expired.'}
            {status === 'error' && 'We encountered an issue verifying your email.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={status === 'success' || status === 'already-verified' ? 'default' : 'destructive'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Email delivery notice */}
          {(status === 'expired' || status === 'error') && (
            <Alert className="border-amber-200 bg-amber-50">
              <Mail className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <div className="space-y-2">
                  <p className="font-medium">Can't find your verification email?</p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Check your <strong>spam</strong> or <strong>junk</strong> folder</li>
                    <li>Look for emails from <strong>noreply@sacavia.com</strong></li>
                    <li>Add our email to your contacts to prevent future emails from going to spam</li>
                    <li>Wait a few minutes as email delivery can sometimes be delayed</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <div className="text-sm text-gray-600">
              <p>Automatically redirecting to login page in 3 seconds...</p>
            </div>
          )}

          {status === 'expired' && email && (
            <Button 
              onClick={handleResendVerification}
              className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            >
              Resend Verification Email
            </Button>
          )}

          <div className="space-y-2">
            {(status === 'success' || status === 'already-verified') && (
              <Button 
                onClick={() => {
                  clearAuthRedirectHistory()
                  const safeLoginPath = getSafeRedirectPath('/login', '/login')
                  safeNavigate(safeLoginPath, router)
                }}
                className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90"
              >
                Go to Login
              </Button>
            )}

            {status === 'error' && (
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    clearAuthRedirectHistory()
                    const safeSignupPath = getSafeRedirectPath('/signup/enhanced', '/signup/enhanced')
                    safeNavigate(safeSignupPath, router)
                  }}
                  variant="outline" 
                  className="w-full"
                >
                  Create New Account
                </Button>
                <Button 
                  onClick={() => {
                    clearAuthRedirectHistory()
                    const safeLoginPath = getSafeRedirectPath('/login', '/login')
                    safeNavigate(safeLoginPath, router)
                  }}
                  className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90"
                >
                  Try Login Instead
                </Button>
              </div>
            )}

            <Button 
              onClick={() => {
                clearAuthRedirectHistory()
                const safeHomePath = getSafeRedirectPath('/', '/')
                safeNavigate(safeHomePath, router)
              }}
              variant="ghost" 
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 