import { Suspense } from 'react'
import ClaimLocationForm from './add-location-form'

export default function AddLocationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClaimLocationForm />
    </Suspense>
  )
}