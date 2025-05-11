// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
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
  ],
  
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
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
