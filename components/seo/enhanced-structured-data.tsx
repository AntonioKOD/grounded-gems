"use client"

import { useEffect } from 'react'

interface LocationStructuredDataProps {
  location: {
    id: string
    name: string
    description?: string
    shortDescription?: string
    address?: any
    categories?: any[]
    featuredImage?: any
    gallery?: any[]
    latitude?: number
    longitude?: number
    rating?: number
    reviewCount?: number
    priceRange?: string
    businessHours?: any[]
    contactInfo?: {
      phone?: string
      email?: string
      website?: string
    }
    amenities?: string[]
    accessibility?: {
      wheelchairAccess?: boolean
      parking?: boolean
      other?: string
    }
    slug?: string
  }
}

interface EventStructuredDataProps {
  event: {
    id: string
    name: string
    description: string
    startDate: string
    endDate?: string
    location?: any
    image?: any
    organizer?: any
    eventType?: string
    price?: number
    maxAttendees?: number
    slug?: string
  }
}

interface PostStructuredDataProps {
  post: {
    id: string
    title?: string
    content: string
    author: any
    createdAt: string
    updatedAt: string
    media?: any[]
    location?: any
    tags?: string[]
    slug?: string
  }
}

interface ReviewStructuredDataProps {
  review: {
    id: string
    title?: string
    content: string
    rating: number
    author: any
    createdAt: string
    location?: any
  }
}

export function LocationStructuredData({ location }: LocationStructuredDataProps) {
  useEffect(() => {
    // Determine the most appropriate schema type based on category
    let schemaType = "LocalBusiness"
    if (location.categories && location.categories.length > 0) {
      const category = location.categories[0].name.toLowerCase()
      if (category.includes('restaurant') || category.includes('dining') || category.includes('food')) {
        schemaType = "Restaurant"
      } else if (category.includes('hotel') || category.includes('lodging')) {
        schemaType = "Hotel"
      } else if (category.includes('store') || category.includes('shop')) {
        schemaType = "Store"
      } else if (category.includes('entertainment') || category.includes('tourist')) {
        schemaType = "TouristAttraction"
      }
    }

    const baseUrl = "https://www.sacavia.com"
    const locationUrl = `${baseUrl}/locations/${location.slug || location.id}`

    // Build opening hours in structured format
    const openingHours = location.businessHours?.map(hour => {
      if (!hour.isOpen || !hour.open || !hour.close) return null
      return `${hour.day} ${hour.open}-${hour.close}`
    }).filter(Boolean) || []

    // Process images for schema
    const images = []
    if (location.featuredImage) {
      const imageUrl = typeof location.featuredImage === 'string' 
        ? location.featuredImage 
        : location.featuredImage.url
      if (imageUrl) {
        images.push(imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`)
      }
    }
    
    // Add gallery images
    if (location.gallery && location.gallery.length > 0) {
      location.gallery.forEach(img => {
        const imageUrl = typeof img === 'string' ? img : img.url
        if (imageUrl) {
          images.push(imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`)
        }
      })
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "@id": locationUrl,
      "name": location.name,
      "description": location.shortDescription || location.description,
      "url": locationUrl,
      ...(images.length > 0 && { "image": images }),
      ...(location.latitude && location.longitude && {
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": location.latitude,
          "longitude": location.longitude
        }
      }),
      ...(location.address && {
        "address": {
          "@type": "PostalAddress",
          "streetAddress": location.address.street || "",
          "addressLocality": location.address.city || "",
          "addressRegion": location.address.state || "",
          "postalCode": location.address.zip || "",
          "addressCountry": location.address.country || "US"
        }
      }),
      ...(location.contactInfo?.phone && {
        "telephone": location.contactInfo.phone
      }),
      ...(location.contactInfo?.email && {
        "email": location.contactInfo.email
      }),
      ...(location.contactInfo?.website && {
        "url": location.contactInfo.website
      }),
      ...(openingHours.length > 0 && {
        "openingHours": openingHours
      }),
      ...(location.rating && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": location.rating,
          "reviewCount": location.reviewCount || 1,
          "bestRating": 5,
          "worstRating": 1
        }
      }),
      ...(location.priceRange && {
        "priceRange": location.priceRange
      }),
      ...(location.amenities && location.amenities.length > 0 && {
        "amenityFeature": location.amenities.map(amenity => ({
          "@type": "LocationFeatureSpecification",
          "name": amenity
        }))
      }),
      ...(location.accessibility?.wheelchairAccess && {
        "isAccessibleForFree": true
      }),
      "provider": {
        "@type": "Organization",
        "name": "Sacavia",
        "url": baseUrl
      },
      "sameAs": [locationUrl],
      ...(location.categories && location.categories.length > 0 && {
        "additionalType": location.categories.map(cat => `https://schema.org/${cat.name.replace(/\s+/g, '')}`)
      })
    }

    // Add restaurant-specific fields
    if (schemaType === "Restaurant") {
      Object.assign(structuredData, {
        "servesCuisine": location.categories?.map(cat => cat.name) || [],
        "acceptsReservations": "True" // Can be made dynamic later
      })
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [location])

  return null
}

