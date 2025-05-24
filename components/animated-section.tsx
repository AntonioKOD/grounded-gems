"use client"

import { useRef, useEffect, useState, ReactNode } from "react"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { useAnime } from "@/components/anime-loader"

interface AnimatedSectionProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  animation?: "fade-up" | "fade-in" | "slide-in" | "zoom-in" | "stagger" | "cascade"
  delay?: number
  threshold?: number
  viewOnce?: boolean
}

export default function AnimatedSection({
  children,
  title,
  subtitle,
  className,
  animation = "fade-up",
  delay = 0,
  threshold = 0.2,
  viewOnce = true,
}: AnimatedSectionProps) {
  const [hasAnimated, setHasAnimated] = useState(false)
  const { anime, loading } = useAnime()
  const sectionRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Intersection observer hook
  const { ref: observerRef, inView } = useInView({
    threshold,
    triggerOnce: viewOnce,
  })

  // Set both refs (for intersection observer and for anime.js)
  const setRefs = (el: HTMLDivElement) => {
    // Observer ref
    observerRef(el)
    // Anime ref
    if (sectionRef.current === null) {
      sectionRef.current = el
    }
  }

  useEffect(() => {
    if (inView && !hasAnimated && !loading && anime && typeof anime === 'function') {
      setHasAnimated(true)

      // Title animation
      if (titleRef.current) {
        anime({
          targets: titleRef.current,
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 800,
          easing: 'easeOutExpo',
          delay: delay,
        })
      }

      // Subtitle animation
      if (subtitleRef.current) {
        anime({
          targets: subtitleRef.current,
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 800,
          easing: 'easeOutExpo',
          delay: delay + 100,
        })
      }

      // Content animation
      if (contentRef.current) {
        switch (animation) {
          case "fade-up":
            anime({
              targets: contentRef.current,
              opacity: [0, 1],
              translateY: [40, 0],
              duration: 800,
              easing: 'easeOutExpo',
              delay: delay + 200,
            })
            break

          case "fade-in":
            anime({
              targets: contentRef.current,
              opacity: [0, 1],
              duration: 1000,
              easing: 'easeInOutQuad',
              delay: delay + 200,
            })
            break

          case "slide-in":
            anime({
              targets: contentRef.current,
              opacity: [0, 1],
              translateX: [-40, 0],
              duration: 800,
              easing: 'easeOutExpo',
              delay: delay + 200,
            })
            break

          case "zoom-in":
            anime({
              targets: contentRef.current,
              opacity: [0, 1],
              scale: [0.9, 1],
              duration: 800,
              easing: 'easeOutExpo',
              delay: delay + 200,
            })
            break

          case "stagger":
            anime({
              targets: contentRef.current.children,
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 800,
              delay: function(el: any, i: number) {
                return delay + 200 + (i * 100)
              },
              easing: 'easeOutExpo',
            })
            break

          case "cascade":
            anime({
              targets: contentRef.current.children,
              opacity: [0, 1],
              translateY: [20, 0],
              delay: function(el: any, i: number) {
                return delay + 200 + (i * 100)
              },
              duration: 800,
              easing: 'easeOutExpo',
            })
            break
        }
      }
    }
  }, [inView, hasAnimated, animation, delay, viewOnce, anime, loading])

  return (
    <section
      ref={setRefs}
      className={cn("py-12", className)}
    >
      {/* Section title and subtitle */}
      {(title || subtitle) && (
        <div className="mb-8 text-center max-w-3xl mx-auto px-4">
          {title && (
            <h2 
              ref={titleRef} 
              className="text-3xl md:text-4xl font-bold mb-3 opacity-0"
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p 
              ref={subtitleRef}
              className="text-lg text-gray-600 opacity-0"
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Section content */}
      <div 
        ref={contentRef}
        className={cn(
          "opacity-0",
          animation !== "stagger" && animation !== "cascade" && "w-full"
        )}
      >
        {children}
      </div>
    </section>
  )
} 