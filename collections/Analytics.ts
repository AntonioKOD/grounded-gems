import { CollectionConfig } from 'payload'

const Analytics: CollectionConfig = {
  slug: 'analytics',
  admin: {
    useAsTitle: 'type',
    group: 'Analytics',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Post Share', value: 'post_share' },
        { label: 'Post View', value: 'post_view' },
        { label: 'Post Like', value: 'post_like' },
        { label: 'Post Comment', value: 'post_comment' },
        { label: 'User Registration', value: 'user_registration' },
        { label: 'User Login', value: 'user_login' },
      ],
    },
    {
      name: 'postId',
      type: 'relationship',
      relationTo: 'posts',
      admin: {
        condition: (data) => ['post_share', 'post_view', 'post_like', 'post_comment'].includes(data.type),
      },
    },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        condition: (data) => data.type !== 'anonymous',
      },
    },
    {
      name: 'shareMethod',
      type: 'select',
      options: [
        { label: 'Native Share', value: 'native' },
        { label: 'Clipboard Copy', value: 'clipboard' },
        { label: 'Direct Link', value: 'link' },
        { label: 'Social Media', value: 'social' },
      ],
      admin: {
        condition: (data) => data.type === 'post_share',
      },
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'referrer',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Set timestamp if not provided
        if (!data.timestamp) {
          data.timestamp = new Date().toISOString()
        }
        return data
      },
    ],
  },
}

export default Analytics 