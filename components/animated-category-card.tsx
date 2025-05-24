"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useAnime } from "@/components/anime-loader"

interface AnimatedCategoryCardProps {
  name: string
  icon?: React.ReactNode
  iconColor?: string
  backgroundColor?: string
  count?: number
  href: string
  index?: number
}

export default function AnimatedCategoryCard({
  name,
  icon,
  iconColor = '#FF6B6B',
  backgroundColor = '#FFF5F5',
  count,
  href,
  index = 0,
}: AnimatedCategoryCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { anime, loading } = useAnime()
  const cardRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  
  // Initial mount animation with stagger
  useEffect(() => {
    if (loading || !anime || typeof anime !== 'function') return
    
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      translateY: [15, 0],
      scale: [0.95, 1],
      easing: 'easeOutExpo',
      duration: 800,
      delay: 100 + (index * 60),
    })
  }, [index, anime, loading])
  
  // Hover effect handlers
  const handleMouseEnter = () => {
    if (!anime || typeof anime !== 'function') return
    setIsHovered(true)
    
    // Icon bounce effect
    anime({
      targets: iconRef.current,
      translateY: [0, -8, 0],
      scale: [1, 1.1, 1],
      duration: 600,
      easing: 'easeOutElastic(1, .6)',
    })
    
    // Card lift and shadow effect
    anime({
      targets: cardRef.current,
      translateY: -5,
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
      duration: 400,
      easing: 'easeOutQuad',
    })
    
    // Text effect
    anime({
      targets: textRef.current,
      translateX: 3,
      duration: 300,
      easing: 'easeOutQuad',
    })
  }
  
  const handleMouseLeave = () => {
    if (!anime || typeof anime !== 'function') return
    setIsHovered(false)
    
    // Card back to normal
    anime({
      targets: cardRef.current,
      translateY: 0,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      duration: 400,
      easing: 'easeOutQuad',
    })
    
    // Text back to normal
    anime({
      targets: textRef.current,
      translateX: 0,
      duration: 300,
      easing: 'easeOutQuad',
    })
  }
  
  return (
    <Link href={href}>
      <div
        ref={cardRef}
        className="h-28 rounded-xl relative overflow-hidden transition-all duration-300 shadow-sm"
        style={{
          backgroundColor: isHovered ? `${backgroundColor}` : 'white',
          borderWidth: '1px',
          borderColor: isHovered ? 'transparent' : '#f0f0f0',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background gradient effect on hover */}
        <div 
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${backgroundColor} 0%, white 100%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />
        
        <div className="p-4 h-full flex items-center relative z-10">
          {/* Icon */}
          <div 
            ref={iconRef}
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4"
            style={{ 
              backgroundColor: `${backgroundColor}`,
              color: iconColor,
            }}
          >
            {icon}
          </div>
          
          {/* Text Content */}
          <div ref={textRef} className="flex-1">
            <h3 className="font-medium text-gray-900">{name}</h3>
            {count !== undefined && (
              <p className="text-sm text-gray-500">
                {count} {count === 1 ? 'location' : 'locations'}
              </p>
            )}
          </div>
          
          {/* Arrow indicator - appears on hover */}
          <div 
            className="h-6 w-6 flex items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'translateX(0)' : 'translateX(10px)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: iconColor }}
            >
              <path
                d="M7 1L13 7M13 7L7 13M13 7H1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
} 