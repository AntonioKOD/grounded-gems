import { CollectionConfig } from 'payload/types'

const Challenges: CollectionConfig = {
  slug: 'challenges',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'difficulty', 'category', 'status', 'isWeekly'],
    group: 'Content',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'The title of the challenge',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Detailed description of the challenge',
      },
    },
    {
      name: 'difficulty',
      type: 'select',
      required: true,
      options: [
        { label: 'Easy', value: 'Easy' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Hard', value: 'Hard' },
      ],
      admin: {
        description: 'Difficulty level of the challenge',
      },
    },
    {
      name: 'reward',
      type: 'text',
      required: true,
      admin: {
        description: 'Reward for completing the challenge (e.g., "50 points")',
      },
    },
    {
      name: 'participants',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of participants who joined this challenge',
      },
    },
    {
      name: 'isWeekly',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this is a weekly challenge',
      },
    },
    {
      name: 'weekNumber',
      type: 'number',
      admin: {
        description: 'Week number for weekly challenges',
        condition: (data) => data.isWeekly,
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: {
        description: 'When the challenge expires',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Exploration', value: 'Exploration' },
        { label: 'Discovery', value: 'Discovery' },
        { label: 'Food', value: 'Food' },
        { label: 'Nature', value: 'Nature' },
        { label: 'Culture', value: 'Culture' },
        { label: 'Fitness', value: 'Fitness' },
        { label: 'History', value: 'History' },
        { label: 'Art', value: 'Art' },
        { label: 'Food & Drink', value: 'Food & Drink' },
        { label: 'Photography', value: 'Photography' },
        { label: 'Shopping', value: 'Shopping' },
        { label: 'Education', value: 'Education' },
        { label: 'Entertainment', value: 'Entertainment' },
        { label: 'Architecture', value: 'Architecture' },
      ],
      admin: {
        description: 'Category of the challenge',
      },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
      admin: {
        description: 'Tags for categorizing the challenge',
      },
    },
    {
      name: 'requirements',
      type: 'group',
      fields: [
        {
          name: 'minLocations',
          type: 'number',
          admin: {
            description: 'Minimum number of locations to visit',
          },
        },
        {
          name: 'maxReviews',
          type: 'number',
          admin: {
            description: 'Maximum number of reviews for hidden gems',
          },
        },
        {
          name: 'requirePhotos',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether photos are required',
          },
        },
        {
          name: 'requireDescriptions',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether descriptions are required',
          },
        },
        {
          name: 'requireReviews',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether reviews are required',
          },
        },
        {
          name: 'requireRatings',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether ratings are required',
          },
        },
        {
          name: 'requireActivityLog',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether activity log is required',
          },
        },
        {
          name: 'requireHistoricalInfo',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether historical information is required',
          },
        },
        {
          name: 'requireArtisticReviews',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether artistic reviews are required',
          },
        },
      ],
      admin: {
        description: 'Requirements for completing the challenge',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Completed', value: 'completed' },
      ],
      admin: {
        description: 'Status of the challenge',
      },
    },
  ],
  timestamps: true,
}

export default Challenges 