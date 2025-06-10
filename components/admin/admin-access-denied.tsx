"use client"

import { Shield, ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface AdminAccessDeniedProps {
  userEmail?: string
  className?: string
}

export default function AdminAccessDenied({ userEmail, className = "" }: AdminAccessDeniedProps) {
  const router = useRouter()

  return (
    <div className={`min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-md border-red-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-red-800 flex items-center gap-2 justify-center">
            <AlertTriangle className="h-5 w-5" />
            Access Denied
          </CardTitle>
          <CardDescription className="text-red-600">
            Admin access is restricted to authorized users only
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium mb-2">
              🚫 Unauthorized Access Attempt
            </p>
            {userEmail && (
              <p className="text-xs text-red-600">
                Logged in as: <span className="font-mono bg-red-100 px-2 py-1 rounded">{userEmail}</span>
              </p>
            )}
            <p className="text-xs text-red-500 mt-2">
              This incident has been logged for security purposes.
            </p>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              If you believe you should have admin access, please contact the system administrator.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => router.push('/dashboard')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Return to Home
              </Button>
            </div>
          </div>
          
          <div className="pt-4 border-t border-red-200">
            <p className="text-xs text-gray-500">
              🔒 Protected by Sacavia Security System
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for checking admin access on client side
export function useAdminAccess() {
  // This could be expanded to include real-time admin access checking
  return {
    isAdmin: false, // Will be determined by server-side authentication
    checkingAccess: false
  }
} 