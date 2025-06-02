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

export default buildConfig({
  

  // Secret for signing tokens and encrypting data
  secret: process.env.PAYLOAD_SECRET || '',

  // Server URL for CSRF protection - this is important for mobile app authentication
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'https://groundedgems.com',

  // Cookie prefix must match the name your middleware expects (e.g. "payload-token")
  cookiePrefix: 'payload',

  // Enable CORS and allow credentials so cookies are sent to the front end
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Define allowed origins
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001', // Mobile app dev server
        'http://localhost:8081', // Expo dev server
        'https://groundedgems.com', // Production web app
      ];
      
      // Allow localhost in development
      if (process.env.NODE_ENV === 'development') {
        if (origin.includes('localhost') || origin.includes('192.168.') || origin.includes('exp://')) {
          return callback(null, true);
        }
      }
      
      // Check against allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Reject the request
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200, // Support legacy browsers
  },

  // Whitelist auth endpoints to avoid CSRF errors
  csrf: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001', // Mobile app dev server
    'http://localhost:8081', // Expo dev server
    'https://groundedgems.com', // Production web app
    // Allow all localhost and local network requests in development
    ...(process.env.NODE_ENV === 'development' ? [
      /localhost/,
      /192\.168\./,
      /exp:\/\//,
    ] : []),
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
  ],
})