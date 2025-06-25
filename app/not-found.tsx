'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  ArrowLeft, 
  Search, 
  MapPin, 
  Users, 
  Sparkles,
  Compass,
  Navigation,
  Globe,
  TrendingUp,
  Clock,
  Heart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function NotFound() {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Popular destinations and features for suggestions
  const popularDestinations = [
    { name: 'Discover Feed', href: '/feed', icon: Sparkles, color: 'from-[#FF6B6B] to-[#4ECDC4]' },
    { name: 'Explore Places', href: '/locations', icon: MapPin, color: 'from-[#4ECDC4] to-[#FFE66D]' },
    { name: 'Find People', href: '/explorer', icon: Users, color: 'from-[#FFE66D] to-[#FF6B6B]' },
    { name: 'Weekly Features', href: '/weekly', icon: TrendingUp, color: 'from-[#FF6B6B] to-[#4ECDC4]' },
    { name: 'Recent Posts', href: '/feed?sort=recent', icon: Clock, color: 'from-[#4ECDC4] to-[#FFE66D]' },
    { name: 'Trending Now', href: '/feed?sort=trending', icon: Heart, color: 'from-[#FFE66D] to-[#FF6B6B]' },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#4ECDC4]/10 to-[#FFE66D]/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-[#FFE66D]/5 to-[#FF6B6B]/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center space-y-8"
              >
                {/* Main Error Section */}
                <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl overflow-hidden">
                  <CardContent className="p-12">
                    {/* Animated 404 Number */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 260, 
                        damping: 20,
                        delay: 0.2 
                      }}
                      className="flex justify-center mb-8"
                    >
                      <div className="relative">
                        <div className="w-32 h-32 bg-gradient-to-br from-[#FF6B6B] via-[#4ECDC4] to-[#FFE66D] rounded-full flex items-center justify-center shadow-2xl">
                          <span className="text-6xl font-bold text-white drop-shadow-lg">404</span>
                        </div>
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
                        >
                          <Compass className="w-4 h-4 text-[#FF6B6B]" />
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Error Message */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="space-y-4 mb-8"
                    >
                      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#FFE66D] bg-clip-text text-transparent">
                        Page Not Found
                      </h1>
                      <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Oops! It looks like you've wandered off the beaten path. 
                        Don't worry, even the best explorers get lost sometimes.
                      </p>
                    </motion.div>

                    {/* Search Bar */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      className="mb-8"
                    >
                      <form onSubmit={handleSearch} className="max-w-md mx-auto">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search for places, people, or posts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-6 py-4 pr-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl focus:border-[#4ECDC4] focus:outline-none focus:ring-4 focus:ring-[#4ECDC4]/20 transition-all duration-300 text-gray-700 placeholder-gray-500"
                          />
                          <button
                            type="submit"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white rounded-xl hover:shadow-lg transition-all duration-300"
                          >
                            <Search className="w-5 h-5" />
                          </button>
                        </div>
                      </form>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
                    >
                      <Button
                        asChild
                        size="lg"
                        className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Link href="/" className="flex items-center gap-2">
                          <Home className="w-5 h-5" />
                          Go Home
                        </Link>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleGoBack}
                        className="border-2 border-gray-200 hover:border-[#4ECDC4] text-gray-700 hover:text-[#4ECDC4] font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Go Back
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>

                {/* Popular Destinations */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Popular Destinations
                    </h2>
                    <p className="text-gray-600">
                      Discover amazing places and connect with your community
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {popularDestinations.map((destination, index) => {
                      const Icon = destination.icon
                      return (
                        <motion.div
                          key={destination.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 1.2 + index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Link href={destination.href}>
                            <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl bg-gradient-to-br ${destination.color} shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                                    <Icon className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-[#FF6B6B] transition-colors">
                                      {destination.name}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                      Explore and discover
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>

                {/* Help Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.4 }}
                  className="text-center"
                >
                  <Card className="bg-gradient-to-r from-[#4ECDC4]/10 to-[#FFE66D]/10 border-[#4ECDC4]/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Globe className="w-5 h-5 text-[#4ECDC4]" />
                        <span className="text-sm font-medium text-[#4ECDC4]">Need Help?</span>
                      </div>
                      <p className="text-gray-600 text-sm">
                        If you think this is an error or need assistance, 
                        <Link href="/contact" className="text-[#FF6B6B] hover:underline ml-1">
                          contact our support team
                        </Link>
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
} 