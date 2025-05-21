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

export default buildConfig({
  

  // Secret for signing tokens and encrypting data
  secret: process.env.PAYLOAD_SECRET || '',

  // Cookie prefix must match the name your middleware expects (e.g. "payload-token")
  cookiePrefix: 'payload',

  // Enable CORS and allow credentials so cookies are sent to the front end
  cors: {
    origins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
    headers: ['Content-Type', 'Authorization'],
  },

  // Whitelist auth endpoints to avoid CSRF errors
  csrf: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
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
    vercelBlobStorage({
      enabled: true,
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
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
  ],
})