export function EventStructuredData({ event }: EventStructuredDataProps) {
  useEffect(() => {
    const baseUrl = "https://www.sacavia.com"
    const eventUrl = `${baseUrl}/events/${event.slug || event.id}`
    
    const eventImage = event.image?.url || event.image || `${baseUrl}/og-image.png`
    const imageUrl = eventImage.startsWith('http') ? eventImage : `${baseUrl}${eventImage}`

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "@id": eventUrl,
      "name": event.name,
      "description": event.description,
      "url": eventUrl,
      "image": imageUrl,
      "startDate": event.startDate,
      ...(event.endDate && {
        "endDate": event.endDate
      }),
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      ...(event.location && {
        "location": {
          "@type": "Place",
          "name": typeof event.location === 'string' ? event.location : event.location.name,
          ...(typeof event.location === 'object' && event.location.address && {
            "address": {
              "@type": "PostalAddress",
              "streetAddress": event.location.address.street || "",
              "addressLocality": event.location.address.city || "",
              "addressRegion": event.location.address.state || "",
              "postalCode": event.location.address.zip || "",
              "addressCountry": event.location.address.country || "US"
            }
          }),
          ...(typeof event.location === 'object' && event.location.latitude && event.location.longitude && {
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": event.location.latitude,
              "longitude": event.location.longitude
            }
          })
        }
      }),
      ...(event.organizer && {
        "organizer": {
          "@type": "Person",
          "name": event.organizer.name,
          "url": `${baseUrl}/profile/${event.organizer.id}`
        }
      }),
      ...(event.price !== undefined && {
        "offers": {
          "@type": "Offer",
          "price": event.price,
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": eventUrl
        }
      }),
      ...(event.maxAttendees && {
        "maximumAttendeeCapacity": event.maxAttendees
      }),
      "provider": {
        "@type": "Organization",
        "name": "Sacavia",
        "url": baseUrl
      }
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [event])

  return null
}

export function PostStructuredData({ post }: PostStructuredDataProps) {
  useEffect(() => {
    const baseUrl = "https://www.sacavia.com"
    const postUrl = `${baseUrl}/post/${post.slug || post.id}`
    
    const postImage = post.media && post.media.length > 0 
      ? (post.media[0]?.url || post.media[0])
      : post.location?.featuredImage?.url || post.location?.featuredImage || `${baseUrl}/og-image.png`
    
    const imageUrl = typeof postImage === 'string' 
      ? (postImage.startsWith('http') ? postImage : `${baseUrl}${postImage}`)
      : `${baseUrl}/og-image.png`

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": postUrl,
      "headline": post.title || `Post by ${post.author.name}`,
      "articleBody": post.content,
      "url": postUrl,
      "datePublished": post.createdAt,
      "dateModified": post.updatedAt,
      "author": {
        "@type": "Person",
        "name": post.author.name,
        "url": `${baseUrl}/profile/${post.author.id}`
      },
      "publisher": {
        "@type": "Organization",
        "name": "Sacavia",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/logo.svg`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postUrl
      },
      "image": {
        "@type": "ImageObject",
        "url": imageUrl,
        "caption": post.title || `Image from ${post.author.name}'s post`
      },
      ...(post.tags && post.tags.length > 0 && {
        "keywords": post.tags.join(', ')
      }),
      ...(post.location && {
        "about": {
          "@type": "Place",
          "name": post.location.name,
          "url": `${baseUrl}/locations/${post.location.slug || post.location.id}`
        }
      })
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.contains(script) && document.head.removeChild(script)
    }
  }, [post])

  return null
}

export function ReviewStructuredData({ review }: ReviewStructuredDataProps) {
  useEffect(() => {
    const baseUrl = "https://www.sacavia.com"
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Review",
      "reviewBody": review.content,
      "name": review.title || `Review by ${review.author.name}`,
      "datePublished": review.createdAt,
      "author": {
        "@type": "Person",
        "name": review.author.name
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": 5,
        "worstRating": 1
      },
      ...(review.location && {
        "itemReviewed": {
          "@type": "LocalBusiness",
          "name": review.location.name,
          "url": `${baseUrl}/locations/${review.location.slug || review.location.id}`
        }
      })
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.contains(script) && document.head.removeChild(script)
    }
  }, [review])

  return null
}

export function BreadcrumbStructuredData({ items }: { items: Array<{ name: string; url: string }> }) {
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.contains(script) && document.head.removeChild(script)
    }
  }, [items])

  return null
}

export function OrganizationStructuredData() {
  useEffect(() => {
    const baseUrl = "https://www.sacavia.com"
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      "name": "Sacavia",
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "@id": `${baseUrl}/#logo`,
        "url": `${baseUrl}/logo.svg`,
        "caption": "Sacavia Logo"
      },
      "description": "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.",
      "foundingDate": "2024",
      "sameAs": [
        "https://twitter.com/sacavia",
        "https://instagram.com/sacavia"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": "English"
      }
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.contains(script) && document.head.removeChild(script)
    }
  }, [])

  return null
}

export function WebsiteStructuredData() {
  useEffect(() => {
    const baseUrl = "https://www.sacavia.com"
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      "url": baseUrl,
      "name": "Sacavia",
      "description": "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.",
      "publisher": {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`
      },
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${baseUrl}/search?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      ]
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.contains(script) && document.head.removeChild(script)
    }
  }, [])

  return null
} 