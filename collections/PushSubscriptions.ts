import { CollectionConfig } from 'payload'

const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  admin: {
    useAsTitle: 'endpoint',
    group: 'Notifications',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return {
        user: { equals: user?.id }
      }
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return {
        user: { equals: user?.id }
      }
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'endpoint',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'keys',
      type: 'group',
      fields: [
        {
          name: 'p256dh',
          type: 'text',
          required: true,
        },
        {
          name: 'auth',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'userAgent',
      type: 'text',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'lastSeen',
      type: 'date',
    },
    {
      name: 'createdAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}

export default PushSubscriptions
