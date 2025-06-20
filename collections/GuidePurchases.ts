import { CollectionConfig } from 'payload/types'

const GuidePurchases: CollectionConfig = {
  slug: 'guide-purchases',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'guide', 'amount', 'status', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      
      // Users can only see their own purchases
      return {
        user: { equals: user.id }
      }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'guide',
      type: 'relationship',
      relationTo: 'guides',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description: 'Amount paid for the guide (0 for free guides)',
      },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'USD',
      maxLength: 3,
    },
    {
      name: 'paymentMethod',
      type: 'select',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Stripe', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Apple Pay', value: 'apple_pay' },
        { label: 'Google Pay', value: 'google_pay' },
      ],
      defaultValue: 'free',
    },
    {
      name: 'transactionId',
      type: 'text',
      admin: {
        description: 'Payment processor transaction ID',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'completed',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'accessExpiresAt',
      type: 'date',
      admin: {
        description: 'When access to this guide expires (leave blank for permanent access)',
      },
    },
    {
      name: 'downloadCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Number of times the guide has been downloaded/viewed',
      },
    },
    {
      name: 'lastAccessedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'When the guide was last accessed',
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // Set user to current user if not provided (for create operations)
        if (operation === 'create' && !data.user && req.user) {
          data.user = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        // Update guide purchase stats when a purchase is completed
        if (operation === 'create' && doc.status === 'completed') {
          try {
            const payload = req.payload
            const guide = await payload.findByID({
              collection: 'guides',
              id: doc.guide,
            })
            
            if (guide) {
              await payload.update({
                collection: 'guides',
                id: doc.guide,
                data: {
                  'stats.purchases': (guide.stats?.purchases || 0) + 1,
                },
              })
            }
          } catch (error) {
            console.error('Error updating guide purchase stats:', error)
          }
        }
      },
    ],
  },
}

export default GuidePurchases 