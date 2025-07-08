"use client"

import { useState, useEffect } from 'react'
import { MapPin, AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LocationPermissionEnforcerProps {
  onLocationGranted: (coordinates: { latitude: number; longitude: number }) => void
  onLocationDenied: () => void
  onSkip?: () => void
  required?: boolean
  title?: string
  description?: string
}

type LocationStatus = 'requesting' | 'granted' | 'denied' | 'error' | 'timeout'

export default function LocationPermissionEnforcer({
  onLocationGranted,
  onLocationDenied,
  onSkip,
  required = true,
  title = "Enable Location Services",
  description = "We need your location to show you personalized recommendations and nearby places."
}: LocationPermissionEnforcerProps) {
  const [status, setStatus] = useState<LocationStatus>('requesting')
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    requestLocationPermission()
  }, [])

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      setStatus('error')
      setErrorMessage('Geolocation is not supported by your browser.')
      return
    }

    setStatus('requesting')

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000 // 5 minutes
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        setCoordinates(coords)
        setStatus('granted')
        onLocationGranted(coords)
      },
      (error) => {
        console.error('Geolocation error:', error)
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setStatus('denied')
            setErrorMessage('Location permission was denied. Please enable location services in your browser settings.')
            break
          case error.POSITION_UNAVAILABLE:
            setStatus('error')
            setErrorMessage('Location information is unavailable. Please try again.')
            break
          case error.TIMEOUT:
            setStatus('timeout')
            setErrorMessage('Location request timed out. Please try again.')
            break
          default:
            setStatus('error')
            setErrorMessage('An error occurred while getting your location.')
        }
        
        if (required) {
          onLocationDenied()
        }
      },
      options
    )
  }

  const handleRetry = () => {
    setStatus('requesting')
    setErrorMessage('')
    requestLocationPermission()
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    } else {
      onLocationDenied()
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'requesting':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      case 'granted':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'denied':
      case 'error':
      case 'timeout':
        return <XCircle className="h-8 w-8 text-red-500" />
      default:
        return <MapPin className="h-8 w-8 text-gray-400" />
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'requesting':
        return 'Getting Your Location...'
      case 'granted':
        return 'Location Enabled!'
      case 'denied':
        return 'Location Permission Denied'
      case 'error':
        return 'Location Error'
      case 'timeout':
        return 'Location Request Timed Out'
      default:
        return title
    }
  }

  const getStatusDescription = () => {
    switch (status) {
      case 'requesting':
        return 'Please allow location access when prompted by your browser.'
      case 'granted':
        return 'Great! We can now show you personalized recommendations.'
      case 'denied':
        return 'Location access is required for the best experience. You can enable it in your browser settings.'
      case 'error':
      case 'timeout':
        return errorMessage
      default:
        return description
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {getStatusIcon()}
        </div>
        <CardTitle className="text-xl">{getStatusTitle()}</CardTitle>
        <CardDescription>{getStatusDescription()}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status === 'granted' && coordinates && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Location: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
            </AlertDescription>
          </Alert>
        )}

        {status === 'denied' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              To enable location services:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Click the location icon in your browser's address bar</li>
                <li>Select "Allow" or "Always allow"</li>
                <li>Refresh the page and try again</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {(status === 'error' || status === 'timeout') && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {status === 'requesting' && (
            <div className="text-center">
              <div className="animate-pulse text-sm text-gray-600">
                Waiting for location permission...
              </div>
            </div>
          )}

          {status === 'granted' && (
            <Button 
              onClick={() => onLocationGranted(coordinates!)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Continue
            </Button>
          )}

          {(status === 'denied' || status === 'error' || status === 'timeout') && (
            <div className="space-y-2">
              <Button 
                onClick={handleRetry}
                className="w-full"
              >
                Try Again
              </Button>
              
              {!required && onSkip && (
                <Button 
                  onClick={handleSkip}
                  variant="outline"
                  className="w-full"
                >
                  Skip for Now
                </Button>
              )}
            </div>
          )}
        </div>

        {status === 'requesting' && (
          <div className="text-center text-xs text-gray-500 mt-4">
            <p>💡 Tip: Look for a location permission prompt in your browser</p>
            <p>It might appear in the address bar or as a popup</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 