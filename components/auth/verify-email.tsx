"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login?verified=true')
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
        setMessage('A new verification email has been sent to your inbox.')
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
            {status === 'loading' && 'Please wait while we verify your email address...'}
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
              <Link href="/login" passHref>
                <Button className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90">
                  Go to Login
                </Button>
              </Link>
            )}

            {status === 'error' && (
              <div className="space-y-2">
                <Link href="/signup/enhanced" passHref>
                  <Button variant="outline" className="w-full">
                    Create New Account
                  </Button>
                </Link>
                <Link href="/login" passHref>
                  <Button className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90">
                    Try Login Instead
                  </Button>
                </Link>
              </div>
            )}

            <Link href="/" passHref>
              <Button variant="ghost" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 