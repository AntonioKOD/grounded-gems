import { CollectionConfig } from 'payload'

export const Payouts: CollectionConfig = {
  slug: 'payouts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['creator', 'amount', 'status', 'method', 'createdAt'],
    description: 'Track all creator payouts',
    group: 'Financial',
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50, 100],
    },
  },
  access: {
    read: ({ req: { user } }) => {
      // Admin can read all payouts
      const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
      if (user?.role === 'admin' || adminEmails.includes(user?.email || '')) return true
      
      // Creators can read their own payouts
      if (user) {
        return {
          creator: { equals: user.id }
        }
      }
      
      return false
    },
    create: ({ req: { user } }) => {
      // Only allow creation through API routes
      const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
      return user?.role === 'admin' || adminEmails.includes(user?.email || '')
    },
    update: ({ req: { user } }) => {
      // Only admins can update payouts
      const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
      return user?.role === 'admin' || adminEmails.includes(user?.email || '')
    },
    delete: ({ req: { user } }) => {
      // Only admins can delete payouts
      const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
      return user?.role === 'admin' || adminEmails.includes(user?.email || '')
    },
  },
  fields: [
    {
      name: 'creator',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'The creator receiving the payout',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Payout amount in USD',
      },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'usd',
      options: [
        { label: 'USD', value: 'usd' },
        { label: 'EUR', value: 'eur' },
        { label: 'GBP', value: 'gbp' },
      ],
      admin: {
        description: 'Currency of the payout',
      },
    },
    {
      name: 'method',
      type: 'select',
      required: true,
      options: [
        { label: 'Stripe Transfer', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Bank Transfer', value: 'bank' },
        { label: 'Check', value: 'check' },
        { label: 'Manual', value: 'manual' },
      ],
      admin: {
        description: 'Payout method used',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: '⏳ Pending', value: 'pending' },
        { label: '✅ Completed', value: 'completed' },
        { label: '❌ Failed', value: 'failed' },
        { label: '🔄 Processing', value: 'processing' },
        { label: '🚫 Cancelled', value: 'cancelled' },
      ],
      admin: {
        description: 'Current status of the payout',
      },
    },
    {
      name: 'transactionId',
      type: 'text',
      admin: {
        description: 'External transaction ID (Stripe transfer ID, PayPal transaction ID, etc.)',
      },
    },
    {
      name: 'stripeTransferId',
      type: 'text',
      admin: {
        description: 'Stripe transfer ID (if using Stripe)',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Additional notes about the payout',
      },
    },
    {
      name: 'processedAt',
      type: 'date',
      admin: {
        description: 'When the payout was processed',
      },
    },
    {
      name: 'estimatedArrival',
      type: 'text',
      admin: {
        description: 'Estimated arrival time (e.g., "1-2 business days")',
      },
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      admin: {
        description: 'Internal admin notes',
        position: 'sidebar',
      },
    },
    {
      name: 'relatedPurchases',
      type: 'relationship',
      relationTo: 'guide-purchases',
      hasMany: true,
      admin: {
        description: 'Related guide purchases that generated this payout',
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // Auto-set processedAt when status changes to completed
        if (data.status === 'completed' && !data.processedAt) {
          data.processedAt = new Date().toISOString()
        }
        
        // Set estimated arrival based on method
        if (!data.estimatedArrival) {
          switch (data.method) {
            case 'stripe':
              data.estimatedArrival = '1-2 business days'
              break
            case 'paypal':
              data.estimatedArrival = '1-3 business days'
              break
            case 'bank':
              data.estimatedArrival = '3-5 business days'
              break
            case 'check':
              data.estimatedArrival = '5-10 business days'
              break
            default:
              data.estimatedArrival = '3-5 business days'
          }
        }
        
        return data
      }
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        // If payout status changed to completed, update creator's pending balance
        if (doc.status === 'completed' && operation === 'update') {
          try {
            const payload = await getPayload({ config })
            
            // Get the creator
            const creator = await payload.findByID({
              collection: 'users',
              id: doc.creator
            })
            
            if (creator && creator.creatorProfile?.earnings?.pendingBalance) {
              const newPendingBalance = Math.max(0, creator.creatorProfile.earnings.pendingBalance - doc.amount)
              
              await payload.update({
                collection: 'users',
                id: doc.creator,
                data: {
                  'creatorProfile.earnings.pendingBalance': newPendingBalance
                }
              })
            }
          } catch (error) {
            console.error('Error updating creator pending balance:', error)
          }
        }
        
        return doc
      }
    ]
  },
} 