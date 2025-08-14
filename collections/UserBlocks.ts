import { CollectionConfig } from 'payload'

export const UserBlocks: CollectionConfig = {
  slug: 'userBlocks',
  admin: {
    useAsTitle: 'blocker',
    defaultColumns: ['blocker', 'blockedUser', 'reason', 'createdAt'],
    group: 'Moderation',
  },
  access: {
    read: ({ req: { user } }) => {
      // Users can only see blocks they created or are subject to
      return user?.role === 'admin' || 
             { blocker: { equals: user?.id } } || 
             { blockedUser: { equals: user?.id } }
    },
    create: () => true, // Allow creation during blocking process
    update: ({ req: { user } }) => {
      // Only admins can update blocks
      return user?.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      // Users can delete their own blocks, admins can delete any
      return user?.role === 'admin' || { blocker: { equals: user?.id } }
    },
  },
  fields: [
    {
      name: 'blocker',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User who initiated the block',
      },
    },
    {
      name: 'blockedUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User who was blocked',
      },
    },
    {
      name: 'reason',
      type: 'textarea',
      admin: {
        description: 'Reason for blocking the user',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether the block is currently active',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: {
        description: 'When the block expires (if temporary)',
      },
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about the block',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          data.createdAt = new Date()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create') {
          console.log(`User block created: ${doc.blocker} blocked ${doc.blockedUser}`)
        }
      },
    ],
  },
  timestamps: true,
}
