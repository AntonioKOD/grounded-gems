"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  Star, 
  Clock, 
  DollarSign, 
  Navigation, 
  Bookmark, 
  Heart, 
  X, 
  ChevronRight,
  Eye,
  Users,
  Lightbulb
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { PlaceRecommendationItem } from '@/types/feed'
import { getImageUrl } from '@/lib/image-utils'

interface PlaceRecommendationCardProps {
  item: PlaceRecommendationItem
  onSave?: (placeId: string) => void
  onDismiss?: () => void
  className?: string
}

export default function PlaceRecommendationCard({
  item,
  onSave,
  onDismiss,
  className = ""
}: PlaceRecommendationCardProps) {
  const [savedStates, setSavedStates] = useState<Record<string, boolean>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const handleSave = async (placeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setLoadingStates(prev => ({ ...prev, [placeId]: true }))
    
    try {
      const response = await fetch('/api/locations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: placeId })
      })
      
      if (response.ok) {
        setSavedStates(prev => ({ ...prev, [placeId]: !prev[placeId] }))
        onSave?.(placeId)
        toast.success(savedStates[placeId] ? 'Removed from saved' : 'Added to saved!')
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      } else {
        throw new Error('Failed to save place')
      }
    } catch (error) {
      console.error('Error saving place:', error)
      toast.error('Failed to save place')
    } finally {
      setLoadingStates(prev => ({ ...prev, [placeId]: false }))
    }
  }

  const handleGetDirections = (place: any, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (place.location) {
      const url = `https://maps.google.com/maps?q=${place.location.latitude},${place.location.longitude}`
      window.open(url, '_blank')
    } else {
      const url = `https://maps.google.com/maps?q=${encodeURIComponent(place.name)}`
      window.open(url, '_blank')
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDismiss?.()
  }

  const getThemeConfig = () => {
    switch (item.place.theme) {
      case 'nearby':
        return {
          gradient: 'bg-white border border-gray-100',
          iconBg: 'from-[#4ECDC4] to-[#FF6B6B]',
          icon: Navigation
        }
      case 'trending':
        return {
          gradient: 'bg-white border border-gray-100',
          iconBg: 'from-[#FF6B6B] to-[#FFE66D]',
          icon: Users
        }
      case 'weather_based':
        return {
          gradient: 'bg-white border border-gray-100',
          iconBg: 'from-[#4ECDC4] to-[#FFE66D]',
          icon: Eye
        }
      default: // hidden_gems
        return {
          gradient: 'bg-white border border-gray-100',
          iconBg: 'from-[#FFE66D] to-[#FF6B6B]',
          icon: Lightbulb
        }
    }
  }

  const themeConfig = getThemeConfig()
  const ThemeIcon = themeConfig.icon

  const getPlaceImageUrl = (place: any) => {
    // Try multiple possible image sources
    const imageUrl = getImageUrl(place.image)
    return imageUrl !== "/placeholder.svg" ? imageUrl : null
  }

  const formatPriceRange = (priceRange: string | undefined) => {
    if (!priceRange) return null
    const symbols = { 
      'budget': '$', 
      'moderate': '$$', 
      'expensive': '$$$', 
      'luxury': '$$$$',
      'low': '$',
      'medium': '$$',
      'high': '$$$'
    }
    return symbols[priceRange as keyof typeof symbols] || priceRange
  }

  // If no place data, don't render
  if (!item.place) {
    console.warn('No place data in recommendation item:', item)
    return null
  }

  const place = item.place

  return (
    <Card className={`overflow-hidden ${themeConfig.gradient} shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-gradient-to-br ${themeConfig.iconBg} rounded-full`}>
              <ThemeIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Amazing Places</h3>
              <p className="text-sm text-gray-600">Discover hidden gems nearby</p>
            </div>
          </div>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href={place.slug ? `/locations/${place.slug}` : `/locations/${place.id}`} className="block group">
            <div className="relative overflow-hidden rounded-xl bg-white hover:bg-gray-50/50 transition-all duration-300 border border-gray-100 group-hover:border-[#4ECDC4]/30 group-hover:shadow-sm">
              {/* Place image */}
              <div className="relative h-48 overflow-hidden">
                {getPlaceImageUrl(place) ? (
                  <Image
                    src={getPlaceImageUrl(place)!}
                    alt={place.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No image available</p>
                    </div>
                  </div>
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Quick actions */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleSave(place.id, e)}
                    disabled={loadingStates[place.id]}
                    className={`
                      p-2 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-300
                      ${savedStates[place.id] || place.isSaved
                        ? 'bg-[#FF6B6B]/90 text-white' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                      }
                    `}
                  >
                    {loadingStates[place.id] ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Bookmark className={`h-4 w-4 ${savedStates[place.id] || place.isSaved ? 'fill-current' : ''}`} />
                    )}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleGetDirections(place, e)}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300 border border-white/20"
                  >
                    <Navigation className="h-4 w-4" />
                  </motion.button>
                </div>
                
                {/* Status indicators */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {place.isOpen !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className={`
                        text-xs font-semibold backdrop-blur-sm border-0
                        ${place.isOpen 
                          ? 'bg-green-500/90 text-white' 
                          : 'bg-red-500/90 text-white'
                        }
                      `}
                    >
                      {place.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                  )}
                  
                  {place.distance && place.distance > 0 && (
                    <Badge variant="secondary" className="text-xs bg-black/50 text-white backdrop-blur-sm border-0">
                      {place.distance.toFixed(1)} miles
                    </Badge>
                  )}
                </div>
                
                {/* Bottom info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="font-bold text-white text-lg mb-1 group-hover:text-[#FFE66D] transition-colors">
                    {place.name}
                  </h4>
                  
                  {/* Rating and reviews - only show if real data exists */}
                  {place.rating > 0 && place.reviewCount > 0 && (
                    <div className="flex items-center gap-4 text-white/90 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{place.rating.toFixed(1)}</span>
                        <span className="text-white/70">({place.reviewCount})</span>
                      </div>
                      
                      {formatPriceRange(place.priceRange) && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatPriceRange(place.priceRange)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Price range only if no rating/reviews */}
                  {(!place.rating || place.rating === 0) && formatPriceRange(place.priceRange) && (
                    <div className="flex items-center gap-1 text-white/90 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatPriceRange(place.priceRange)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Place details */}
              <div className="p-4">
                {place.description && place.description.trim().length > 0 && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {place.description}
                  </p>
                )}
                
                {/* Categories - only show if they exist and have content */}
                {place.categories && place.categories.length > 0 && place.categories.some((cat: string) => cat && cat.trim().length > 0) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {place.categories
                      .filter((cat: string) => cat && cat.trim().length > 0)
                      .slice(0, 3)
                      .map((category, catIndex) => (
                        <Badge 
                          key={catIndex}
                          variant="outline" 
                          className="text-xs px-2 py-0.5 bg-gradient-to-r from-[#4ECDC4]/10 to-[#FF6B6B]/10 border-[#4ECDC4]/30 text-[#4ECDC4]"
                        >
                          {category}
                        </Badge>
                      ))}
                    {place.categories.filter((cat: string) => cat && cat.trim().length > 0).length > 3 && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5 text-gray-500">
                        +{place.categories.filter((cat: string) => cat && cat.trim().length > 0).length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Quick tip - only show if it exists and has content */}
                {place.quickTip && place.quickTip.trim().length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-[#FFE66D]/10 to-[#FF6B6B]/10 rounded-xl border border-[#FFE66D]/30">
                    <Lightbulb className="h-4 w-4 text-[#FF6B6B] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#FF6B6B] font-medium">
                      {place.quickTip}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </motion.div>

        {/* View all button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/map">
            <Button 
              variant="ghost" 
              className="w-full mt-4 text-[#4ECDC4] hover:text-[#4ECDC4]/80 hover:bg-[#4ECDC4]/10 rounded-xl font-semibold group"
            >
              Explore More Places
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </CardContent>
    </Card>
  )
} 