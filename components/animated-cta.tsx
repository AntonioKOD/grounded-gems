"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CalendarPlus, MapPin, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInView } from "react-intersection-observer"
import { useAnime } from "@/components/anime-loader"

export default function AnimatedCTA() {
  const [isHovered1, setIsHovered1] = useState(false)
  const [isHovered2, setIsHovered2] = useState(false)
  const { anime, loading } = useAnime()
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const buttonsRef = useRef<HTMLDivElement>(null)
  const bgElementsRef = useRef<HTMLDivElement>(null)
  
  // Animate on initial render when in view
  useEffect(() => {
    if (inView && !loading && anime && typeof anime === 'function') {
      // Animate background elements
      anime({
        targets: bgElementsRef.current?.children,
        opacity: [0, 0.7],
        scale: [0.5, 1],
        rotate: function() {
          return Math.random() * 20 - 10 // Random rotation between -10 and 10
        },
        delay: anime.stagger(150),
        duration: 1000,
        easing: 'easeOutElastic(1, .5)',
      })
      
      // Animate content
      anime({
        targets: contentRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: 300,
        duration: 800,
        easing: 'easeOutExpo',
      })
      
      // Animate buttons
      anime({
        targets: buttonsRef.current?.children,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(150, {start: 500}),
        duration: 800,
        easing: 'easeOutExpo',
      })
    }
  }, [inView, anime, loading])
  
  // Floating animation for background elements
  useEffect(() => {
    if (inView && !loading && anime && typeof anime === 'function' && bgElementsRef.current) {
      const elements = bgElementsRef.current.children
      
      Array.from(elements).forEach((el, i) => {
        anime({
          targets: el,
          translateX: [
            { value: Math.random() * 30 - 15, duration: Math.random() * 2000 + 3000 },
            { value: Math.random() * 30 - 15, duration: Math.random() * 2000 + 3000 }
          ],
          translateY: [
            { value: Math.random() * 30 - 15, duration: Math.random() * 2000 + 3000 },
            { value: Math.random() * 30 - 15, duration: Math.random() * 2000 + 3000 }
          ],
          easing: 'easeInOutSine',
          direction: 'alternate',
          loop: true
        })
      })
    }
  }, [inView, anime, loading])
  
  return (
    <div 
      ref={ref}
      className="py-16 px-4 overflow-hidden relative"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#f8fcfc] to-white opacity-90 z-0"></div>
      
      {/* Animated background elements */}
      <div 
        ref={bgElementsRef}
        className="absolute inset-0 pointer-events-none z-0"
      >
        <div className="absolute top-[20%] right-[15%] w-24 h-24 rounded-full bg-[#FF6B6B]/10 opacity-0"></div>
        <div className="absolute bottom-[20%] left-[10%] w-32 h-32 rounded-full bg-[#4ECDC4]/10 opacity-0"></div>
        <div className="absolute top-[60%] right-[25%] w-16 h-16 rounded-full bg-[#FF6B6B]/10 opacity-0"></div>
        <div className="absolute top-[30%] left-[20%] w-20 h-20 rounded-lg bg-[#4ECDC4]/10 opacity-0"></div>
        <div className="absolute bottom-[15%] right-[10%] w-28 h-28 rounded-lg bg-[#FF6B6B]/10 opacity-0"></div>
      </div>
      
      {/* Content container */}
      <div 
        ref={containerRef}
        className="max-w-6xl mx-auto relative z-10 rounded-2xl shadow-lg bg-white border border-gray-100/50 overflow-hidden"
      >
        <div className="py-10 px-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Text content */}
          <div 
            ref={contentRef}
            className="text-center md:text-left opacity-0"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Share Your Hidden Gems
            </h2>
            <p className="text-gray-600 max-w-lg">
              Know an amazing spot or planning a unique event? Share it with the community and help others 
              discover authentic local experiences that make every day an adventure.
            </p>
          </div>
          
          {/* Buttons */}
          <div 
            ref={buttonsRef}
            className="flex flex-col sm:flex-row gap-4"
          >
            {/* Add Event Button */}
            <Link href="/events/create">
              <Button
                className="relative overflow-hidden group"
                size="lg"
                onMouseEnter={() => setIsHovered1(true)}
                onMouseLeave={() => setIsHovered1(false)}
              >
                {/* Button background & hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] transition-all duration-300 ease-out group-hover:from-[#FF5A5A] group-hover:to-[#FF7A7A]"></div>
                
                {/* Inner content */}
                <div className="relative flex items-center">
                  <div className="flex items-center transition-transform duration-300 ease-out" 
                    style={{
                      transform: isHovered1 ? 'translateX(-5px)' : 'translateX(0)'
                    }}
                  >
                    <CalendarPlus className="mr-2 h-5 w-5" />
                    <span>Add Event</span>
                  </div>
                  <ChevronRight className={`ml-1 h-5 w-5 transition-all duration-300 ease-out opacity-0 ${isHovered1 ? 'opacity-100 translate-x-1' : ''}`} />
                </div>
              </Button>
            </Link>
            
            {/* Add Location Button */}
            <Link href="/add-location">
              <Button
                className="relative overflow-hidden group"
                size="lg"
                onMouseEnter={() => setIsHovered2(true)}
                onMouseLeave={() => setIsHovered2(false)}
                variant="outline"
              >
                {/* Button border & hover effect */}
                <div className="absolute inset-0 border-2 border-[#4ECDC4] rounded-md bg-transparent transition-all duration-300 ease-out group-hover:bg-[#4ECDC4]/5"></div>
                
                {/* Inner content */}
                <div className="relative flex items-center text-[#4ECDC4]">
                  <div className="flex items-center transition-transform duration-300 ease-out" 
                    style={{
                      transform: isHovered2 ? 'translateX(-5px)' : 'translateX(0)'
                    }}
                  >
                    <MapPin className="mr-2 h-5 w-5" />
                    <span>Add Location</span>
                  </div>
                  <ChevronRight className={`ml-1 h-5 w-5 transition-all duration-300 ease-out opacity-0 ${isHovered2 ? 'opacity-100 translate-x-1' : ''}`} />
                </div>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 