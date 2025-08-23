import { CollectionConfig } from 'payload'
import { sendPushNotification } from '@/lib/push-notifications'

export const GuideReviews: CollectionConfig = {
  slug: 'guide-reviews',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'user', 'guide', 'rating', 'status', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      // Public can read approved reviews
      if (!user) {
        return {
          status: { equals: 'approved' }
        } as any;
      }
      
      if (user.role === 'admin') return true;
      
      return {
        or: [
          { status: { equals: 'approved' } },
          { user: { equals: user.id } }
        ]
      } as any;
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      
      // Users can only update their own reviews
      return {
        user: { equals: user.id }
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      
      // Users can only delete their own reviews
      return {
        user: { equals: user.id }
      }
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 100,
      admin: {
        description: 'A brief title for your review',
      },
    },
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
      name: 'rating',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      admin: {
        description: 'Rating from 1 to 5 stars',
      },
    },
    {
      name: 'review',
      type: 'textarea',
      required: true,
      maxLength: 1000,
      admin: {
        description: 'Your detailed review of the guide',
      },
    },
    {
      name: 'pros',
      type: 'array',
      fields: [
        {
          name: 'pro',
          type: 'text',
          required: true,
          maxLength: 100,
        },
      ],
      admin: {
        description: 'What did you like about this guide?',
      },
    },
    {
      name: 'cons',
      type: 'array',
      fields: [
        {
          name: 'con',
          type: 'text',
          required: true,
          maxLength: 100,
        },
      ],
      admin: {
        description: 'What could be improved?',
      },
    },
    {
      name: 'wouldRecommend',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Would you recommend this guide to others?',
      },
    },
    {
      name: 'usedFor',
      type: 'select',
      options: [
        { label: 'Solo Travel', value: 'solo' },
        { label: 'Couple Travel', value: 'couple' },
        { label: 'Family Travel', value: 'family' },
        { label: 'Group Travel', value: 'group' },
        { label: 'Business Travel', value: 'business' },
        { label: 'Local Exploration', value: 'local' },
      ],
      admin: {
        description: 'How did you use this guide?',
      },
    },
    {
      name: 'helpfulness',
      type: 'group',
      fields: [
        {
          name: 'helpful',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Number of users who found this review helpful',
          },
        },
        {
          name: 'notHelpful',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Number of users who found this review not helpful',
          },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Flagged', value: 'flagged' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'verifiedPurchase',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Automatically set based on purchase history',
      },
    },
    {
      name: 'moderatorNotes',
      type: 'textarea',
      admin: {
        condition: (data, siblingData, { user }) => user?.role === 'admin',
        description: 'Internal notes for moderators',
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Set user to current user if not provided
        if (operation === 'create' && !data.user && req.user) {
          data.user = req.user.id
        }
        
        // Check if user has purchased the guide (verified purchase)
        if (operation === 'create' && data.user && data.guide) {
          try {
            const purchase = await req.payload.find({
              collection: 'guide-purchases',
              where: {
                and: [
                  { user: { equals: data.user } },
                  { guide: { equals: data.guide } },
                  { status: { equals: 'completed' } }
                ]
              },
              limit: 1,
            })
            
            data.verifiedPurchase = purchase.docs.length > 0
          } catch (error) {
            console.error('Error checking purchase verification:', error)
          }
        }
        
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        if (!req.payload) return doc;

        try {
          // Handle new review creation
          if (operation === 'create') {
            const reviewer = await req.payload.findByID({
              collection: 'users',
              id: doc.user,
            });

            const guide = await req.payload.findByID({
              collection: 'guides',
              id: doc.guide,
            });

            // Notify guide creator about new review
            if (guide.creator && guide.creator !== doc.user) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: guide.creator,
                  type: 'guide_reviewed',
                  title: `New review for "${guide.title}"`,
                  message: `${reviewer.name} left a ${doc.rating}-star review for your guide "${guide.title}".`,
                  relatedTo: {
                    relationTo: 'guides',
                    value: doc.guide,
                  },
                  actionBy: doc.user,
                  metadata: {
                    guideTitle: guide.title,
                    rating: doc.rating,
                    reviewTitle: doc.title,
                  },
                  priority: 'normal',
                  read: false,
                },
              });

              // Send push notification
              try {
                await sendPushNotification(guide.creator, {
                  title: `New review for "${guide.title}"`,
                  body: `${reviewer.name} left a ${doc.rating}-star review!`,
                  data: {
                    type: 'guide_reviewed',
                    guideId: doc.guide,
                    reviewId: doc.id,
                  },
                  badge: 1,
                });
              } catch (error) {
                console.error('Error sending guide review push notification:', error);
              }
            }
          }

          // Update guide rating stats when a review is approved
          if (doc.status === 'approved') {
            try {
              const payload = req.payload
              
              // Get all approved reviews for this guide
              const reviews = await payload.find({
                collection: 'guide-reviews',
                where: {
                  and: [
                    { guide: { equals: doc.guide } },
                    { status: { equals: 'approved' } }
                  ]
                },
                limit: 0, // Get all reviews
              })
              
              if (reviews.docs.length > 0) {
                const totalRating = reviews.docs.reduce((sum, review) => sum + review.rating, 0)
                const averageRating = totalRating / reviews.docs.length
                
                await payload.update({
                  collection: 'guides',
                  id: doc.guide,
                  data: {
                    'stats.rating': Math.round(averageRating * 10) / 10, // Round to 1 decimal
                    'stats.reviewCount': reviews.docs.length,
                  },
                })
              }
            } catch (error) {
              console.error('Error updating guide rating stats:', error)
            }
          }
        } catch (error) {
          console.error('Error creating guide review notification:', error);
        }

        return doc;
      },
    ],
  },
}

 