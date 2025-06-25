'use client'

import { UserPhotosSection } from './user-photos-section'

interface UserPhotosWrapperProps {
  locationId: string
  locationName: string
  className?: string
}

export function UserPhotosWrapper({ locationId, locationName, className }: UserPhotosWrapperProps) {
  return (
    <UserPhotosSection 
      locationId={locationId} 
      locationName={locationName}
      className={className}
    />
  )
} 