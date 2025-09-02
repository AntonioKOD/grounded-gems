import React from 'react'
import { MapPin, Building2, Users, Star, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface LocationEncouragementCardProps {
  variant?: 'default' | 'business' | 'community'
  className?: string
  showBusinessMessage?: boolean
}

export function LocationEncouragementCard({ 
  variant = 'default', 
  className = '',
  showBusinessMessage = true 
}: LocationEncouragementCardProps) {
  const variants = {
    default: {
      icon: <MapPin className="h-8 w-8" />,
      title: "Help Build Our Community",
      subtitle: "Share amazing places you've discovered",
      description: "Every location you add helps others discover hidden gems and amazing experiences. Whether it's a cozy café, scenic viewpoint, or local favorite, your contribution makes our community richer.",
      ctaText: "Add a Location",
      ctaLink: "/add-location",
      gradient: "from-[#FF6B6B]/10 via-[#4ECDC4]/10 to-[#45B7D1]/10",
      iconBg: "bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4]"
    },
    business: {
      icon: <Building2 className="h-8 w-8" />,
      title: "Are You a Business Owner?",
      subtitle: "Join our growing network",
      description: "Connect with travelers and locals who are actively seeking amazing experiences. Get discovered by people who value authentic, community-driven recommendations.",
      ctaText: "Add Your Business",
      ctaLink: "/add-location?type=business",
      gradient: "from-[#4ECDC4]/10 via-[#45B7D1]/10 to-[#96CEB4]/10",
      iconBg: "bg-gradient-to-br from-[#4ECDC4] to-[#45B7D1]"
    },
    community: {
      icon: <Users className="h-8 w-8" />,
      title: "Grow Our Local Network",
      subtitle: "Every location matters",
      description: "From hidden gems to popular spots, every location you add helps create a comprehensive guide for your community. Let's build something amazing together.",
      ctaText: "Contribute Now",
      ctaLink: "/add-location",
      gradient: "from-[#FF6B6B]/10 via-[#FFE66D]/10 to-[#4ECDC4]/10",
      iconBg: "bg-gradient-to-br from-[#FF6B6B] to-[#FFE66D]"
    }
  }

  const currentVariant = variants[variant]

  return (
    <Card className={`overflow-hidden border-0 shadow-lg ${className}`}>
      <div className={`bg-gradient-to-br ${currentVariant.gradient} p-1`}>
        <CardContent className="p-6 bg-white rounded-lg">
          <div className="flex items-start space-x-4">
            {/* Icon */}
            <div className={`${currentVariant.iconBg} p-3 rounded-xl text-white shadow-lg`}>
              {currentVariant.icon}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {currentVariant.title}
                  </h3>
                  <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  {currentVariant.subtitle}
                </p>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">
                {currentVariant.description}
              </p>

              {/* Benefits for business owners */}
              {showBusinessMessage && variant === 'default' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                  <div className="flex items-start space-x-2">
                    <Building2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-800">
                      <span className="font-semibold">Business owners:</span> Get discovered by travelers and locals. 
                      <Link href="/add-location?type=business" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
                        Add your business →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span>Community-driven</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span>Growing network</span>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-2">
                <Button asChild className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  <Link href={currentVariant.ctaLink} className="flex items-center justify-center space-x-2">
                    <span>{currentVariant.ctaText}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

// Compact version for smaller spaces
export function CompactLocationEncouragement({ className = '' }: { className?: string }) {
  return (
    <Card className={`border-2 border-dashed border-[#4ECDC4]/30 bg-gradient-to-br from-[#4ECDC4]/5 to-[#FF6B6B]/5 ${className}`}>
      <CardContent className="p-4 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <MapPin className="h-5 w-5 text-[#4ECDC4]" />
          <span className="text-sm font-semibold text-gray-700">Help grow our community</span>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Add locations to help others discover amazing places. 
          <span className="font-medium text-[#4ECDC4]"> Business owners welcome!</span>
        </p>
        <Button asChild size="sm" className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white text-xs">
          <Link href="/add-location">Add Location</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// Business-focused version
export function BusinessEncouragementCard({ className = '' }: { className?: string }) {
  return (
    <LocationEncouragementCard 
      variant="business" 
      className={className}
      showBusinessMessage={false}
    />
  )
}

// Community-focused version
export function CommunityEncouragementCard({ className = '' }: { className?: string }) {
  return (
    <LocationEncouragementCard 
      variant="community" 
      className={className}
      showBusinessMessage={false}
    />
  )
}








