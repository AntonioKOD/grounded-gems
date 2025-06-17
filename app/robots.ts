import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.sacavia.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/*',
          '/api/*',
          '/_next/*',
          '/private/*',
          '/login',
          '/signup',
          '/reset-password',
          '/forgot-password',
          '/verify',
          '/profile/edit',
          '/add-location',
          '/post/create',
          '/events/create',
          '/bucket-list/create',
          '*.json',
          '/test-*'
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/*',
          '/api/*',
          '/_next/*',
          '/private/*',
          '/login',
          '/signup',
          '/reset-password',
          '/forgot-password',
          '/verify',
          '/profile/edit',
          '/add-location',
          '/post/create',
          '/events/create',
          '/bucket-list/create',
          '*.json',
          '/test-*'
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/admin/*',
          '/api/*',
          '/_next/*',
          '/private/*',
          '/login',
          '/signup',
          '/reset-password',
          '/forgot-password',
          '/verify',
          '/profile/edit',
          '/add-location',
          '/post/create',
          '/events/create',
          '/bucket-list/create',
          '*.json',
          '/test-*'
        ],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
} 