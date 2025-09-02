import { CollectionConfig } from 'payload'

const DeviceTokens: CollectionConfig = {
  slug: 'deviceTokens',
  admin: {
    useAsTitle: 'deviceToken',
    defaultColumns: ['deviceToken', 'user', 'platform', 'isActive', 'lastUsed'],
    group: 'Notifications',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      if (user?.id) {
        return {
          user: { equals: user.id }
        }
      }
      return false
    },
    create: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return !!user?.id
    },
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      if (user?.id) {
        return {
          user: { equals: user.id }
        }
      }
      return false
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      if (user?.id) {
        return {
          user: { equals: user.id }
        }
      }
      return false
    },
  },
  fields: [
    {
      name: 'deviceToken',
      type: 'text',
      required: true,
      admin: {
        description: 'FCM device token (unique identifier)',
      },
      validate: (val: string | null | undefined) => {
        if (!val || val.length < 10) {
          return 'Device token must be at least 10 characters long'
        }
        return true
      },
    },
    {
      name: 'fcmToken',
      type: 'text',
      admin: {
        description: 'Alternative FCM token field (for compatibility)',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: {
        description: 'User associated with this device token (optional)',
      },
      hasMany: false,
    },
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
        { label: 'Web', value: 'web' },
        { label: 'Unknown', value: 'unknown' },
      ],
      defaultValue: 'unknown',
      admin: {
        description: 'Platform this device token belongs to',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      admin: {
        description: 'Whether this device token is currently active',
      },
    },
    {
      name: 'topics',
      type: 'array',
      fields: [
        {
          name: 'topic',
          type: 'text',
          required: true,
          admin: {
            description: 'Topic name for FCM topic messaging',
          },
        },
        {
          name: 'subscribedAt',
          type: 'date',
          admin: {
            description: 'When the device was subscribed to this topic',
          },
        },
      ],
      admin: {
        description: 'Topics this device is subscribed to',
      },
    },
    {
      name: 'deviceInfo',
      type: 'group',
      fields: [
        {
          name: 'model',
          type: 'text',
          admin: {
            description: 'Device model (e.g., iPhone 15, Samsung Galaxy S23)',
          },
        },
        {
          name: 'os',
          type: 'text',
          admin: {
            description: 'Operating system version (e.g., iOS 17.0, Android 14)',
          },
        },
        {
          name: 'appVersion',
          type: 'text',
          admin: {
            description: 'App version when token was registered',
          },
        },
        {
          name: 'buildNumber',
          type: 'text',
          admin: {
            description: 'App build number',
          },
        },
        {
          name: 'deviceId',
          type: 'text',
          admin: {
            description: 'Unique device identifier',
          },
        },
      ],
      admin: {
        description: 'Additional device information',
      },
    },
    {
      name: 'lastUsed',
      type: 'date',
      admin: {
        description: 'Last time this device token was used',
      },
    },
    {
      name: 'deactivatedAt',
      type: 'date',
      admin: {
        description: 'When this device token was deactivated',
      },
    },
    {
      name: 'deactivationReason',
      type: 'select',
      options: [
        { label: 'User logged out', value: 'user_logout' },
        { label: 'App uninstalled', value: 'app_uninstalled' },
        { label: 'Token expired', value: 'token_expired' },
        { label: 'Manual deactivation', value: 'manual' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Reason for deactivation',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional metadata for this device token',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        if (req.user?.id) {
          data.lastUsed = new Date().toISOString()
        }
        return data
      },
    ],
    beforeDelete: [
      ({ req, id }) => {
        console.log(`Device token ${id} deleted by user ${req.user?.id}`)
      },
    ],
  },
  indexes: [
    {
      fields: ['user', 'isActive'],
    },
    {
      fields: ['platform', 'isActive'],
    },
    {
      fields: ['lastUsed'],
    },
    {
      fields: ['topics.topic'],
    },
  ],
  timestamps: true,
}

export default DeviceTokens 