import { Suspense } from 'react'
import ClaimLocationForm from '../add-location/add-location-form'

export default function ClaimLocationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClaimLocationForm />
    </Suspense>
  )
}


