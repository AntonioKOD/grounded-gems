import { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'

export default async function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.sacavia.com'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/feed`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/locations`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/planner`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/explorer`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/bucket-list`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/notifications`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }
  ]

  try {
    const payload = await getPayload({ config })

    // Get published locations
    const locationsResult = await payload.find({
      collection: 'locations',
      where: {
        status: {
          equals: 'published'
        }
      },
      limit: 1000, // Adjust based on your needs
      select: {
        slug: true,
        id: true,
        updatedAt: true,
        isFeatured: true
      }
    })

    // Get published events
    const eventsResult = await payload.find({
      collection: 'events',
      where: {
        status: {
          equals: 'published'
        }
      },
      limit: 1000,
      select: {
        slug: true,
        id: true,
        updatedAt: true,
        startDate: true
      }
    })

    // Get published posts
    const postsResult = await payload.find({
      collection: 'posts',
      where: {
        status: {
          equals: 'published'
        }
      },
      limit: 1000,
      select: {
        slug: true,
        id: true,
        updatedAt: true
      }
    })

    // Get published bucket lists
    const bucketListsResult = await payload.find({
      collection: 'bucketLists',
      where: {
        isPublic: {
          equals: true
        }
      },
      limit: 1000,
      select: {
        slug: true,
        id: true,
        updatedAt: true
      }
    })

    // Add location pages
    const locationPages: MetadataRoute.Sitemap = locationsResult.docs.map((location) => ({
      url: `${baseUrl}/locations/${location.slug || location.id}`,
      lastModified: new Date(location.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: location.isFeatured ? 0.9 : 0.8,
    }))

    // Add event pages
    const eventPages: MetadataRoute.Sitemap = eventsResult.docs.map((event) => ({
      url: `${baseUrl}/events/${event.slug || event.id}`,
      lastModified: new Date(event.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: new Date(event.startDate) > new Date() ? 0.8 : 0.6, // Higher priority for upcoming events
    }))

    // Add post pages
    const postPages: MetadataRoute.Sitemap = postsResult.docs.map((post) => ({
      url: `${baseUrl}/post/${post.slug || post.id}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    // Add bucket list pages
    const bucketListPages: MetadataRoute.Sitemap = bucketListsResult.docs.map((bucketList) => ({
      url: `${baseUrl}/bucket-list/${bucketList.slug || bucketList.id}`,
      lastModified: new Date(bucketList.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))

    // Combine all pages
    return [
      ...staticPages,
      ...locationPages,
      ...eventPages,
      ...postPages,
      ...bucketListPages,
    ]

  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return static pages if dynamic generation fails
    return staticPages
  }
} 