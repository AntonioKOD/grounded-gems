// app/(frontend)/verify/page.tsx
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import VerifyContent from '@/components/VerifyContent'

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}