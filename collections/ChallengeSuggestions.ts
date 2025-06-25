import { CollectionConfig } from 'payload/types'

const ChallengeSuggestions: CollectionConfig = {
  slug: 'challenge-suggestions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'difficulty', 'category', 'votes', 'status'],
    group: 'Content',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => true, // Allow users to suggest challenges
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'The title of the suggested challenge',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Detailed description of the suggested challenge',
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
        description: 'Difficulty level of the suggested challenge',
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
        description: 'Category of the suggested challenge',
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
        description: 'Tags for categorizing the suggested challenge',
      },
    },
    {
      name: 'estimatedReward',
      type: 'text',
      required: true,
      admin: {
        description: 'Estimated reward for completing the challenge (e.g., "50 points")',
      },
    },
    {
      name: 'votes',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of votes this suggestion has received',
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Implemented', value: 'implemented' },
      ],
      admin: {
        description: 'Status of the suggestion',
      },
    },
    {
      name: 'suggestedBy',
      type: 'select',
      required: true,
      defaultValue: 'community',
      options: [
        { label: 'Community', value: 'community' },
        { label: 'Admin', value: 'admin' },
        { label: 'System', value: 'system' },
      ],
      admin: {
        description: 'Who suggested this challenge',
      },
    },
    {
      name: 'suggestedByUser',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User who suggested this challenge (if from community)',
        condition: (data) => data.suggestedBy === 'community',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Admin notes about this suggestion',
        condition: (data, siblingData) => siblingData?.suggestedBy === 'admin',
      },
    },
  ],
  timestamps: true,
}

export default ChallengeSuggestions 