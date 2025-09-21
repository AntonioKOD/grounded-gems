import { Suspense } from 'react'
import UltraSimpleForm from './ultra-simple-form'

export default function AddLocationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UltraSimpleForm />
    </Suspense>
  )
}