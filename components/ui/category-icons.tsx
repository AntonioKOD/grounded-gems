import { 
  Coffee, 
  UtensilsCrossed, 
  Music, 
  Trees, 
  Bike, 
  Palette, 
  Users, 
  Camera, 
  ShoppingBag,
  Heart,
  Calendar,
  Baby,
  Flower,
  Wine,
  Mountain,
  Waves,
  Building,
  MapPin,
  Star,
  Compass
} from "lucide-react"
import { ReactElement } from "react"

interface CategoryIconProps {
  categoryName: string
  categorySlug?: string
  className?: string
}

export function getCategoryIcon(name: string, slug?: string): ReactElement {
  const iconClass = "h-5 w-5"
  
  // Normalize the name and slug for comparison
  const normalizedName = name.toLowerCase()
  const normalizedSlug = slug?.toLowerCase() || ""

  // Food & Drink categories
  if (normalizedName.includes("food") || normalizedName.includes("drink") || 
      normalizedSlug.includes("food") || normalizedSlug.includes("drink") ||
      normalizedName.includes("restaurant") || normalizedName.includes("dining")) {
    return <UtensilsCrossed className={iconClass} />
  }
  
  if (normalizedName.includes("coffee") || normalizedName.includes("café") || 
      normalizedName.includes("tea") || normalizedName.includes("bakery")) {
    return <Coffee className={iconClass} />
  }
  
  if (normalizedName.includes("bar") || normalizedName.includes("wine") || 
      normalizedName.includes("brewery") || normalizedName.includes("nightlife")) {
    return <Wine className={iconClass} />
  }

  // Outdoors & Nature categories
  if (normalizedName.includes("outdoors") || normalizedName.includes("nature") ||
      normalizedName.includes("park") || normalizedName.includes("garden") ||
      normalizedName.includes("trail") || normalizedName.includes("hiking")) {
    return <Trees className={iconClass} />
  }
  
  if (normalizedName.includes("beach") || normalizedName.includes("water") ||
      normalizedName.includes("lake") || normalizedName.includes("waterfront")) {
    return <Waves className={iconClass} />
  }
  
  if (normalizedName.includes("mountain") || normalizedName.includes("lookout") ||
      normalizedName.includes("overlook") || normalizedName.includes("scenic")) {
    return <Mountain className={iconClass} />
  }

  // Arts & Culture categories
  if (normalizedName.includes("arts") || normalizedName.includes("culture") ||
      normalizedName.includes("museum") || normalizedName.includes("gallery") ||
      normalizedName.includes("art")) {
    return <Palette className={iconClass} />
  }
  
  if (normalizedName.includes("music") || normalizedName.includes("concert") ||
      normalizedName.includes("performance") || normalizedName.includes("live")) {
    return <Music className={iconClass} />
  }
  
  if (normalizedName.includes("historical") || normalizedName.includes("heritage") ||
      normalizedName.includes("landmark")) {
    return <Building className={iconClass} />
  }

  // Shopping & Markets categories
  if (normalizedName.includes("shopping") || normalizedName.includes("market") ||
      normalizedName.includes("boutique") || normalizedName.includes("retail") ||
      normalizedName.includes("store")) {
    return <ShoppingBag className={iconClass} />
  }

  // Wellness & Fitness categories
  if (normalizedName.includes("wellness") || normalizedName.includes("fitness") ||
      normalizedName.includes("spa") || normalizedName.includes("yoga") ||
      normalizedName.includes("gym") || normalizedName.includes("meditation")) {
    return <Heart className={iconClass} />
  }
  
  if (normalizedName.includes("climb") || normalizedName.includes("adventure") ||
      normalizedName.includes("sport")) {
    return <Bike className={iconClass} />
  }

  // Events & Experiences categories
  if (normalizedName.includes("event") || normalizedName.includes("experience") ||
      normalizedName.includes("festival") || normalizedName.includes("workshop") ||
      normalizedName.includes("class")) {
    return <Calendar className={iconClass} />
  }

  // Family & Kid-Friendly categories
  if (normalizedName.includes("family") || normalizedName.includes("kid") ||
      normalizedName.includes("child") || normalizedName.includes("playground") ||
      normalizedName.includes("zoo") || normalizedName.includes("aquarium")) {
    return <Baby className={iconClass} />
  }

  // Community and social categories
  if (normalizedName.includes("community") || normalizedName.includes("social")) {
    return <Users className={iconClass} />
  }

  // Photo spots and scenic locations
  if (normalizedName.includes("photo") || normalizedName.includes("scenic") ||
      normalizedName.includes("view")) {
    return <Camera className={iconClass} />
  }

  // Default icon
  return <MapPin className={iconClass} />
}

export function CategoryIcon({ categoryName, categorySlug, className }: CategoryIconProps) {
  const icon = getCategoryIcon(categoryName, categorySlug)
  
  // Clone the icon with the provided className
  if (className) {
    return <span className={className}>{icon}</span>
  }
  
  return icon
} 