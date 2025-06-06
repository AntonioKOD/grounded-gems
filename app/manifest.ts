import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sacavia - Guided Discovery & Authentic Journeys',
    short_name: 'Sacavia',
    description: 'Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.',
    start_url: '/',
    display: 'standalone',
    background_color: '#8B4513',
    theme_color: '#8B4513',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    categories: ['travel', 'social', 'lifestyle', 'navigation'],
    lang: 'en',
    dir: 'ltr',
    shortcuts: [
      {
        name: 'Explore Map',
        short_name: 'Map',
        description: 'Discover hidden gems near you',
        url: '/map',
        icons: [{ src: '/icon-192.png', sizes: '96x96' }]
      },
      {
        name: 'Events',
        short_name: 'Events',
        description: 'Find authentic local events',
        url: '/events',
        icons: [{ src: '/icon-192.png', sizes: '96x96' }]
      },
      {
        name: 'Feed',
        short_name: 'Feed',
        description: 'See community highlights',
        url: '/feed',
        icons: [{ src: '/icon-192.png', sizes: '96x96' }]
      }
    ]
  }
} 