import { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { sendPushNotification } from '@/lib/push-notifications'

export const Guides: CollectionConfig = {
  slug: 'guides',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'creator', 'status', 'createdAt'],
    description: 'Manage travel guides created by users',
    group: 'Content Management',
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50, 100],
    },
    enableRichTextRelationship: true,
    enableRichTextLink: true,
  },
  access: {
    read: ({ req: { user } }) => {
      // Admin can read all guides
      const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
      if (user?.role === 'admin' || adminEmails.includes(user?.email || '')) return true

      // Public can read published guides
      if (!user) {
        return {
          status: { equals: 'published' }
        } as any
      }

      // Creators can read their own guides and published guides
      return {
        or: [
          { status: { equals: 'published' } },
          { creator: { equals: user.id } }
        ]
      } as any
    },
    create: ({ req: { user } }) => {
      const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
      return user?.role === 'admin' || user?.role === 'creator' || user?.role === 'user' || adminEmails.includes(user?.email || '')
    },
    update: ({ req: { user }, data }) => {
      console.log(`🔒 Access control - Update check for user: ${user?.email}`)
      console.log(`🔒 User role: ${user?.role}`)
      console.log(`🔒 Data being updated:`, data ? Object.keys(data) : 'No data')
      
              // Admin can update any guide and any field
        const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
        if (user?.role === 'admin' || adminEmails.includes(user?.email || '')) {
          console.log(`✅ Admin access granted for update`)
          return true
        }
      
      // Users can update their own guides
      console.log(`🔍 Checking creator access for user: ${user?.id}`)
      return {
        creator: { equals: user?.id }
      }
    },
    delete: ({ req: { user } }) => {
              // Admin can delete any guide
        const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
        if (user?.role === 'admin' || adminEmails.includes(user?.email || '')) return true
      // Users can delete their own guides
      return {
        creator: { equals: user?.id }
      }
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'URL-friendly version of the title (auto-generated)',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      maxLength: 500,
      admin: {
        description: 'A compelling description that will attract users to your guide',
      },
    },
    {
      name: 'creator',
      type: 'relationship',
      relationTo: 'users',
      required: false, // Temporarily optional for testing
      admin: {
        position: 'sidebar',
        description: 'The user who created this guide',
      },
    },
    {
      name: 'primaryLocation',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      admin: {
        description: 'The main location this guide covers (used for categorization and discovery)',
      },
    },
    {
      name: 'locations',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'location',
          type: 'relationship',
          relationTo: 'locations',
          required: true,
        },
        {
          name: 'order',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'description',
          type: 'textarea',
          maxLength: 500,
          admin: {
            description: 'What should travelers know about this location?',
          },
        },
        {
          name: 'estimatedTime',
          type: 'number',
          required: true,
          defaultValue: 60,
          min: 15,
          max: 480,
          admin: {
            description: 'Estimated time to spend here (in minutes)',
          },
        },
        {
          name: 'tips',
          type: 'array',
          fields: [
            {
              name: 'tip',
              type: 'text',
              required: true,
              maxLength: 200,
            },
          ],
          admin: {
            description: 'Location-specific tips',
          },
        },
        {
          name: 'isRequired',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Is this location essential to the guide?',
          },
        },
      ],
      admin: {
        description: 'All locations included in this guide',
      },
    },
    {
      name: 'difficulty',
      type: 'select',
      required: true,
      options: [
        { label: 'Easy - Accessible to everyone', value: 'easy' },
        { label: 'Moderate - Some walking/planning required', value: 'moderate' },
        { label: 'Challenging - Requires good fitness/preparation', value: 'challenging' },
        { label: 'Expert - For experienced travelers', value: 'expert' },
      ],
    },
    {
      name: 'duration',
      type: 'group',
      fields: [
        {
          name: 'value',
          type: 'number',
          required: true,
          min: 1,
          max: 30,
        },
        {
          name: 'unit',
          type: 'select',
          required: true,
          options: [
            { label: 'Hours', value: 'hours' },
            { label: 'Days', value: 'days' },
          ],
        },
      ],
    },
    {
      name: 'pricing',
      type: 'group',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'free',
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Paid', value: 'paid' },
            { label: 'Pay What You Want', value: 'pwyw' },
          ],
        },
        {
          name: 'price',
          type: 'number',
          admin: {
            description: 'Price for paid guides (leave empty for free guides)',
          },
        },
        {
          name: 'suggestedPrice',
          type: 'number',
          admin: {
            description: 'Suggested minimum price for pay-what-you-want guides',
          },
        },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
        ],
      }),
      admin: {
        description: 'The main content of your guide - include detailed recommendations, tips, and insights',
      },
    },
    {
      name: 'highlights',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 10,
      fields: [
        {
          name: 'highlight',
          type: 'text',
          required: true,
          maxLength: 150,
        },
      ],
      admin: {
        description: 'Key highlights that make your guide special (1-10 bullet points)',
      },
    },
    {
      name: 'itinerary',
      type: 'array',
      fields: [
        {
          name: 'time',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g., "9:00 AM" or "Morning"',
          },
        },
        {
          name: 'activity',
          type: 'text',
          required: true,
          maxLength: 100,
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          maxLength: 300,
        },
        {
          name: 'location',
          type: 'text',
          admin: {
            description: 'Specific location/address for this activity',
          },
        },
        {
          name: 'tips',
          type: 'textarea',
          maxLength: 200,
          admin: {
            description: 'Additional tips for this activity',
          },
        },
      ],
      admin: {
        description: 'Optional detailed itinerary for your guide',
      },
    },
    {
      name: 'recommendations',
      type: 'group',
      fields: [
        {
          name: 'restaurants',
          type: 'array',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'type',
              type: 'text',
              admin: {
                description: 'e.g., Italian, Fast Food, Fine Dining',
              },
            },
            {
              name: 'recommendation',
              type: 'textarea',
              required: true,
              maxLength: 200,
            },
            {
              name: 'priceRange',
              type: 'select',
              options: [
                { label: '$', value: 'budget' },
                { label: '$$', value: 'moderate' },
                { label: '$$$', value: 'expensive' },
                { label: '$$$$', value: 'luxury' },
              ],
            },
          ],
        },
        {
          name: 'attractions',
          type: 'array',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'type',
              type: 'text',
              admin: {
                description: 'e.g., Museum, Park, Viewpoint',
              },
            },
            {
              name: 'recommendation',
              type: 'textarea',
              required: true,
              maxLength: 200,
            },
            {
              name: 'bestTime',
              type: 'text',
              admin: {
                description: 'Best time to visit',
              },
            },
          ],
        },
        {
          name: 'shopping',
          type: 'array',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'type',
              type: 'text',
              admin: {
                description: 'e.g., Boutique, Market, Mall',
              },
            },
            {
              name: 'recommendation',
              type: 'textarea',
              required: true,
              maxLength: 200,
            },
          ],
        },
      ],
    },
    {
      name: 'insiderTips',
      type: 'array',
      fields: [
        {
          name: 'category',
          type: 'select',
          required: true,
          options: [
            { label: '💡 Local Secrets', value: 'secrets' },
            { label: '⏰ Best Times', value: 'timing' },
            { label: '💰 Money Saving', value: 'savings' },
            { label: '🚗 Getting Around', value: 'transport' },
            { label: '📱 Apps & Tools', value: 'tools' },
            { label: '🎯 Pro Tips', value: 'protips' },
            { label: '⚠️ Things to Avoid', value: 'avoid' },
          ],
        },
        {
          name: 'tip',
          type: 'textarea',
          required: true,
          maxLength: 300,
        },
        {
          name: 'priority',
          type: 'select',
          required: true,
          defaultValue: 'medium',
          options: [
            { label: '🔥 Essential', value: 'high' },
            { label: '⭐ Helpful', value: 'medium' },
            { label: '💡 Nice to Know', value: 'low' },
          ],
        },
      ],
      admin: {
        description: 'Your insider knowledge that makes this guide valuable',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: false,
      admin: {
        description: 'Main image for your guide (will be used in listings)',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      validate: (value: any) => {
        if (!value) {
          return 'Status is required'
        }
        
        const validStatuses = ['draft', 'review', 'published', 'archived']
        if (!validStatuses.includes(value)) {
          return `Status must be one of: ${validStatuses.join(', ')}`
        }
        
        return true
      },
      options: [
        { 
          label: '📝 Draft - Work in progress, not visible to public', 
          value: 'draft' 
        },
        { 
          label: '⏳ Under Review - Submitted for approval', 
          value: 'review' 
        },
        { 
          label: '✅ Published - Live on marketplace', 
          value: 'published' 
        },
        { 
          label: '📦 Archived - Hidden from marketplace', 
          value: 'archived' 
        },
      ],
      admin: {
        position: 'sidebar',
        description: 'Control guide visibility and publication status. Set to Published to make guides visible in marketplace.',
      },
      hooks: {
        beforeValidate: [
          ({ value, req }) => {
            console.log(`🔧 Status field validation - Value: ${value}, User: ${req?.user?.email}`)
            return value
          }
        ],
        beforeChange: [
          ({ value, req }) => {
            console.log(`🔧 Status field change - Value: ${value}, User: ${req?.user?.email}`)
            return value
          }
        ],
        afterRead: [
          ({ value, req }) => {
            console.log(`🔧 Status field read - Value: ${value}, User: ${req?.user?.email}`)
            return value
          }
        ]
      }
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
          maxLength: 30,
        },
      ],
      admin: {
        description: 'Tags to help users find your guide',
      },
    },
    {
      name: 'language',
      type: 'select',
      required: true,
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' },
        { label: 'German', value: 'de' },
        { label: 'Italian', value: 'it' },
        { label: 'Portuguese', value: 'pt' },
        { label: 'Japanese', value: 'ja' },
        { label: 'Korean', value: 'ko' },
        { label: 'Chinese', value: 'zh' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stats',
      type: 'group',
      admin: {
        position: 'sidebar',
        readOnly: false, // Allow editing for admins
      },
      fields: [
        {
          name: 'views',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: false, // Allow editing for admins
            description: 'Number of views this guide has received',
          },
        },
        {
          name: 'purchases',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: false, // Allow editing for admins
            description: 'Number of times this guide has been purchased',
          },
        },
        {
          name: 'rating',
          type: 'number',
          admin: {
            readOnly: false, // Allow editing for admins
            description: 'Average rating (calculated from reviews)',
          },
        },
        {
          name: 'reviewCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: false, // Allow editing for admins
            description: 'Number of reviews this guide has received',
          },
        },
      ],
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          maxLength: 60,
          admin: {
            description: 'SEO title (leave blank to use guide title)',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          maxLength: 160,
          admin: {
            description: 'SEO description (leave blank to use guide description)',
          },
        },
        {
          name: 'keywords',
          type: 'text',
          admin: {
            description: 'Comma-separated keywords for SEO',
          },
        },
      ],
    },
    {
      name: 'adminNotes',
      type: 'group',
      admin: {
        position: 'sidebar',
        description: 'Internal notes for admin use only',
      },
      fields: [
        {
          name: 'moderationNotes',
          type: 'textarea',
          admin: {
            description: 'Internal notes for moderation purposes',
          },
        },
        {
          name: 'featured',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Mark this guide as featured (admin only)',
          },
        },
        {
          name: 'priority',
          type: 'select',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Normal', value: 'normal' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ],
          defaultValue: 'normal',
          admin: {
            description: 'Admin priority level for this guide',
          },
        },
        {
          name: 'lastReviewed',
          type: 'date',
          admin: {
            description: 'When this guide was last reviewed by admin',
          },
        },
        {
          name: 'reviewedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'Admin who last reviewed this guide',
          },
        },
      ],
    },
    
    // Related Content Relationships
    { 
      name: 'relatedPosts', 
      type: 'relationship', 
      relationTo: 'posts',
      hasMany: true,
      admin: {
        description: 'Posts that are related to or promoting this guide'
      }
    },
    { 
      name: 'relatedEvents', 
      type: 'relationship', 
      relationTo: 'events',
      hasMany: true,
      admin: {
        description: 'Events that are based on or promoting this guide'
      }
    },
  ],
  timestamps: true,
  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        console.log(`🔧 Guide beforeValidate hook - Operation: ${operation}`)
        console.log(`🔧 User context:`, req?.user ? `${req.user.role} (${req.user.email})` : 'No user context')
        
        // Only set default status on creation, not on updates
        if (operation === 'create' && data && (data.status === undefined || data.status === null)) {
          data.status = 'draft'
        }
        
        return data
      },
    ],
    beforeChange: [
      ({ data, req, operation }) => {
        try {
          if (!data) return data
          
          console.log(`🔧 Guide beforeChange hook - Operation: ${operation}`)
          console.log(`🔧 Status being set to: ${data.status}`)
          console.log(`🔧 User context:`, req?.user ? `${req.user.role} (${req.user.email})` : 'No user context')
          
          // Auto-generate slug if not provided
          if (!data.slug && data.title) {
            data.slug = data.title
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim()
          }
          
          // Set creator if not provided (only on creation)
          if (operation === 'create' && !data.creator && req?.user) {
            data.creator = req.user.id
          }
          
          // Auto-generate SEO fields if not provided
          if (!data.meta?.title && data.title) {
            if (!data.meta) data.meta = {}
            data.meta.title = data.title
          }
          
          if (!data.meta?.description && data.description) {
            if (!data.meta) data.meta = {}
            data.meta.description = data.description
          }
          
          // Update admin review information - check for admin email directly
          const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
          const isAdmin = adminEmails.includes(req?.user?.email || '') || req?.user?.role === 'admin'
          if (isAdmin && data.status) {
            if (!data.adminNotes) data.adminNotes = {}
            data.adminNotes.lastReviewed = new Date().toISOString()
            data.adminNotes.reviewedBy = req.user?.id || 'admin'
            console.log(`🔧 Admin review info updated for: ${req.user?.email || 'admin'}`)
          }
          
          console.log(`✅ Guide beforeChange completed - Final Status: ${data.status}`)
          return data
        } catch (error) {
          console.error('❌ Error in beforeChange hook:', error)
          return data
        }
      },
    ],
    afterRead: [
      ({ doc, req }) => {
        // Log when guides are read
        const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
        const isAdmin = adminEmails.includes(req?.user?.email || '') || req?.user?.role === 'admin'
        if (isAdmin) {
          console.log(`📖 Guide read - ID: ${doc.id}, Status: ${doc.status}`)
        }
        return doc
      }
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (!req.payload) return doc;

        try {
          // Handle guide publication
          if (operation === 'update' && doc.status === 'published') {
            const creator = await req.payload.findByID({
              collection: 'users',
              id: doc.creator,
            });

            // Notify creator about guide publication
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: doc.creator,
                type: 'guide_published',
                title: `Your guide "${doc.title}" is now live!`,
                message: `Your guide "${doc.title}" has been published and is now available to travelers.`,
                relatedTo: {
                  relationTo: 'guides',
                  value: doc.id,
                },
                metadata: {
                  guideTitle: doc.title,
                  guideId: doc.id,
                },
                priority: 'high',
                read: false,
              },
            });

            // Send push notification
            try {
              await sendPushNotification(doc.creator, {
                title: `Guide published: ${doc.title}`,
                body: `Your guide is now live and available to travelers!`,
                data: {
                  type: 'guide_published',
                  guideId: doc.id,
                },
                badge: 1,
              });
            } catch (error) {
              console.error('Error sending guide publication push notification:', error);
            }
          }

          // Handle guide featured status
          if (operation === 'update' && doc.adminNotes?.featured === true) {
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: doc.creator,
                type: 'guide_featured',
                title: `Your guide "${doc.title}" is now featured!`,
                message: `Congratulations! Your guide "${doc.title}" has been selected as a featured guide and will get extra visibility.`,
                relatedTo: {
                  relationTo: 'guides',
                  value: doc.id,
                },
                metadata: {
                  guideTitle: doc.title,
                  guideId: doc.id,
                },
                priority: 'high',
                read: false,
              },
            });
          }

          // Log successful changes
          const adminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com']
          const isAdmin = adminEmails.includes(req?.user?.email || '') || req?.user?.role === 'admin'
          if (isAdmin) {
            console.log(`✅ Guide ${operation} - ID: ${doc.id}, Status: ${doc.status}`)
          }
        } catch (error) {
          console.error('Error creating guide notification:', error);
        }

        return doc
      }
    ],
  },
} 