"use client"

import { useEffect, useState, memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Star, ArrowRight, MapIcon, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { AppLocation } from "@/types/location"
import { getNearbyOrPopularLocations } from "@/app/(frontend)/home-page-actions/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const NearbyLocations = memo(function NearbyLocations() {
  const router = useRouter()
  const [locations, setLocations] = useState<AppLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number | null
    longitude: number | null
  }>({ latitude: null, longitude: null })
  const [locationStatus, setLocationStatus] = useState<"loading" | "granted" | "denied" | "unavailable">("loading")

  // Function to load locations with better error handling
  const loadLocations = useCallback(async (coordinates?: { latitude: number; longitude: number }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const nearbyLocations = await getNearbyOrPopularLocations(
        coordinates
          ? {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            }
          : undefined,
        6,
      )
      setLocations(nearbyLocations)
    } catch (error) {
      console.error("Error loading locations:", error)
      setError("Failed to load locations. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get user's location with better permission handling
  useEffect(() => {
    if ("geolocation" in navigator) {
      // Check if permission was previously denied
      const checkPermission = async () => {
        try {
          // Modern browsers support permissions API
          if ('permissions' in navigator) {
            const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            
            if (permission.state === 'denied') {
              setLocationStatus("denied");
              loadLocations(); // Load popular locations instead
              return;
            }
          }
          
          // Try to get location with timeout
          const locationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              maximumAge: 600000, // 10 minutes
              enableHighAccuracy: false
            });
          });
          
          // Add timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Location request timed out')), 10000);
          });
          
          // Race between location and timeout
          const position = await Promise.race([locationPromise, timeoutPromise]) as GeolocationPosition;
          
          setUserCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationStatus("granted");
        } catch (error) {
          console.warn("Geolocation error:", error);
          setLocationStatus("denied");
          // Load locations without coordinates
          loadLocations();
        }
      };
      
      checkPermission();
    } else {
      // Geolocation not supported
      setLocationStatus("unavailable");
      loadLocations();
    }
  }, [loadLocations]);

  // Load locations when coordinates change
  useEffect(() => {
    if (userCoordinates.latitude && userCoordinates.longitude) {
      loadLocations({
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude
      })
    }
  }, [userCoordinates, loadLocations])

  // Format distance
  const formatDistance = (distance?: number) => {
    if (!distance) return ""
    return distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`
  }

  // Loading state
  if (isLoading) {
    return (
      <section className="py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {locationStatus === "granted" ? "Nearby Locations" : "Popular Locations"}
          </h2>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden shadow-sm">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  // Error state
  if (error) {
    return (
      <section className="py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {locationStatus === "granted" ? "Nearby Locations" : "Popular Locations"}
          </h2>
          <Button
            variant="outline"
            onClick={() => router.push("/map")}
            className="border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10"
          >
            View Map
            <MapIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => loadLocations(userCoordinates.latitude && userCoordinates.longitude ? 
          {
            latitude: userCoordinates.latitude,
            longitude: userCoordinates.longitude
          } : undefined)}>
          Try Again
        </Button>
      </section>
    )
  }

  // No locations
  if (locations.length === 0) {
    return (
      <section className="py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {locationStatus === "granted" ? "Nearby Locations" : "Popular Locations"}
          </h2>
          <Button
            variant="outline"
            onClick={() => router.push("/map")}
            className="border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10"
          >
            View Map
            <MapIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <Card className="border-dashed bg-gray-50">
          <CardContent className="py-16 text-center">
            <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No locations found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              {locationStatus === "denied" 
                ? "Enable location access to find places near you, or explore our popular locations."
                : "We couldn't find any locations near you. Try adding your own location."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90">
                <Link href="/add-location">Add a Location</Link>
              </Button>
              {locationStatus === "denied" && (
                <Button variant="outline" onClick={() => loadLocations()}>
                  Show Popular Locations
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {locationStatus === "granted" ? "Nearby Locations" : "Popular Locations"}
        </h2>
        <Button
          variant="outline"
          onClick={() => router.push("/map")}
          className="border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10"
        >
          View Map
          <MapIcon className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <Card key={location.id} className="overflow-hidden shadow-sm transition-all hover:shadow-md">
            <div className="relative h-48 w-full">
              <Image
                src={location.image || "/placeholder-location.jpg"}
                alt={location.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
                priority={false}
                loading="lazy"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{location.name}</h3>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <MapPin className="h-3.5 w-3.5 mr-1 text-[#4ECDC4] flex-shrink-0" />
                <span className="line-clamp-1">
                  {location.location?.address ||
                    [location.location?.city, location.location?.state, location.location?.country]
                      .filter(Boolean)
                      .join(", ") ||
                    "No address"}
                </span>
              </div>
              {location.distance !== undefined && (
                <div className="text-sm text-[#4ECDC4] font-medium mb-2">{formatDistance(location.distance)}</div>
              )}
              {location.rating && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500 mr-1" />
                  <span className="text-sm font-medium">{location.rating.toFixed(1)}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-end">
              <Button asChild variant="ghost" className="text-[#4ECDC4] hover:text-[#4ECDC4] hover:bg-[#4ECDC4]/10">
                <Link href={`/location/${location.id}`}>
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
})

export default NearbyLocations
