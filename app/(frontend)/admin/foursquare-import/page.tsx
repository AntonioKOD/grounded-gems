// Force dynamic rendering to prevent SSR issues with auth cookies
export const dynamic = 'force-dynamic'

import EnhancedFoursquareImport from './enhanced-import'

export default function FoursquareImportPage() {
  return <EnhancedFoursquareImport />
} 