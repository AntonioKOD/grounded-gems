import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Locations } from './collections/Locations'
import { Events } from './collections/Events'
import { Reviews } from './collections/Reviews'
import { Specials } from './collections/Specials'
import { Subscribers } from './collections/Subscribers'
import { Posts } from './collections/Posts'
import { Notifications } from './collections/Notifications'
import { EventRSVPs } from './collections/EventRSVPs'
import { resendAdapter } from '@payloadcms/email-resend'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { SavedLocations } from './collections/SavedLocations'
import { LocationSubscriptions } from './collections/LocationSubscriptions'
import { EventRequests } from './collections/EventRequests'
import { LocationInteractions } from './collections/LocationInteractions'
import { MatchmakingSessions } from './collections/MatchmakingSessions'
import { Journeys } from './collections/Journeys'
import { BucketLists } from './collections/BucketLists'

export default buildConfig({
  

  // Secret for signing tokens and encrypting data
  secret: process.env.PAYLOAD_SECRET || '',

  // Server URL for CSRF protection - simplified without PAYLOAD_PUBLIC_SERVER_URL dependency
  serverURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'  // Simplified for development
    : 'https://groundedgems.com', // Production URL

  // Cookie prefix must match the name your middleware expects (e.g. "payload-token")
  cookiePrefix: 'payload',

  // Enable CORS and allow credentials so cookies are sent to the front end
  cors: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001', // Mobile app dev server
    'http://localhost:8081', // Expo dev server
    'https://groundedgems.com', // Production web app
    // Add localhost patterns for development
    ...(process.env.NODE_ENV === 'development' ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
    ] : []),
  ],

  // Whitelist auth endpoints to avoid CSRF errors
  csrf: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001', // Mobile app dev server
    'http://localhost:8081', // Expo dev server
    'https://groundedgems.com', // Production web app
  ],

  // Configure your database adapter
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),

  // Image processing via Sharp
  sharp,

  // Email transport using Resend
  email: resendAdapter({
    defaultFromAddress: 'info@groundedgems.com',
    defaultFromName: 'Grounded Gems',
    apiKey: process.env.RESEND_API_KEY || '',
  }),

  // Storage plugins
  plugins: [
    payloadCloudPlugin(),
    // Use Vercel Blob storage if the token is available
    ...(process.env.BLOB_READ_WRITE_TOKEN ? [
      vercelBlobStorage({
        enabled: true, // Explicitly enable
        collections: {
          [Media.slug]: true,
        },
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }),
    ] : []),
  ],

  // Collections definition
  collections: [
    Users,
    Media,
    Categories,
    Locations,
    Events,
    Reviews,
    Specials,
    Subscribers,
    Posts,
    Notifications,
    EventRSVPs,
    LocationSubscriptions,
    SavedLocations,
    EventRequests,
    LocationInteractions,
    MatchmakingSessions,
    Journeys,
    BucketLists,
  ],
})