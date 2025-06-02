"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Navigation, MapPin, Star, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Location } from "./map-data"
import { getCategoryColor, getCategoryName } from "./category-utils"

interface LocationBottomSheetProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
  onViewDetails: (location: Location) => void
  isMobile?: boolean
  cluster?: {
    locations: Location[]
    isCluster: boolean
  }
}

export default function LocationBottomSheet({
  location,
  isOpen,
  onClose,
  onViewDetails,
  isMobile = false,
  cluster
}: LocationBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Wait for component to mount before rendering portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get image URL from location object
  const getLocationImageUrl = (location: Location): string => {
    if (typeof location.featuredImage === "string") {
      return location.featuredImage
    } else if (location.featuredImage?.url) {
      return location.featuredImage.url
    } else if (location.imageUrl) {
      return location.imageUrl
    }
    return "/placeholder.svg"
  }

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        console.log('🔄 Bottom sheet: Backdrop clicked, closing')
        onClose()
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('🔄 Bottom sheet: Escape pressed, closing')
        onClose()
      }
    }

    if (isOpen) {
      console.log('🔄 Bottom sheet: Adding event listeners')
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden'
    } else {
      console.log('🔄 Bottom sheet: Removing event listeners')
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Debug logging
  useEffect(() => {
    if (isOpen && location) {
      console.log('🎉 Bottom sheet should be visible!', {
        location: location.name,
        isOpen,
        isMobile,
        mounted
      })
    } else {
      console.log('❌ Bottom sheet should be hidden', { isOpen, location: !!location, mounted })
    }
  }, [isOpen, location, isMobile, mounted])

  if (!location && !cluster?.isCluster) return null
  if (!mounted) return null

  const categoryInfo = location ? {
    color: getCategoryColor(location.categories?.[0]),
    name: getCategoryName(location.categories?.[0])
  } : {
    color: '#6C757D',
    name: 'Mixed'
  }

  const handleDirections = () => {
    if (location.address) {
      const address = typeof location.address === "string"
        ? location.address
        : Object.values(location.address).filter(Boolean).join(", ")
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
      window.open(mapsUrl, "_blank")
    }
  }

  const handleClose = () => {
    console.log('🔄 Bottom sheet: Close button clicked')
    onClose()
  }

  const bottomSheetContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 z-[99998]"
            onClick={handleClose}
            style={{ zIndex: 99998 }}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ 
              type: "spring",
              damping: 25,
              stiffness: 200,
              duration: 0.4
            }}
            className="fixed inset-x-0 bottom-0 z-[99999] bg-white rounded-t-3xl shadow-2xl max-h-[85vh] min-h-[50vh] flex flex-col border-t-2 border-gray-200"
            style={{ zIndex: 99999 }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3 bg-white rounded-t-3xl">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            
            {/* Content */}
            <div className="flex-1 px-6 pb-8 overflow-y-auto bg-white" style={{ minHeight: 0 }}>
              {/* Cluster Selection or Single Location */}
              {cluster?.isCluster && cluster.locations.length > 1 ? (
                // Cluster Selection View
                <>
                  {/* Header for Cluster */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 pr-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {cluster.locations.length} Locations Here
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Choose a location to view details
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    >
                      <X className="w-6 h-6 text-gray-500" />
                    </Button>
                  </div>

                  {/* Cluster Locations List */}
                  <div className="space-y-4">
                    {cluster.locations.map((clusterLocation, index) => {
                      const categoryInfo = {
                        color: getCategoryColor(clusterLocation.categories?.[0]),
                        name: getCategoryName(clusterLocation.categories?.[0])
                      }
                      
                      return (
                        <motion.div
                          key={clusterLocation.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => onViewDetails(clusterLocation)}
                        >
                          <div className="flex items-center gap-4">
                            {/* Location Image */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                              <img 
                                src={getLocationImageUrl(clusterLocation)} 
                                alt={clusterLocation.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            {/* Location Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1 truncate">
                                {clusterLocation.name}
                              </h4>
                              
                              {/* Category Badge */}
                              <div className="mb-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-1 font-medium text-white border-0"
                                  style={{ backgroundColor: categoryInfo.color }}
                                >
                                  {categoryInfo.name}
                                </Badge>
                              </div>
                              
                              {/* Rating */}
                              {clusterLocation.averageRating && (
                                <div className="flex items-center gap-1">
                                  <div className="flex items-center">
                                    {Array.from({length: 5}, (_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          "w-3 h-3",
                                          i < Math.floor(clusterLocation.averageRating || 0) 
                                            ? "text-yellow-400 fill-yellow-400" 
                                            : "text-gray-300"
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {clusterLocation.averageRating.toFixed(1)}
                                  </span>
                                  {clusterLocation.reviewCount && (
                                    <span className="text-sm text-gray-500">
                                      ({clusterLocation.reviewCount})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Arrow */}
                            <div className="flex-shrink-0">
                              <ExternalLink className="w-5 h-5 text-gray-400" />
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </>
              ) : location ? (
                // Single Location View (existing code)
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{location.name}</h3>
                      {location.shortDescription && (
                        <p className="text-gray-600 text-sm">{location.shortDescription}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    >
                      <X className="w-6 h-6 text-gray-500" />
                    </Button>
                  </div>
                  
                  {/* Image */}
                  <div className="mb-6 w-full aspect-video overflow-hidden rounded-2xl">
                    <img 
                      src={getLocationImageUrl(location)} 
                      alt={location.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Category Badge */}
                  <div className="mb-4">
                    <Badge
                      variant="outline"
                      className="text-sm px-3 py-1 font-medium text-white border-0"
                      style={{ backgroundColor: categoryInfo.color }}
                    >
                      {categoryInfo.name}
                    </Badge>
                  </div>
                  
                  {/* Rating */}
                  {location.averageRating && (
                    <div className="flex items-center mb-6">
                      <div className="flex items-center mr-3">
                        {Array.from({length: 5}, (_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-5 h-5",
                              i < Math.floor(location.averageRating || 0) 
                                ? "text-yellow-400 fill-yellow-400" 
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-lg font-semibold text-gray-800 mr-2">
                        {location.averageRating.toFixed(1)}
                      </span>
                      {location.reviewCount && (
                        <>
                          <span className="text-gray-500">·</span>
                          <span className="text-gray-500 ml-2">{location.reviewCount} reviews</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Address */}
                  {location.address && (
                    <div className="flex items-start mb-6 p-4 bg-gray-50 rounded-xl">
                      <MapPin className="w-5 h-5 text-gray-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm leading-relaxed">
                        {typeof location.address === "string"
                          ? location.address
                          : Object.values(location.address).filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={handleDirections}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center"
                    >
                      <Navigation className="w-5 h-5 mr-2" />
                      Directions
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('🔄 Bottom sheet: View Details clicked')
                        onViewDetails(location)
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      View Details
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Render using portal to ensure it's at the root level
  return mounted ? createPortal(bottomSheetContent, document.body) : null
} 