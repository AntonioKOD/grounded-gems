import { CollectionConfig } from 'payload/types'

const ChallengeVotes: CollectionConfig = {
  slug: 'challenge-votes',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'suggestion', 'createdAt'],
    group: 'Content',
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    create: ({ req: { user } }) => !!user, // Any authenticated user can vote
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
        description: 'User who cast the vote',
      },
    },
    {
      name: 'suggestion',
      type: 'relationship',
      relationTo: 'challenge-suggestions',
      required: true,
      admin: {
        description: 'Challenge suggestion that was voted on',
      },
    },
    {
      name: 'voteType',
      type: 'select',
      required: true,
      defaultValue: 'upvote',
      options: [
        { label: 'Upvote', value: 'upvote' },
        { label: 'Downvote', value: 'downvote' },
      ],
      admin: {
        description: 'Type of vote cast',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Optional notes about the vote',
      },
    },
  ],
  timestamps: true,
  indexes: [
    {
      name: 'user_suggestion_unique',
      fields: ['user', 'suggestion'],
      unique: true,
    },
  ],
}

export default ChallengeVotes 