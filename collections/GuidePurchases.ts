import { CollectionConfig } from 'payload'

export const GuidePurchases: CollectionConfig = {
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
        description: 'Total amount paid for the guide (0 for free guides)',
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
      name: 'paymentIntentId',
      type: 'text',
      admin: {
        description: 'Stripe Payment Intent ID',
        condition: (data) => data.paymentMethod === 'stripe',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'pending',
      required: true,
    },
    
    // Financial breakdown fields
    {
      name: 'platformFee',
      type: 'number',
      admin: {
        description: 'Platform commission fee (15% of total)',
        readOnly: true,
      },
      defaultValue: 0,
    },
    {
      name: 'stripeFee',
      type: 'number',
      admin: {
        description: 'Stripe processing fee (2.9% + $0.30)',
        readOnly: true,
      },
      defaultValue: 0,
    },
    {
      name: 'creatorEarnings',
      type: 'number',
      admin: {
        description: 'Amount earned by the guide creator',
        readOnly: true,
      },
      defaultValue: 0,
    },
    
    // Purchase metadata
    {
      name: 'purchaseDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
      },
      defaultValue: () => new Date(),
    },
    {
      name: 'downloadCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of times the guide has been downloaded/accessed',
      },
    },
    {
      name: 'lastAccessedAt',
      type: 'date',
      admin: {
        description: 'When the user last accessed this guide',
      },
    },
    
    // Refund information
    {
      name: 'refund',
      type: 'group',
      admin: {
        condition: (data) => data.status === 'refunded',
      },
      fields: [
        {
          name: 'refundId',
          type: 'text',
          admin: {
            description: 'Stripe refund ID',
          },
        },
        {
          name: 'refundAmount',
          type: 'number',
          admin: {
            description: 'Amount refunded to customer',
          },
        },
        {
          name: 'refundReason',
          type: 'select',
          options: [
            { label: 'Customer Request', value: 'customer_request' },
            { label: 'Duplicate Purchase', value: 'duplicate' },
            { label: 'Fraudulent', value: 'fraudulent' },
            { label: 'Content Issue', value: 'content_issue' },
            { label: 'Technical Issue', value: 'technical_issue' },
          ],
        },
        {
          name: 'refundedAt',
          type: 'date',
          defaultValue: () => new Date(),
        },
        {
          name: 'refundedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'Admin who processed the refund',
          },
        },
      ],
    },
    
    // Review and rating
    {
      name: 'hasReviewed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether the user has left a review for this guide',
      },
    },
    {
      name: 'purchaseRating',
      type: 'number',
      min: 1,
      max: 5,
      admin: {
        description: 'User rating for this purchase (1-5 stars)',
        condition: (data) => data.hasReviewed,
      },
    },
    
    // Analytics and tracking
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'Direct', value: 'direct' },
        { label: 'Search', value: 'search' },
        { label: 'Social Media', value: 'social' },
        { label: 'Email', value: 'email' },
        { label: 'Referral', value: 'referral' },
        { label: 'Advertisement', value: 'ad' },
      ],
      admin: {
        description: 'How the user discovered this guide',
      },
    },
    {
      name: 'deviceType',
      type: 'select',
      options: [
        { label: 'Desktop', value: 'desktop' },
        { label: 'Mobile', value: 'mobile' },
        { label: 'Tablet', value: 'tablet' },
      ],
      admin: {
        description: 'Device used for purchase',
      },
    },
  ],

  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // Set user to current user if not provided (for create operations)
        if (operation === 'create' && !data.user && req.user) {
          data.user = req.user.id
        }
        
        // Set purchase date if not provided
        if (operation === 'create' && !data.purchaseDate) {
          data.purchaseDate = new Date()
        }
        
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        // Update guide purchase stats
        try {
          const payload = req.payload
          const guideId = typeof doc.guide === 'object' ? doc.guide.id : doc.guide
          
          const guide = await payload.findByID({
            collection: 'guides',
            id: guideId,
          })
          
          if (guide) {
            const currentPurchases = guide.stats?.purchases || 0
            const currentRevenue = guide.stats?.revenue || 0
            
            await payload.update({
              collection: 'guides',
              id: guideId,
              data: {
                stats: {
                  ...guide.stats,
                  purchases: currentPurchases + 1,
                  revenue: currentRevenue + (doc.amount || 0)
                }
              }
            })
          }
        } catch (error) {
          console.error('Error updating guide purchase stats:', error)
        }
        
        // Handle status changes
        if (operation === 'update' && doc.status !== previousDoc?.status) {
          // If purchase was completed, send notification to creator
          if (doc.status === 'completed' && previousDoc?.status === 'pending') {
            try {
              const guide = await req.payload.findByID({
                collection: 'guides',
                id: doc.guide,
                depth: 1
              })
              
              if (guide && guide.author) {
                const creatorId = typeof guide.author === 'object' ? guide.author.id : guide.author
                
                await req.payload.create({
                  collection: 'notifications',
                  data: {
                    recipient: creatorId,
                    type: 'guide_purchased',
                    title: 'Guide Purchased! 🎉',
                    message: `Your guide "${guide.title}" was purchased for $${doc.amount}. You earned $${doc.creatorEarnings}!`,
                    priority: 'high',
                    relatedTo: {
                      relationTo: 'guides',
                      value: guide.id
                    }
                  }
                })
              }
            } catch (error) {
              console.error('Error creating purchase notification:', error)
            }
          }
          
          // If purchase was refunded, update creator earnings
          if (doc.status === 'refunded' && previousDoc?.status === 'completed') {
            try {
              const guide = await req.payload.findByID({
                collection: 'guides',
                id: doc.guide,
              })
              
              if (guide && guide.author) {
                const creatorId = typeof guide.author === 'object' ? guide.author.id : guide.author
                const creator = await req.payload.findByID({
                  collection: 'users',
                  id: creatorId
                })
                
                if (creator?.creatorProfile) {
                  const newTotalEarnings = Math.max(0, (creator.creatorProfile.earnings?.totalEarnings || 0) - doc.creatorEarnings)
                  const newTotalSales = Math.max(0, (creator.creatorProfile.stats?.totalSales || 0) - 1)
                  
                  await req.payload.update({
                    collection: 'users',
                    id: creatorId,
                    data: {
                      'creatorProfile.earnings.totalEarnings': newTotalEarnings,
                      'creatorProfile.stats.totalSales': newTotalSales,
                      'creatorProfile.stats.totalEarnings': newTotalEarnings
                    }
                  })
                }
              }
            } catch (error) {
              console.error('Error updating creator earnings after refund:', error)
            }
          }
        }
      },
    ],
  },
}

 