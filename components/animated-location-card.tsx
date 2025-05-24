"use client"

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Star, Heart } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAnime } from '@/components/anime-loader'

interface AnimatedLocationCardProps {
  id: string
  name: string
  description?: string
  image: string
  category?: string
  rating?: number
  distance?: number
  index?: number
}

export default function AnimatedLocationCard({
  id,
  name,
  description,
  image,
  category,
  rating = 0,
  distance,
  index = 0,
}: AnimatedLocationCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const { anime, loading } = useAnime()
  const cardRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  // Animate on initial mount with stagger based on index
  useEffect(() => {
    if (loading || !anime || typeof anime !== 'function') return
    
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      translateY: [20, 0],
      scale: [0.95, 1],
      easing: 'easeOutExpo',
      duration: 800,
      delay: 100 + (index * 100), // Staggered delay based on index
    })
  }, [index, anime, loading])

  // Handle hover animations
  const handleMouseEnter = () => {
    if (!anime || typeof anime !== 'function') return
    setIsHovered(true)
    
    anime({
      targets: imageRef.current,
      scale: 1.05,
      duration: 400,
      easing: 'easeOutQuad',
    })
    
    anime({
      targets: cardRef.current,
      translateY: -5,
      boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)',
      duration: 400,
      easing: 'easeOutQuad',
    })
  }

  const handleMouseLeave = () => {
    if (!anime || typeof anime !== 'function') return
    setIsHovered(false)
    
    anime({
      targets: imageRef.current,
      scale: 1,
      duration: 400,
      easing: 'easeOutQuad',
    })
    
    anime({
      targets: cardRef.current,
      translateY: 0,
      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
      duration: 400,
      easing: 'easeOutQuad',
    })
  }

  // Toggle save animation
  const handleSaveToggle = (e: React.MouseEvent) => {
    if (!anime || typeof anime !== 'function') return
    e.preventDefault()
    e.stopPropagation()
    
    setIsSaved(!isSaved)
    
    anime({
      targets: e.currentTarget,
      scale: [1, 1.3, 1],
      duration: 400,
      easing: 'easeOutBack',
    })
  }

  // Format distance
  const formatDistance = (distance?: number) => {
    if (!distance) return ""
    return distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`
  }

  // Generate stars
  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating - fullStars >= 0.5
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className="h-4 w-4 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />)
      }
    }
    
    return stars
  }

  return (
    <Link href={`/locations/${id}`}>
      <Card
        ref={cardRef}
        className={cn(
          "relative overflow-hidden transition-all duration-300 h-full",
          isHovered ? "shadow-lg" : "shadow-sm"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Image */}
        <div 
          ref={imageRef}
          className="h-48 bg-cover bg-center transition-all duration-300 relative"
          style={{ backgroundImage: `url(${image})` }}
        >
          {/* Category Badge */}
          {category && (
            <Badge 
              className={cn(
                "absolute top-3 left-3 bg-white/90 hover:bg-white text-gray-800 backdrop-blur-sm",
                isHovered && "animate-in fade-in slide-in-from-left-2 duration-300"
              )}
            >
              {category}
            </Badge>
          )}
          
          {/* Save Button */}
          <button
            onClick={handleSaveToggle}
            className={cn(
              "absolute top-3 right-3 p-2 rounded-full transition-all duration-300",
              isSaved 
                ? "bg-[#FF6B6B] text-white" 
                : "bg-white/90 text-gray-600 hover:bg-white"
            )}
          >
            <Heart className={cn("h-4 w-4", isSaved && "fill-white")} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{name}</h3>
          
          {/* Rating */}
          <div className="flex items-center gap-1">
            {renderStars(rating)}
            <span className="text-sm text-gray-500 ml-1">({rating.toFixed(1)})</span>
          </div>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
          )}
          
          {/* Distance */}
          {distance && (
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span>{formatDistance(distance)}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
} 