"use client"

import { useState } from "react"
import { Heart, MessageCircle, Share, Bookmark, MapPin, Camera, Users, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MobilePageContainer from "@/components/ui/mobile-page-container"

export default function MobileDemoPage() {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  const demoCards = [
    {
      title: "🏰 Hidden Castle Cafe",
      location: "Downtown Seattle",
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
      description: "A magical cafe hidden in the heart of the city with the best lavender lattes!",
      likes: 124,
      comments: 23
    },
    {
      title: "🌸 Secret Garden Rooftop",
      location: "Capitol Hill",
      image: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop",
      description: "Stunning rooftop garden with panoramic city views. Perfect for sunset photos!",
      likes: 89,
      comments: 15
    },
    {
      title: "🎨 Underground Art Gallery",
      location: "Pioneer Square",
      image: "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400&h=300&fit=crop",
      description: "A hidden gem showcasing local artists in a beautifully converted basement space.",
      likes: 67,
      comments: 8
    }
  ]

  return (
    <MobilePageContainer className="bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] p-8 mb-6 text-white overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">Mobile UX Demo</h1>
          <p className="text-white/90 text-sm">Experience the new floating navigation and enhanced mobile interactions</p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
      </div>

      {/* Navigation Demo Section */}
      <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            📱 Enhanced Mobile Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF8E53]/10 rounded-xl">
              <div className="w-10 h-10 bg-[#FF6B6B] rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">Floating Design</p>
                <p className="text-xs text-gray-600">Modern & accessible</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#4ECDC4]/10 to-[#45B7B8]/10 rounded-xl">
              <div className="w-10 h-10 bg-[#4ECDC4] rounded-lg flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">Glass Effect</p>
                <p className="text-xs text-gray-600">Backdrop blur</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            The navigation now floats above content with improved spacing, better margins, and enhanced touch interactions.
          </p>
        </CardContent>
      </Card>

      {/* Interactive Demo Cards */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Try the interactions 👆</h2>
        
        {demoCards.map((card, index) => (
          <Card key={index} className="border-0 shadow-lg bg-white/90 backdrop-blur-sm overflow-hidden">
            <div className="aspect-[4/3] relative overflow-hidden">
              <img 
                src={card.image} 
                alt={card.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute top-3 right-3">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/80 backdrop-blur-sm hover:bg-white/90 rounded-xl"
                  onClick={() => setSaved(!saved)}
                >
                  <Bookmark className={`h-4 w-4 ${saved ? 'fill-[#FF6B6B] text-[#FF6B6B]' : ''}`} />
                </Button>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-1">{card.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4" />
                    {card.location}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex items-center gap-2 hover:bg-[#FF6B6B]/10 rounded-xl p-2"
                    onClick={() => setLiked(!liked)}
                  >
                    <Heart className={`h-5 w-5 transition-all duration-300 ${liked ? 'fill-[#FF6B6B] text-[#FF6B6B] scale-110' : 'text-gray-600'}`} />
                    <span className="text-sm font-medium">{card.likes + (liked ? 1 : 0)}</span>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex items-center gap-2 hover:bg-[#4ECDC4]/10 rounded-xl p-2"
                  >
                    <MessageCircle className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium">{card.comments}</span>
                  </Button>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-gray-100 rounded-xl p-2"
                >
                  <Share className="h-5 w-5 text-gray-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Showcase */}
      <Card className="mt-8 mb-6 border-0 shadow-lg bg-gradient-to-br from-[#4ECDC4]/10 to-[#45B7B8]/10">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4 text-center">✨ Enhanced Mobile Features</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#FF6B6B] rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6 text-white" />
              </div>
              <p className="font-medium text-sm">Better Touch</p>
              <p className="text-xs text-gray-600">Larger targets</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4ECDC4] rounded-xl flex items-center justify-center mx-auto mb-2">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <p className="font-medium text-sm">Smooth Scroll</p>
              <p className="text-xs text-gray-600">iOS-like feel</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom spacing demonstration */}
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Scroll to see the floating navigation in action</p>
        <p className="text-xs mt-1">Notice the improved spacing and margins</p>
      </div>
    </MobilePageContainer>
  )
} 