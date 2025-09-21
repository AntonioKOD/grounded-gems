'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Building2, 
  Mail, 
  Phone, 
  Globe,
  FileText,
  Calendar,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ClaimStatus {
  id: string
  locationId: string
  locationName: string
  locationSlug?: string
  claimStatus: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  estimatedReviewTime: string
  businessInfo: {
    businessName: string
    contactEmail: string
    ownerName: string
    ownerTitle?: string
    ownerPhone?: string
    businessWebsite?: string
    businessDescription?: string
    businessAddress?: {
      street: string
      city: string
      state: string
      zip: string
      country: string
    }
  }
  verificationInfo: {
    claimMethod: string
    businessLicense?: string
    taxId?: string
    additionalDocuments?: string[]
  }
  rejectionReason?: string
  reviewerNotes?: string
}

function ClaimStatusContent() {
  const searchParams = useSearchParams()
  const locationId = searchParams.get('locationId')
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (locationId) {
      fetchClaimStatus(locationId)
    } else {
      setError('No location ID provided')
      setIsLoading(false)
    }
  }, [locationId])

  const fetchClaimStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/locations/${id}/claim`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('No claim found for this location')
        } else {
          throw new Error('Failed to fetch claim status')
        }
        return
      }

      const data = await response.json()
      const claimData = data.data
      
      // Fetch location data to get the slug
      try {
        const locationResponse = await fetch(`/api/locations/${id}`)
        if (locationResponse.ok) {
          const locationData = await locationResponse.json()
          claimData.locationSlug = locationData.location?.slug
        }
      } catch (locationError) {
        console.warn('Failed to fetch location slug:', locationError)
      }
      
      setClaimStatus(claimData)
    } catch (error) {
      console.error('Error fetching claim status:', error)
      setError('Failed to load claim status')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Your claim has been approved! You now have full control over this business listing.'
      case 'rejected':
        return 'Your claim was not approved. Please review the feedback below and resubmit if needed.'
      case 'pending':
      default:
        return 'Your claim is currently under review. We\'ll notify you once the review is complete.'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading claim status...</p>
        </div>
      </div>
    )
  }

  if (error || !claimStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error || 'Claim not found'}</p>
            <Button asChild className="w-full">
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Claim Status</h1>
          <p className="text-gray-600">Track the status of your business claim</p>
        </div>

        {/* Status Overview */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(claimStatus.claimStatus)}
                  {claimStatus.locationName}
                </CardTitle>
                <CardDescription>
                  Business Claim Status
                </CardDescription>
              </div>
              <Badge className={getStatusColor(claimStatus.claimStatus)}>
                {claimStatus.claimStatus.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {getStatusMessage(claimStatus.claimStatus)}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Submitted:</span>
                <span className="font-medium">
                  {new Date(claimStatus.submittedAt).toLocaleDateString()}
                </span>
              </div>
              
              {claimStatus.reviewedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Reviewed:</span>
                  <span className="font-medium">
                    {new Date(claimStatus.reviewedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Est. Review:</span>
                <span className="font-medium">{claimStatus.estimatedReviewTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Business Name:</span>
                </div>
                <p className="text-gray-600">{claimStatus.businessInfo.businessName}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Owner:</span>
                </div>
                <p className="text-gray-600">
                  {claimStatus.businessInfo.ownerName}
                  {claimStatus.businessInfo.ownerTitle && ` (${claimStatus.businessInfo.ownerTitle})`}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Email:</span>
                </div>
                <p className="text-gray-600">{claimStatus.businessInfo.contactEmail}</p>
              </div>
              
              {claimStatus.businessInfo.ownerPhone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Phone:</span>
                  </div>
                  <p className="text-gray-600">{claimStatus.businessInfo.ownerPhone}</p>
                </div>
              )}
              
              {claimStatus.businessInfo.businessWebsite && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Website:</span>
                  </div>
                  <a 
                    href={claimStatus.businessInfo.businessWebsite} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {claimStatus.businessInfo.businessWebsite}
                  </a>
                </div>
              )}
            </div>
            
            {claimStatus.businessInfo.businessDescription && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Description:</span>
                <p className="text-gray-600">{claimStatus.businessInfo.businessDescription}</p>
              </div>
            )}
            
            {claimStatus.businessInfo.businessAddress && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Business Address:</span>
                <p className="text-gray-600">
                  {[
                    claimStatus.businessInfo.businessAddress.street,
                    claimStatus.businessInfo.businessAddress.city,
                    claimStatus.businessInfo.businessAddress.state,
                    claimStatus.businessInfo.businessAddress.zip,
                    claimStatus.businessInfo.businessAddress.country
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Verification Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Verification Method:</span>
                <p className="text-gray-600 capitalize">{claimStatus.verificationInfo.claimMethod.replace('_', ' ')}</p>
              </div>
              
              {claimStatus.verificationInfo.businessLicense && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Business License:</span>
                  <p className="text-gray-600">{claimStatus.verificationInfo.businessLicense}</p>
                </div>
              )}
              
              {claimStatus.verificationInfo.taxId && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Tax ID:</span>
                  <p className="text-gray-600">{claimStatus.verificationInfo.taxId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rejection Reason */}
        {claimStatus.claimStatus === 'rejected' && claimStatus.rejectionReason && (
          <Card className="mb-6 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                Rejection Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{claimStatus.rejectionReason}</p>
              {claimStatus.reviewerNotes && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-800">Reviewer Notes:</span>
                  <p className="text-red-700 mt-1">{claimStatus.reviewerNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="flex-1">
            <Link href={`/locations/${claimStatus.locationSlug || claimStatus.locationId}`}>
              View Location
            </Link>
          </Button>
          
          {claimStatus.claimStatus === 'approved' && (
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/locations/${claimStatus.locationSlug || claimStatus.locationId}/edit`}>
                Manage Listing
              </Link>
            </Button>
          )}
          
          {claimStatus.claimStatus === 'rejected' && (
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/locations/${claimStatus.locationSlug || claimStatus.locationId}/claim`}>
                Resubmit Claim
              </Link>
            </Button>
          )}
          
          <Button asChild variant="outline">
            <Link href="/">
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ClaimStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading claim status...</p>
        </div>
      </div>
    }>
      <ClaimStatusContent />
    </Suspense>
  )
}
