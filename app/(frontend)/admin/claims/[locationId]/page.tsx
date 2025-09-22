'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react'

interface LocationData {
  id: string
  name: string
  slug: string
  description: string
  address: any
  ownership: {
    ownerId: string
    claimStatus: 'pending' | 'approved' | 'rejected'
    claimedAt: string
    claimEmail: string
    claimData?: any
    reviewedAt?: string
    reviewedBy?: string
    reviewReason?: string
  }
  categories: any[]
  featuredImage: any
  gallery: any[]
  contactInfo: any
  businessHours: any[]
  priceRange: string
  createdAt: string
  updatedAt: string
}

export default function AdminClaimReviewPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params.locationId as string
  
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchClaimDetails()
  }, [locationId])

  const fetchClaimDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/claims/${locationId}`)
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Admin access required')
          return
        }
        throw new Error('Failed to fetch claim details')
      }

      const data = await response.json()
      setLocation(data.location)
    } catch (error) {
      console.error('Error fetching claim details:', error)
      setError('Failed to load claim details')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimDecision = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    try {
      setProcessing(true)
      setError(null)

      const response = await fetch(`/api/admin/claims/${locationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? rejectionReason : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process claim decision')
      }

      const result = await response.json()
      
      // Refresh the location data
      await fetchClaimDetails()
      
      // Show success message
      alert(`Claim ${action}d successfully!`)
      
    } catch (error) {
      console.error('Error processing claim decision:', error)
      setError('Failed to process claim decision')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading claim details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Location not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const isPending = location.ownership.claimStatus === 'pending'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Business Claim Review
          </h1>
          <p className="text-gray-600">
            Review and approve or reject business ownership claims
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {location.name}
                  </CardTitle>
                  <Badge 
                    variant={isPending ? "default" : location.ownership.claimStatus === 'approved' ? "default" : "destructive"}
                    className={isPending ? "bg-yellow-500" : location.ownership.claimStatus === 'approved' ? "bg-green-500" : "bg-red-500"}
                  >
                    {location.ownership.claimStatus.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{location.description}</p>
                </div>

                {location.address && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </h4>
                    <p className="text-gray-600">
                      {typeof location.address === 'string' 
                        ? location.address 
                        : `${location.address.street || ''}, ${location.address.city || ''}, ${location.address.state || ''} ${location.address.zip || ''}`
                      }
                    </p>
                  </div>
                )}

                {location.contactInfo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {location.contactInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">{location.contactInfo.phone}</span>
                      </div>
                    )}
                    {location.contactInfo.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">{location.contactInfo.email}</span>
                      </div>
                    )}
                    {location.contactInfo.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <a href={location.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {location.contactInfo.website}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {location.priceRange && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600 capitalize">{location.priceRange}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claim Information */}
            <Card>
              <CardHeader>
                <CardTitle>Claim Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Claimant Email</h4>
                    <p className="text-gray-600">{location.ownership.claimEmail}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Claim Date</h4>
                    <p className="text-gray-600">
                      {new Date(location.ownership.claimedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {location.ownership.claimData && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Additional Claim Data</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(location.ownership.claimData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {location.ownership.reviewedAt && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Review History</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Reviewed At</h5>
                        <p className="text-gray-600">
                          {new Date(location.ownership.reviewedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {location.ownership.reviewReason && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Reason</h5>
                          <p className="text-gray-600">{location.ownership.reviewReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            {isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="rejection-reason">Rejection Reason (if rejecting)</Label>
                    <Textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide a reason for rejection..."
                      className="mt-1"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => handleClaimDecision('approve')}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Approve Claim
                    </Button>

                    <Button
                      onClick={() => handleClaimDecision('reject')}
                      disabled={processing}
                      variant="destructive"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject Claim
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`/locations/${location.slug || location.id}`, '_blank')}
                >
                  View Location Page
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/admin/claims')}
                >
                  Back to Claims List
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


