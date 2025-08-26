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
import DeviceTokens from './collections/DeviceTokens'
import { LocationPhotoSubmissions } from './collections/LocationPhotoSubmissions'
import { BusinessClaims } from './collections/BusinessClaims'
import { UserSubscriptions } from './collections/UserSubscriptions'
import { Guides } from './collections/Guides'
import { GuidePurchases } from './collections/GuidePurchases'
import { GuideReviews } from './collections/GuideReviews'
import { WeeklyFeatures } from './collections/WeeklyFeatures'
import { Payouts } from './collections/Payouts'
import Challenges from './collections/Challenges'
import ChallengeSuggestions from './collections/ChallengeSuggestions'
import ChallengeVotes from './collections/ChallengeVotes'
import { ChallengeParticipation } from './collections/ChallengeParticipation'
import { LocationFollowers } from './collections/LocationFollowers'
import { CreatorApplications } from './collections/CreatorApplications'
import { BusinessOwnerApplications } from './collections/BusinessOwnerApplications'
import { AccountDeletions } from './collections/AccountDeletions'
import { Reports } from './collections/Reports'
import { UserBlocks } from './collections/UserBlocks'
import Analytics from './collections/Analytics'
import PushSubscriptions from './collections/PushSubscriptions'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '- Sacavia',
    },
  },

  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  serverURL: process.env.NODE_ENV === 'production' 
    ? 'https://www.sacavia.com' 
    : 'http://localhost:3000', // Production URL
  // Cookie prefix must match the name your middleware expects (e.g. "payload-token")
  cookiePrefix: 'payload',

  // Enable CORS and allow credentials so cookies are sent to the front end
  cors: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000', // Mobile app dev server
    'http://localhost:8081', // Expo dev server
    'https://www.sacavia.com', // Production web app
    // Add localhost patterns for development
    ...(process.env.NODE_ENV === 'development' ? [
      'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:8081',
    ] : []),
  ],

  // Whitelist auth endpoints to avoid CSRF errors
  csrf: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000', // Mobile app dev server
    'http://localhost:8081', // Expo dev server
    'https://www.sacavia.com', // Production web app
  ],

  // Email transport using Resend
  email: resendAdapter({
    defaultFromName: 'Sacavia',
    defaultFromAddress: 'hello@sacavia.com',
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
    DeviceTokens,
    LocationPhotoSubmissions,
    BusinessClaims,
    UserSubscriptions,
    Guides,
    GuidePurchases,
    GuideReviews,
    WeeklyFeatures,
    Payouts,
    Challenges,
    ChallengeSuggestions,
    ChallengeVotes,
    ChallengeParticipation,
    LocationFollowers,
    CreatorApplications,
    BusinessOwnerApplications,
    AccountDeletions,
    Reports,
    UserBlocks,
    Analytics,
    PushSubscriptions,
  ],
})