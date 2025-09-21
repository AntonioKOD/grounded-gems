/**
 * Determines the status badge props for a location based on ownership claim status
 */
export function getLocationStatusBadgeProps(ownership?: { claimStatus?: string }) {
  const isVerified = ownership?.claimStatus && ['approved', 'verified'].includes(ownership.claimStatus)
  
  if (isVerified) {
    return {
      className: "bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full",
      children: "Verified"
    }
  }
  
  return {
    variant: "outline" as const,
    className: "border-gray-300 text-gray-600 text-xs font-medium px-2 py-1 rounded-full",
    children: "Community-added"
  }
}

/**
 * Helper function to check if a location is verified
 */
export function isLocationVerified(ownership?: { claimStatus?: string }): boolean {
  return Boolean(ownership?.claimStatus && ['approved', 'verified'].includes(ownership.claimStatus))
}
