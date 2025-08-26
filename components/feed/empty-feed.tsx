import React from 'react'
import { Users, Search, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LocationEncouragementCard } from '@/components/ui/location-encouragement-card'

interface EmptyFeedProps {
  type: "personalized" | "all"
}

export default function EmptyFeed({ type }: EmptyFeedProps) {
  return (
    <div className="space-y-6">
      {/* Location Encouragement Card */}
      <LocationEncouragementCard 
        variant="default"
        className="mb-6"
        showBusinessMessage={true}
      />
      
      {/* Original Empty State */}
      <div className="text-center py-12 px-4 border rounded-lg bg-gray-50">
        {type === "personalized" ? (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-[#FF6B6B]" />
            </div>
            <h3 className="text-lg font-medium mb-2">Your personalized feed is empty</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Follow some contributors to see their posts, reviews, and recommendations in your feed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/discover">Discover People to Follow</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/explore">Explore Locations</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-[#FF6B6B]" />
            </div>
            <h3 className="text-lg font-medium mb-2">No posts found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              There are no posts available at the moment. Check back later or be the first to create content!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/add-location">Add a Location</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/explore">Explore Locations</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
