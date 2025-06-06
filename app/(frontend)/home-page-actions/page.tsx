"use client"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

import { Compass, Plus, MapPin, Calendar, Crown, Search, Bell, Star } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import MobilePageContainer from "@/components/ui/mobile-page-container"

export default function HomePageActions() {
  const quickActions = [
    {
      title: "Explore Map",
      description: "Discover hidden gems around you",
      icon: MapPin,
      href: "/map",
      color: "from-[#4ECDC4] to-[#44B3B4]",
      bgColor: "bg-gradient-to-br from-[#4ECDC4]/10 to-[#44B3B4]/10"
    },
    {
      title: "Browse Feed",
      description: "See what's happening in your area",
      icon: Compass,
      href: "/feed",
      color: "from-[#FF6B6B] to-[#FF5555]",
      bgColor: "bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF5555]/10"
    },
    {
      title: "Upcoming Events",
      description: "Join local happenings",
      icon: Calendar,
      href: "/events",
      color: "from-[#FFE66D] to-[#FFD93D]",
      bgColor: "bg-gradient-to-br from-[#FFE66D]/10 to-[#FFD93D]/10"
    },
    {
      title: "Bucket Lists",
      description: "Track your local adventures",
      icon: Crown,
      href: "/bucket-list",
      color: "from-[#FF6B6B] to-[#4ECDC4]",
      bgColor: "bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10"
    }
  ]

  const recentActivities = [
    {
      title: "New café opened downtown",
      time: "2 hours ago",
      type: "location",
      icon: MapPin
    },
    {
      title: "Weekend farmer's market",
      time: "Tomorrow",
      type: "event",
      icon: Calendar
    },
    {
      title: "5 new reviews on your bucket list",
      time: "1 day ago",
      type: "review",
      icon: Star
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDECD7] via-white to-[#F3F9FF]">
      
      <MobilePageContainer>
        {/* Hero Section */}
        <div className="text-center py-8 px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
              Grounded Gems
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover authentic local experiences, connect with your community, and create meaningful memories.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/map">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF5555] hover:to-[#3DBDB4] text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300">
                <Compass className="w-5 h-5 mr-2" />
                Start Exploring
              </Button>
            </Link>
            <Link href="/post/create">
              <Button variant="outline" className="w-full sm:w-auto border-2 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4] hover:text-white px-8 py-3 rounded-xl font-medium transition-all duration-300">
                <Plus className="w-5 h-5 mr-2" />
                Share a Gem
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="px-4 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Link key={action.title} href={action.href}>
                <Card className={`group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-0 ${action.bgColor} backdrop-blur-sm`}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${action.color} shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="px-4 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What's Happening
          </h2>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10">
                      <activity.icon className="w-5 h-5 text-[#FF6B6B]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.time}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Navigation Demo Section */}
        <div className="px-4 mb-8 md:hidden">
          <Card className="bg-gradient-to-br from-[#FF6B6B]/5 to-[#4ECDC4]/5 border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                🎉 Enhanced Mobile Navigation
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Experience our improved mobile navigation with haptic feedback, active states, and smooth animations.
              </p>
              <div className="flex justify-center space-x-2">
                <Badge className="bg-[#4ECDC4] text-white">Touch-Friendly</Badge>
                <Badge className="bg-[#FFE66D] text-gray-800">Accessible</Badge>
                <Badge className="bg-[#FF6B6B] text-white">Modern</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center py-8 px-4">
          <p className="text-gray-500 text-sm">
            Made with ❤️ for discovering local treasures
          </p>
        </div>
      </MobilePageContainer>
    </div>
  )
} 