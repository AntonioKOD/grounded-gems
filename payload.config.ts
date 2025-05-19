// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'

import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Users }        from './collections/Users';
import { Media }        from './collections/Media';
import { Categories }   from './collections/Categories'; // ← import Categories
import { Locations }    from './collections/Locations';
import { Events }       from './collections/Events';
import { Reviews }      from './collections/Reviews';
import { Specials }     from './collections/Specials';
import { Subscribers }  from './collections/Subscribers';
import {resendAdapter} from '@payloadcms/email-resend'
import {vercelBlobStorage} from '@payloadcms/storage-vercel-blob'
import { Posts } from './collections/Posts'
import { Notifications } from './collections/Notifications'
import { EventRSVPs } from './collections/EventRSVPs';



export default buildConfig({
  email: resendAdapter({
    defaultFromAddress: 'info@groundedgems.com',
    defaultFromName: 'Grounded Gems',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
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
    EventRSVPs
  ],
  
  secret: process.env.PAYLOAD_SECRET || '',
 

  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
    vercelBlobStorage({
      enabled: true,
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
  ],
})
