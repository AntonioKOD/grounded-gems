import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: () => true,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/avif',
      'image/jpg',
      'image/jfif',
      'image/pjpeg',
      'image/pjp',
      // Video formats
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/mov',
      'video/avi',
      'video/quicktime',
      'video/x-msvideo',
    ],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'center',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
        position: 'center',
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'uploadSource',
      type: 'select',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Mobile', value: 'mobile' },
        { label: 'Admin', value: 'admin' },
      ],
      defaultValue: 'web',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'folder',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
