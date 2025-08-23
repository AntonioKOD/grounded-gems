import { CollectionConfig } from 'payload';
import { sendPushNotification } from '@/lib/push-notifications';

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: {
    singular: 'Review',
    plural: 'Reviews',
  },
  access: {
    read: ({ req: { user } }) => {
      // Admin can read all reviews
      if (user?.role === 'admin') return true
      
      // Public can read published reviews
      return {
        status: { equals: 'published' }
      }
    },
    create: ({ req: { user } }) => !!user, // Authenticated users can create reviews
    update: ({ req: { user } }) => {
      // Admin can update any review
      if (user?.role === 'admin') return true
      
      // Users can update their own reviews
      return {
        author: { equals: user?.id }
      }
    },
    delete: () => true,
    // Ensure admin can access the collection in admin UI
    admin: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'rating', 'reviewType', 'status', 'author', 'createdAt'],
    description: 'Manage location, event, and special reviews',
    group: 'Content Management',
    pagination: {
      defaultLimit: 25,
    },
    listSearchableFields: ['title', 'content'],
  },
  fields: [
    // Basic Information
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'text', required: true,  },
    { name: 'rating', type: 'number', required: true, min: 1, max: 5 },

    // Review Target
    {
      name: 'reviewType',
      type: 'select',
      required: true,
      options: [
        { label: 'Location', value: 'location' },
        { label: 'Event',    value: 'event' },
        { label: 'Special',  value: 'special' },
      ],
    },
    { name: 'location', type: 'relationship', relationTo: 'locations' },
    { name: 'event',    type: 'relationship', relationTo: 'events' },
    { name: 'special',  type: 'relationship', relationTo: 'specials' },

    

    // Review Details
    { name: 'visitDate', type: 'date' },
    { name: 'pros',     type: 'array', fields: [{ name: 'pro',  type: 'text' }] },
    { name: 'cons',     type: 'array', fields: [{ name: 'con',  type: 'text' }] },
    { name: 'tips',     type: 'text' },
    { name: 'categories', type: 'array', fields: [{ name: 'category', type: 'text' }] },
    {
      name: 'categoryRatings',
      type: 'array',
      fields: [
        { name: 'category', type: 'text' },
        { name: 'rating',   type: 'number', min: 1, max: 5 },
      ],
    },
    {
      name: 'recommendationLevel',
      type: 'select',
      options: [
        { label: 'Not Recommended', value: 'none' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'Recommended', value: 'yes' },
        { label: 'Strongly Recommended', value: 'strong' },
      ],
    },

    // Author Information
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'isVerifiedVisit', type: 'checkbox', label: 'Verified Visit' },

    // Status Information
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending',    value: 'pending' },
        { label: 'Published',  value: 'published' },
        { label: 'Rejected',   value: 'rejected' },
        { label: 'Reported',   value: 'reported' },
      ],
      defaultValue: 'pending',
    },
    { name: 'moderationNotes', type: 'textarea', admin: { description: 'Admin-only notes' } },

    // Engagement Metrics
    { name: 'helpfulCount',    type: 'number', admin: { readOnly: true } },
    { name: 'unhelpfulCount',  type: 'number', admin: { readOnly: true } },
    { name: 'reportCount',     type: 'number', admin: { readOnly: true } },
    { name: 'usersWhoMarkedHelpful',   type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'usersWhoMarkedUnhelpful', type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'usersWhoReported',         type: 'relationship', relationTo: 'users', hasMany: true },
    
    // Related Content Relationships
    { 
      name: 'relatedPost', 
      type: 'relationship', 
      relationTo: 'posts',
      admin: {
        description: 'Post that this review is connected to'
      }
    },
    { 
      name: 'verifiedPurchase', 
      type: 'relationship', 
      relationTo: 'guide-purchases',
      admin: {
        description: 'Guide purchase that verifies this review (for guide reviews)'
      }
    },
    { 
      name: 'locationInteraction', 
      type: 'relationship', 
      relationTo: 'locationInteractions',
      admin: {
        description: 'Location interaction that triggered this review'
      }
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        // Auto-set author if not provided and user is authenticated
        if (!data.author && req.user) {
          data.author = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        if (!req.payload) return doc;

        try {
          // Handle new review creation
          if (operation === 'create' && doc.status === 'published') {
            const author = await req.payload.findByID({
              collection: 'users',
              id: doc.author,
            });

            // Notify location owner about new review
            if (doc.reviewType === 'location' && doc.location) {
              const location = await req.payload.findByID({
                collection: 'locations',
                id: doc.location,
              });

              if (location.createdBy && location.createdBy !== doc.author) {
                await req.payload.create({
                  collection: 'notifications',
                  data: {
                    recipient: location.createdBy,
                    type: 'location_reviewed',
                    title: `New review for ${location.name}`,
                    message: `${author.name} left a ${doc.rating}-star review for "${location.name}".`,
                    relatedTo: {
                      relationTo: 'locations',
                      value: doc.location,
                    },
                    actionBy: doc.author,
                    metadata: {
                      locationName: location.name,
                      rating: doc.rating,
                      reviewTitle: doc.title,
                    },
                    priority: 'normal',
                    read: false,
                  },
                });

                // Send push notification
                try {
                  await sendPushNotification(location.createdBy, {
                    title: `New review for ${location.name}`,
                    body: `${author.name} left a ${doc.rating}-star review!`,
                    data: {
                      type: 'location_reviewed',
                      locationId: doc.location,
                      reviewId: doc.id,
                    },
                    badge: 1,
                  });
                } catch (error) {
                  console.error('Error sending review push notification:', error);
                }
              }
            }

            // Notify event organizer about new review
            if (doc.reviewType === 'event' && doc.event) {
              const event = await req.payload.findByID({
                collection: 'events',
                id: doc.event,
              });

              if (event.organizer && event.organizer !== doc.author) {
                await req.payload.create({
                  collection: 'notifications',
                  data: {
                    recipient: event.organizer,
                    type: 'event_reviewed',
                    title: `New review for ${event.name}`,
                    message: `${author.name} left a ${doc.rating}-star review for "${event.name}".`,
                    relatedTo: {
                      relationTo: 'events',
                      value: doc.event,
                    },
                    actionBy: doc.author,
                    metadata: {
                      eventName: event.name,
                      rating: doc.rating,
                      reviewTitle: doc.title,
                    },
                    priority: 'normal',
                    read: false,
                  },
                });
              }
            }
          }

          // Update location stats
          if (doc.reviewType === 'location' && doc.location) {
            try {
              const { getPayload } = await import('payload')
              const config = (await import('../payload.config')).default
              const payload = await getPayload({ config })
              
              // Extract location ID (could be string or populated object)
              const locationId = typeof doc.location === 'string' ? doc.location : doc.location.id
              
              // Get all published reviews for this location
              const reviews = await payload.find({
                collection: 'reviews',
                where: {
                  and: [
                    { location: { equals: locationId } },
                    { status: { equals: 'published' } }
                  ]
                },
                limit: 1000
              })
              const publishedReviews = reviews.docs
              const reviewCount = publishedReviews.length
              const averageRating = reviewCount > 0
                ? publishedReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
                : 0
              await payload.update({
                collection: 'locations',
                id: locationId,
                data: {
                  averageRating: Math.round(averageRating * 10) / 10,
                  reviewCount
                }
              })
              console.log(`[REVIEWS HOOK] Updated location ${locationId}: rating=${averageRating}, count=${reviewCount}`)
            } catch (err) {
              console.error('[REVIEWS HOOK] Failed to update location stats:', err)
            }
          }
        } catch (error) {
          console.error('Error creating review notification:', error);
        }

        return doc;
      }
    ],
    afterDelete: [
      async ({ doc }) => {
        if (doc.reviewType === 'location' && doc.location) {
          try {
            const { getPayload } = await import('payload')
            const config = (await import('../payload.config')).default
            const payload = await getPayload({ config })
            
            // Extract location ID (could be string or populated object)
            const locationId = typeof doc.location === 'string' ? doc.location : doc.location.id
            
            // Get all published reviews for this location
            const reviews = await payload.find({
              collection: 'reviews',
              where: {
                and: [
                  { location: { equals: locationId } },
                  { status: { equals: 'published' } }
                ]
              },
              limit: 1000
            })
            const publishedReviews = reviews.docs
            const reviewCount = publishedReviews.length
            const averageRating = reviewCount > 0
              ? publishedReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
              : 0
            await payload.update({
              collection: 'locations',
              id: locationId,
              data: {
                averageRating: Math.round(averageRating * 10) / 10,
                reviewCount
              }
            })
            console.log(`[REVIEWS HOOK] Updated location ${locationId} after delete: rating=${averageRating}, count=${reviewCount}`)
          } catch (err) {
            console.error('[REVIEWS HOOK] Failed to update location stats after delete:', err)
          }
        }
      }
    ]
  },
  indexes: [
    {
      fields: ['status', 'createdAt'],
    },
    {
      fields: ['author', 'createdAt'],
    },
    {
      fields: ['reviewType', 'location'],
    },
    {
      fields: ['reviewType', 'event'],
    },
    {
      fields: ['reviewType', 'special'],
    },
    {
      fields: ['rating', 'status'],
    },
  ],
  timestamps: true,
}
