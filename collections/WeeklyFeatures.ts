import { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const WeeklyFeatures: CollectionConfig = {
  slug: 'weekly-features',
  labels: {
    singular: 'Weekly Feature',
    plural: 'Weekly Features',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      return user?.role === 'admin' || user?.role === 'moderator'
    },
    update: ({ req: { user } }) => {
      return user?.role === 'admin' || user?.role === 'moderator'
    },
    delete: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'theme', 'weekNumber', 'year', 'status', 'isActive'],
    group: 'Content',
  },
  fields: [
    // Basic Information
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Main title for this weekly feature (e.g., "Monday Motivation", "Weekend Warriors")',
      },
    },
    {
      name: 'subtitle',
      type: 'text',
      admin: {
        description: 'Short subtitle or tagline',
      },
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      admin: {
        description: 'Detailed description of this weekly feature',
      },
    },
    
    // Theme and Timing
    {
      name: 'theme',
      type: 'select',
      required: true,
      options: [
        { label: 'Sunday Serenity', value: 'sunday_serenity' },
        { label: 'Monday Motivation', value: 'monday_motivation' },
        { label: 'Tuesday Tips', value: 'tuesday_tips' },
        { label: 'Wednesday Wanderlust', value: 'wednesday_wanderlust' },
        { label: 'Thursday Throwback', value: 'thursday_throwback' },
        { label: 'Friday Fun', value: 'friday_fun' },
        { label: 'Weekend Warriors', value: 'weekend_warriors' },
      ],
      admin: {
        description: 'Theme that determines the day of the week this feature appears',
      },
    },
    {
      name: 'weekNumber',
      type: 'number',
      required: true,
      min: 1,
      max: 53,
      admin: {
        description: 'Week number of the year (1-53)',
      },
    },
    {
      name: 'year',
      type: 'number',
      required: true,
      defaultValue: () => new Date().getFullYear(),
      admin: {
        description: 'Year this weekly feature is for',
      },
    },
    
    // Content
    {
      name: 'contentType',
      type: 'select',
      required: true,
      defaultValue: 'places',
      options: [
        { label: 'Places', value: 'places' },
        { label: 'Stories', value: 'stories' },
        { label: 'Tips', value: 'tips' },
        { label: 'Challenges', value: 'challenges' },
        { label: 'Mixed', value: 'mixed' },
      ],
      admin: {
        description: 'Type of content featured this week',
      },
    },
    
    // Featured Content
    {
      name: 'featuredLocations',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: true,
      admin: {
        description: 'Locations to feature this week',
        condition: (data) => data.contentType === 'places' || data.contentType === 'mixed',
      },
    },
    {
      name: 'featuredPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      admin: {
        description: 'Posts/stories to feature this week',
        condition: (data) => data.contentType === 'stories' || data.contentType === 'mixed',
      },
    },
    {
      name: 'featuredGuides',
      type: 'relationship',
      relationTo: 'guides',
      hasMany: true,
      admin: {
        description: 'Guides to feature this week',
        condition: (data) => data.contentType === 'tips' || data.contentType === 'mixed',
      },
    },
    
    // Challenge Content
    {
      name: 'challenge',
      type: 'group',
      admin: {
        condition: (data) => data.contentType === 'challenges' || data.contentType === 'mixed',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: {
            description: 'Challenge title (e.g., "Weekend Explorer Challenge")',
          },
        },
        {
          name: 'description',
          type: 'text',
          admin: {
            description: 'Challenge description',
          },
        },
        {
          name: 'difficulty',
          type: 'select',
          options: [
            { label: 'Easy', value: 'easy' },
            { label: 'Medium', value: 'medium' },
            { label: 'Hard', value: 'hard' },
          ],
        },
        {
          name: 'duration',
          type: 'text',
          admin: {
            description: 'How long the challenge lasts (e.g., "3 days", "1 week")',
          },
        },
        {
          name: 'reward',
          type: 'group',
          fields: [
            {
              name: 'type',
              type: 'select',
              options: [
                { label: 'Badge', value: 'badge' },
                { label: 'Points', value: 'points' },
                { label: 'Discount', value: 'discount' },
                { label: 'Special Access', value: 'access' },
              ],
            },
            {
              name: 'value',
              type: 'text',
              admin: {
                description: 'Reward description or value',
              },
            },
          ],
        },
        {
          name: 'targetCount',
          type: 'number',
          admin: {
            description: 'Target number to complete (e.g., 3 places to visit)',
          },
        },
        {
          name: 'expiresAt',
          type: 'date',
          admin: {
            description: 'When this challenge expires',
          },
        },
      ],
    },
    
    // Visual Content
    {
      name: 'coverImage',
      type: 'relationship',
      relationTo: 'media',
      admin: {
        description: 'Main cover image for this weekly feature',
      },
    },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
      ],
      admin: {
        description: 'Additional images for the weekly feature',
      },
    },
    
    // Targeting and Personalization
    {
      name: 'targetCategories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        description: 'Categories this weekly feature targets (helps with personalization)',
      },
    },
    {
      name: 'targetRegions',
      type: 'array',
      fields: [
        {
          name: 'region',
          type: 'text',
        },
      ],
      admin: {
        description: 'Geographic regions this feature targets (e.g., "Boston", "New England")',
      },
    },
    
    // Analytics and Engagement
    {
      name: 'analytics',
      type: 'group',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'viewCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'engagementCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'participantCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'shareCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    
    // Status and Publishing
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this weekly feature is currently active',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        description: 'When this weekly feature was published',
      },
    },
    {
      name: 'scheduledFor',
      type: 'date',
      admin: {
        description: 'When this weekly feature should be published (for scheduled posts)',
        condition: (data) => data.status === 'scheduled',
      },
    },
    
    // Creator Information
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
    
    // SEO and Meta
    {
      name: 'meta',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: {
            description: 'SEO title',
          },
        },
        {
          name: 'description',
          type: 'text',
          admin: {
            description: 'SEO description',
          },
        },
        {
          name: 'keywords',
          type: 'text',
          admin: {
            description: 'SEO keywords',
          },
        },
      ],
    },
  ],
  
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // Set creator on create
        if (operation === 'create' && req.user) {
          data.createdBy = req.user.id
        }
        
        // Set published date when status changes to published
        if (data.status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date()
        }
        
        // Generate unique identifier for this week
        if (data.weekNumber && data.year && data.theme) {
          data.slug = `${data.theme}-week-${data.weekNumber}-${data.year}`
        }
        
        return data
      },
    ],
    
    afterChange: [
      async ({ doc, operation, req }) => {
        // Send notifications when a new weekly feature is published
        if (operation === 'create' && doc.status === 'published') {
          // Here you could send push notifications to users interested in this type of content
          console.log(`New weekly feature published: ${doc.title}`)
        }
      },
    ],
  },
  
  // Add indexes for better performance
  indexes: [
    {
      fields: ['weekNumber', 'year', 'theme'],
      unique: true,
    },
    {
      fields: ['status', 'isActive'],
    },
    {
      fields: ['publishedAt'],
    },
  ],
} 