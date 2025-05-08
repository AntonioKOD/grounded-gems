// app/(frontend)/verify/VerifyContent.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  const [status, setStatus] = useState<Status>('verifying')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    fetch(`/api/users/verify/${token}`, { method: 'POST' })
      .then(res => (res.ok ? setStatus('success') : setStatus('error')))
      .catch(() => setStatus('error'))
      .finally(() => {
        if (status === 'success') {
          setTimeout(() => router.push('/login'), 2000)
        }
      })
  }, [token, router, status])

  if (status === 'verifying') return <p>Verifying…</p>
  if (status === 'success')   return <p>Email verified! Redirecting…</p>
  return <p>Verification failed. Please request a new link.</p>
}