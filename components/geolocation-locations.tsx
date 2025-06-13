"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";
import FallbackImage from "@/components/fallback-image";
import type { Location } from "@/app/(frontend)/map/map-data";
import { getCategoryColor, getCategoryName, getPrimaryCategory } from "@/app/(frontend)/map/category-utils";
import { getPrimaryImageUrl } from "@/lib/image-utils";


interface GeolocationLocationsProps {
  initialLocations: Location[];
}

export default function GeolocationLocations({ initialLocations }: GeolocationLocationsProps) {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showingNearbyLocations, setShowingNearbyLocations] = useState(false);

  useEffect(() => {
    // Get user's location and fetch nearby locations
    const getUserLocationAndNearbyPlaces = async () => {
      if (!navigator.geolocation) {
        console.log("Geolocation is not supported by this browser.");
        return;
      }

      setLoading(true);
      
              navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            setUserLocation(coords);
            console.log("User location obtained:", coords);
            console.log("Accuracy:", position.coords.accuracy, "meters");

            try {
              // Fetch nearby locations from server
              console.log("Fetching nearby locations...");
              const response = await fetch("/api/locations/nearby", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  latitude: coords.latitude, 
                  longitude: coords.longitude,
                  limit: 6  // Match the home page limit
                }),
              });

              console.log("API response status:", response.status);

              if (response.ok) {
                const nearbyLocations = await response.json();
                console.log("API returned", nearbyLocations.length, "nearby locations");
                
                if (nearbyLocations.length > 0) {
                  setLocations(nearbyLocations);
                  setShowingNearbyLocations(true);
                  console.log("Updated with nearby locations:", nearbyLocations.length);
                  
                  // Log distance info for first few locations
                  nearbyLocations.slice(0, 3).forEach((loc: any, index: number) => {
                    console.log(`Location ${index + 1}: "${loc.name}" - ${loc.distance?.toFixed(1) || 'unknown'} miles`);
                  });
                } else {
                  console.log("No nearby locations found within 25 miles, keeping initial locations");
                  setShowingNearbyLocations(false);
                  // Keep the initial locations if no nearby ones are found
                }
              } else {
                const errorData = await response.json();
                console.error("API error:", errorData);
                setShowingNearbyLocations(false);
              }
            } catch (error) {
              console.error("Error fetching nearby locations:", error);
              setShowingNearbyLocations(false);
            } finally {
              setLoading(false);
            }
          },
          (error) => {
            console.error("Geolocation error:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            
            // Provide user-friendly error messages
            let errorMessage = "Unable to get your location";
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = "Location access denied by user";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = "Location information unavailable";
                break;
              case error.TIMEOUT:
                errorMessage = "Location request timed out";
                break;
            }
            console.log("User-friendly error:", errorMessage);
            
            setLoading(false);
            setShowingNearbyLocations(false);
            // If geolocation fails, keep showing initial locations
          },
          { 
            timeout: 15000, // 15 second timeout
            enableHighAccuracy: false, // Faster response, less battery
            maximumAge: 300000 // 5 minutes
          }
        );
    };

    getUserLocationAndNearbyPlaces();
  }, []);



  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4ECDC4] mr-2"></div>
            Finding locations near you...
          </div>
        </div>
      )}
      
      {userLocation && (
        <div className="text-center text-sm text-gray-600 mb-4">
          <MapPin className="h-4 w-4 inline mr-1" />
          {showingNearbyLocations 
            ? "Showing locations near your area" 
            : "No locations found within 25 miles - showing popular locations"}
        </div>
      )}



      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.slice(0, 6).map((location) => {
          const primaryCategory = getPrimaryCategory(location);
          const primaryColor = getCategoryColor(primaryCategory);
          const categoryName = getCategoryName(primaryCategory);
          
          // Debug image URL
          const imageUrl = getPrimaryImageUrl(location);
          if (process.env.NODE_ENV === 'development') {
            console.log(`🏠 Home page location "${location.name}" image:`, {
              imageUrl,
              featuredImage: location.featuredImage,
              imageUrlField: location.imageUrl,
              gallery: location.gallery?.length || 0
            });
          }

          return (
            <Link key={location.id} href={`/locations/${location.id}`}>
              <div className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <FallbackImage
                    src={imageUrl}
                    alt={location.name}
                    width={400}
                    height={200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fallbackSrc="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge 
                      className="text-xs font-medium border-0 shadow-sm"
                      style={{
                        backgroundColor: `${primaryColor}20`,
                        color: primaryColor,
                        borderColor: primaryColor
                      }}
                    >
                      {categoryName}
                    </Badge>
                  </div>
                  {/* Show distance if available */}
                  {(location as any).distance && (
                    <div className="absolute top-3 right-3">
                      <Badge className="text-xs font-medium bg-black/60 text-white border-0">
                        {(location as any).distance.toFixed(1)} mi
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">{location.name}</h3>
                    {location.isVerified && (
                      <div className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        Verified
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{location.description}</p>
                  
                  {/* Location details */}
                  {location.address && (
                    <p className="text-xs text-gray-500 mb-2">
                      {typeof location.address === 'string' ? location.address : `${(location.address as any).city || ''}, ${(location.address as any).state || ''}`}
                    </p>
                  )}
                  
                  {/* Tags */}
                  {location.tags && location.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {location.tags.slice(0, 3).map((tag: { tag: string }, tagIndex: number) => (
                        <span key={tagIndex} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                          {tag.tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{location.averageRating?.toFixed(1) || '4.5'}</span>
                      {location.reviewCount && (
                        <span className="text-xs text-gray-500">({location.reviewCount})</span>
                      )}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        {(location as any).distance ? 
                          `${(location as any).distance.toFixed(1)} mi` :
                          `${Math.round(Math.sqrt(
                            Math.pow((location.latitude - 42.3601) * 69, 2) + 
                            Math.pow((location.longitude - (-71.0589)) * 54.6, 2)
                          ) * 10) / 10} mi`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 