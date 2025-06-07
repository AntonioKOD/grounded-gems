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
  }
}

export function LocationStructuredData({ location }: LocationStructuredDataProps) {
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `https://www.sacavia.com/locations/${location.id}`,
      "name": location.name,
      "description": location.shortDescription || location.description,
      "url": `https://www.sacavia.com/locations/${location.id}`,
      "image": location.featuredImage?.url || location.featuredImage || "https://www.sacavia.com/og-image.png",
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
          "streetAddress": location.address.street,
          "addressLocality": location.address.city,
          "addressRegion": location.address.state,
          "postalCode": location.address.zip,
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
      "provider": {
        "@type": "Organization",
        "name": "Sacavia",
        "url": "https://www.sacavia.com"
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
  }, [location])

  return null
}

export function EventStructuredData({ event }: EventStructuredDataProps) {
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "@id": `https://www.sacavia.com/events/${event.id}`,
      "name": event.name,
      "description": event.description,
      "url": `https://www.sacavia.com/events/${event.id}`,
      "image": event.image?.url || event.image || "https://www.sacavia.com/og-image.png",
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
          "address": typeof event.location === 'object' ? event.location.address : undefined
        }
      }),
      ...(event.organizer && {
        "organizer": {
          "@type": "Person",
          "name": event.organizer.name,
          "url": `https://www.sacavia.com/profile/${event.organizer.id}`
        }
      }),
      "provider": {
        "@type": "Organization",
        "name": "Sacavia",
        "url": "https://www.sacavia.com"
      }
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [event])

  return null
}

export function PostStructuredData({ post }: PostStructuredDataProps) {
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `https://www.sacavia.com/post/${post.id}`,
      "headline": post.title || `Post by ${post.author.name}`,
      "articleBody": post.content,
      "url": `https://www.sacavia.com/post/${post.id}`,
      "datePublished": post.createdAt,
      "dateModified": post.updatedAt,
      "author": {
        "@type": "Person",
        "name": post.author.name,
        "url": `https://www.sacavia.com/profile/${post.author.id}`
      },
      "publisher": {
        "@type": "Organization",
        "name": "Sacavia",
        "url": "https://www.sacavia.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.sacavia.com/logo.svg"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://www.sacavia.com/post/${post.id}`
      },
      ...(post.media && post.media.length > 0 && {
        "image": {
          "@type": "ImageObject",
          "url": post.media[0]?.url || post.media[0],
          "caption": post.title || `Image from ${post.author.name}'s post`
        }
      })
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [post])

  return null
}

export function WebsiteStructuredData() {
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://www.sacavia.com/#website",
      "url": "https://www.sacavia.com",
      "name": "Sacavia",
      "description": "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.",
      "publisher": {
        "@type": "Organization",
        "@id": "https://www.sacavia.com/#organization"
      },
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://www.sacavia.com/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      ]
    }

    const organizationData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://www.sacavia.com/#organization",
      "name": "Sacavia",
      "url": "https://www.sacavia.com",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://www.sacavia.com/#logo",
        "url": "https://www.sacavia.com/logo.svg",
        "caption": "Sacavia Logo"
      },
      "description": "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.",
      "foundingDate": "2024",
      "sameAs": [
        "https://twitter.com/sacavia",
        "https://instagram.com/sacavia"
      ]
    }

    const websiteScript = document.createElement('script')
    websiteScript.type = 'application/ld+json'
    websiteScript.textContent = JSON.stringify(structuredData)
    document.head.appendChild(websiteScript)

    const orgScript = document.createElement('script')
    orgScript.type = 'application/ld+json'
    orgScript.textContent = JSON.stringify(organizationData)
    document.head.appendChild(orgScript)

    return () => {
      if (document.head.contains(websiteScript)) {
        document.head.removeChild(websiteScript)
      }
      if (document.head.contains(orgScript)) {
        document.head.removeChild(orgScript)
      }
    }
  }, [])

  return null
} 