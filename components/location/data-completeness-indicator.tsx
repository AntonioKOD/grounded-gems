'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Info, Plus, Building2 } from 'lucide-react'
import { getDataCompletenessScore, getLocationViewType } from '@/lib/location-data-utils'
import { useState } from 'react'

interface DataCompletenessIndicatorProps {
  location: any
  showDetails?: boolean
  onClaimClick?: () => void
}

export function DataCompletenessIndicator({ 
  location, 
  showDetails = false, 
  onClaimClick 
}: DataCompletenessIndicatorProps) {
  const [showFullDetails, setShowFullDetails] = useState(showDetails)
  
  if (!location) return null

  const completenessScore = getDataCompletenessScore(location)
  const viewType = getLocationViewType(location)
  const isUnclaimed = location.ownership?.claimStatus === 'unclaimed' || !location.ownership

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Comprehensive'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Basic'
    return 'Minimal'
  }

  const getMissingFields = () => {
    const missing = []
    
    if (!location.featuredImage) missing.push('Featured image')
    if (!location.gallery?.length) missing.push('Photo gallery')
    if (!location.contactInfo?.phone && !location.contactInfo?.email && !location.contactInfo?.website) missing.push('Contact info')
    if (!location.businessHours?.length) missing.push('Business hours')
    if (!location.priceRange) missing.push('Price range')
    if (!location.insiderTips) missing.push('Insider tips')
    if (!location.tags?.length) missing.push('Tags')
    
    return missing
  }

  const missingFields = getMissingFields()

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Location Information
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`text-xs ${getScoreColor(completenessScore)} border-current`}
          >
            {getScoreLabel(completenessScore)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Data Completeness</span>
            <span className={`font-medium ${getScoreColor(completenessScore)}`}>
              {completenessScore}%
            </span>
          </div>
          <Progress 
            value={completenessScore} 
            className="h-2"
          />
        </div>

        {showFullDetails && missingFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-blue-700 font-medium">Missing Information:</p>
            <div className="flex flex-wrap gap-1">
              {missingFields.slice(0, 3).map((field, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {field}
                </Badge>
              ))}
              {missingFields.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{missingFields.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {isUnclaimed && (
          <div className="pt-2 border-t border-blue-200">
            <p className="text-xs text-blue-700 mb-2">
              {viewType === 'simple' 
                ? 'This location has basic information. Business owners can claim it to add more details.'
                : 'Business owners can claim this location to manage and enhance the listing.'
              }
            </p>
            {onClaimClick && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
                onClick={onClaimClick}
              >
                <Building2 className="h-3 w-3 mr-1" />
                Claim This Business
              </Button>
            )}
          </div>
        )}

        {!showFullDetails && missingFields.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            onClick={() => setShowFullDetails(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Show Details
          </Button>
        )}
      </CardContent>
    </Card>
  )
}









