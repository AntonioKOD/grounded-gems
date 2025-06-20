import { CollectionConfig } from 'payload/types'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { isAdminOrCreatedBy } from '../access/isAdminOrCreatedBy'

const Guides: CollectionConfig = {
  slug: 'guides',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'creator', 'location', 'price', 'status', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      // Public can read published guides, creators can read their own guides
      if (!user) {
        return {
          status: { equals: 'published' }
        }
      }
      
      if (user.role === 'admin') return true
      
      return {
        or: [
          { status: { equals: 'published' } },
          { creator: { equals: user.id } }
        ]
      }
    },
    create: ({ req: { user } }) => {
      return user?.role === 'admin' || user?.role === 'creator' || user?.role === 'user'
    },
    update: isAdminOrCreatedBy,
    delete: isAdminOrCreatedBy,
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
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (!value && data?.title) {
              return data.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim()
            }
            return value
          },
        ],
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
      required: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ req, data }) => {
            if (!data.creator && req.user) {
              return req.user.id
            }
            return data.creator
          },
        ],
      },
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      admin: {
        description: 'The location this guide is for',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Food & Dining', value: 'food' },
        { label: 'Nightlife & Entertainment', value: 'nightlife' },
        { label: 'Culture & Arts', value: 'culture' },
        { label: 'Outdoor & Adventure', value: 'outdoor' },
        { label: 'Shopping', value: 'shopping' },
        { label: 'Historical', value: 'historical' },
        { label: 'Family-Friendly', value: 'family' },
        { label: 'Hidden Gems', value: 'hidden' },
        { label: 'Photography Spots', value: 'photography' },
        { label: 'Local Lifestyle', value: 'lifestyle' },
      ],
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
            condition: (data) => data.pricing?.type === 'paid',
          },
          validate: (value, { data }) => {
            if (data.pricing?.type === 'paid' && (!value || value <= 0)) {
              return 'Price is required for paid guides'
            }
            return true
          },
        },
        {
          name: 'suggestedPrice',
          type: 'number',
          admin: {
            condition: (data) => data.pricing?.type === 'pwyw',
            description: 'Suggested minimum price for pay-what-you-want guides',
          },
        },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      editor: lexicalEditor({}),
      admin: {
        description: 'The main content of your guide - include detailed recommendations, tips, and insights',
      },
    },
    {
      name: 'highlights',
      type: 'array',
      required: true,
      minRows: 3,
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
        description: 'Key highlights that make your guide special (3-10 bullet points)',
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
      required: true,
      admin: {
        description: 'Main image for your guide (will be used in listings)',
      },
    },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          maxLength: 100,
        },
      ],
      admin: {
        description: 'Additional images to showcase your guide',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Under Review', value: 'review' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: {
        position: 'sidebar',
      },
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
        readOnly: true,
      },
      fields: [
        {
          name: 'views',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'purchases',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'rating',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Average rating (calculated from reviews)',
          },
        },
        {
          name: 'reviewCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
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
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        // Auto-generate slug if not provided
        if (!data.slug && data.title) {
          data.slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
        }
        
        // Set creator if not provided
        if (!data.creator && req.user) {
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
        
        return data
      },
    ],
  },
}

export default Guides 