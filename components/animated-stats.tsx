"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useMotionValue, useSpring } from "framer-motion"
import { MapPin, Users, Calendar, Star } from "lucide-react"

interface StatItem {
  value: number
  label: string
  icon: React.ReactNode
  suffix?: string
  prefix?: string
}

interface AnimatedStatsProps {
  title?: string
  subtitle?: string
  items: StatItem[]
  className?: string
}

function AnimatedCounter({ 
  value, 
  suffix = "", 
  prefix = "" 
}: { 
  value: number
  suffix?: string
  prefix?: string 
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    damping: 100,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [motionValue, isInView, value])

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Math.floor(latest).toLocaleString()}${suffix}`
      }
    })
  }, [springValue, prefix, suffix])

  return <span ref={ref}>{prefix}0{suffix}</span>
}

export default function AnimatedStats({ 
  title = "Join Our Growing Community",
  subtitle = "Discover and share authentic local experiences with explorers like you",
  items,
  className = ""
}: AnimatedStatsProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <section className={`py-16 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            {title}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            {subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              viewport={{ once: true }}
              className="text-center p-6 rounded-xl bg-white border border-gray-100 hover:border-[#4ECDC4]/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 text-[#FF6B6B]">
                  {item.icon}
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {isClient ? (
                  <AnimatedCounter 
                    value={item.value} 
                    suffix={item.suffix} 
                    prefix={item.prefix}
                  />
                ) : (
                  `${item.prefix || ""}${item.value.toLocaleString()}${item.suffix || ""}`
                )}
              </div>
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {item.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 