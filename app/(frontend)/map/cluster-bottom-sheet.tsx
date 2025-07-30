"use client"

import { useState } from "react"
import { X, MapPin, Star, Clock, DollarSign, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { Location, Category } from "./map-data"
import { getPrimaryImageUrl } from "@/lib/image-utils"

interface ClusterBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  clusterData: {
    locations: Location[]
    center: [number, number]
    count: number
  } | null
  onLocationSelect: (location: Location) => void
}

export default function ClusterBottomSheet({
  isOpen,
  onClose,
  clusterData,
  onLocationSelect
}: ClusterBottomSheetProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  if (!clusterData) return null

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location)
    onLocationSelect(location)
    onClose()
  }

  const getCategoryColor = (categories: Array<Category | string> | undefined) => {
    if (!categories || categories.length === 0) return "bg-gray-500"
    
    const category = typeof categories[0] === 'string' ? categories[0] : categories[0]?.name || ""
    const categoryLower = category.toLowerCase()
    
    if (categoryLower.includes("restaurant") || categoryLower.includes("food")) return "bg-orange-500"
    if (categoryLower.includes("coffee") || categoryLower.includes("cafe")) return "bg-amber-500"
    if (categoryLower.includes("bar") || categoryLower.includes("pub")) return "bg-purple-500"
    if (categoryLower.includes("park") || categoryLower.includes("outdoor")) return "bg-green-500"
    if (categoryLower.includes("museum") || categoryLower.includes("art")) return "bg-blue-500"
    if (categoryLower.includes("shopping") || categoryLower.includes("retail")) return "bg-pink-500"
    
    return "bg-gray-500"
  }

  const formatAddress = (address: any) => {
    if (typeof address === "string") return address
    if (!address) return "Address not available"
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zip
    ].filter(Boolean)
    
    return parts.join(", ") || "Address not available"
  }

  const formatPriceRange = (priceRange: string | undefined) => {
    if (!priceRange) return "Price varies"
    const ranges: { [key: string]: string } = {
      'free': 'Free',
      'budget': '$',
      'moderate': '$$',
      'expensive': '$$$',
      'luxury': '$$$$'
    }
    return ranges[priceRange] || "Price varies"
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {clusterData.count} Locations Found
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Tap any location to view details
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Location List */}
            <div className="overflow-y-auto max-h-[60vh]">
              <div className="px-6 py-4 space-y-3">
                {clusterData.locations.map((location, index) => (
                  <motion.div
                    key={location.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleLocationClick(location)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={getPrimaryImageUrl(location)}
                          alt={location.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {location.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {formatAddress(location.address)}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                        
                        {/* Categories */}
                        {location.categories && location.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {location.categories.slice(0, 2).map((category, catIndex) => {
                              const categoryName = typeof category === 'string' ? category : category.name || ''
                              return (
                                <Badge
                                  key={catIndex}
                                  variant="secondary"
                                  className={cn(
                                    "text-xs",
                                    getCategoryColor([category])
                                  )}
                                >
                                  {categoryName}
                                </Badge>
                              )
                            })}
                            {location.categories.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{location.categories.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Rating and Price */}
                        <div className="flex items-center gap-4 mt-2">
                          {location.averageRating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600">
                                {location.averageRating.toFixed(1)}
                                {location.reviewCount && ` (${location.reviewCount})`}
                              </span>
                            </div>
                          )}
                          
                          {location.priceRange && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {formatPriceRange(location.priceRange)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Verified Badge */}
                        {location.isVerified && (
                          <div className="mt-2">
                            <Badge variant="default" className="bg-green-500 text-white text-xs">
                              ✓ Verified
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
} 