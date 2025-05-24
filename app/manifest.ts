import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Grounded Gems - Discover Hidden Treasures',
    short_name: 'Grounded Gems',
    description: 'Discover hidden gems and authentic experiences in your local area. Connect with your community through meaningful events and places.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#FF6B6B',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    categories: ['lifestyle', 'social', 'travel', 'local', 'community'],
    lang: 'en',
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