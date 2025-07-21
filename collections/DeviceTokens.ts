import { CollectionConfig } from 'payload/types'

const DeviceTokens: CollectionConfig = {
  slug: 'deviceTokens',
  admin: {
    useAsTitle: 'deviceToken',
    description: 'Device tokens for push notifications'
  },
  access: {
    read: ({ req: { user } }) => {
      // Users can only read their own device tokens
      if (user?.role === 'admin') return true
      return {
        user: {
          equals: user?.id
        }
      }
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return {
        user: {
          equals: user?.id
        }
      }
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return {
        user: {
          equals: user?.id
        }
      }
    }
  },
  fields: [
    {
      name: 'deviceToken',
      type: 'text',
      required: true,
      admin: {
        description: 'The device token from Apple Push Notification Service'
      }
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'The user who owns this device'
      }
    },
    {
      name: 'platform',
      type: 'select',
      options: [
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' }
      ],
      defaultValue: 'ios',
      admin: {
        description: 'The platform this device is running on'
      }
    },
    {
      name: 'appVersion',
      type: 'text',
      admin: {
        description: 'The version of the app installed on this device'
      }
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this device is currently active and should receive notifications'
      }
    },
    {
      name: 'lastSeen',
      type: 'date',
      admin: {
        description: 'When this device was last seen'
      }
    },
    {
      name: 'unregisteredAt',
      type: 'date',
      admin: {
        description: 'When this device was unregistered'
      }
    }
  ],
  indexes: [
    {
      name: 'deviceToken_user',
      fields: ['deviceToken', 'user']
    },
    {
      name: 'user_active',
      fields: ['user', 'isActive']
    }
  ]
}

export default DeviceTokens 