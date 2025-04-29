import { X, MapPin, Calendar, Clock, Star, ExternalLink, Phone, Globe, Share2, Heart } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Location } from "./map-data"
import Image from 'next/image'

interface LocationDetailProps {
  location: Location
  onClose: () => void
}

export default function LocationDetail({ location, onClose }: LocationDetailProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-bold">Location Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        <div className="relative h-48 w-full bg-gray-100">
          {location.imageUrl ? (
            <Image
              src={location.imageUrl || "/placeholder.svg"} 
              alt={location.name} 
              className="h-full w-full object-cover" 
            />
          ) : (
            <div 
              className="h-full w-full flex items-center justify-center"
              style={{ backgroundColor: `${getCategoryColor(location.category)}20` }}
            >
              <span 
                className="text-4xl font-bold"
                style={{ color: getCategoryColor(location.category) }}
              >
                {location.name.charAt(0)}
              </span>
            </div>
          )}
          
          <Badge 
            className="absolute top-4 right-4"
            style={{ 
              backgroundColor: getCategoryColor(location.category),
              color: location.category === 'Food' ? '#333' : 'white'
            }}
          >
            {location.category}
          </Badge>
        </div>
        
        {/* Details */}
        <div className="p-4 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
            
            {location.rating && (
              <div className="flex items-center mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 ${i < Math.floor(location.rating ?? 0) ? 'text-[#FFE66D] fill-[#FFE66D]' : 'text-gray-300'}`} 
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {location.rating} ({location.reviewCount} reviews)
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-gray-600">{location.address}</p>
              </div>
            </div>
            
            {location.eventDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-gray-600">{location.eventDate}</p>
                </div>
              </div>
            )}
            
            {location.hours && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
                <div>
                  <p className="font-medium">Hours</p>
                  <p className="text-gray-600">{location.hours}</p>
                </div>
              </div>
            )}
            
            {location.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
                <div>
                  <p className="font-medium">Phone</p>
                  <a href={`tel:${location.phone}`} className="text-[#4ECDC4] hover:underline">
                    {location.phone}
                  </a>
                </div>
              </div>
            )}
            
            {location.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
                <div>
                  <p className="font-medium">Website</p>
                  <a 
                    href={location.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#4ECDC4] hover:underline flex items-center"
                  >
                    Visit website
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
          </div>
          
          {location.description && (
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-gray-600">{location.description}</p>
            </div>
          )}
          
          {location.amenities && location.amenities.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {location.amenities.map((amenity, index) => (
                  <Badge key={index} variant="outline" className="bg-gray-50">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <Button variant="outline" className="flex-1 gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <Button className="flex-1 gap-2 ml-2 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
          <Heart className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  )
}

// Helper function to get color based on category
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Music: "#FF6B6B",
    Art: "#4ECDC4",
    Food: "#FFE66D",
    Tech: "#6B66FF",
    Wellness: "#66FFB4",
    Entertainment: "#FF66E3",
    Default: "#FF6B6B",
  }
  
  return colors[category] || colors.Default
}
