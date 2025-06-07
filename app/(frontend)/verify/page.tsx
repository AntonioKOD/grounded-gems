import { Suspense } from 'react'
import VerifyEmailComponent from '@/components/auth/verify-email'

export const metadata = {
  title: 'Verify Email - Sacavia',
  description: 'Verify your email address to complete your Sacavia account setup',
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF6B6B]/5 via-white to-[#4ECDC4]/5">
      <div className="container mx-auto py-12 px-4">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B6B] mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          </div>
        }>
          <VerifyEmailComponent />
        </Suspense>
      </div>
    </div>
  )
}