import { CollectionConfig } from 'payload'

export const AccountDeletions: CollectionConfig = {
  slug: 'accountDeletions',
  admin: {
    useAsTitle: 'userEmail',
    defaultColumns: ['userEmail', 'status', 'scheduledFor', 'createdAt'],
    group: 'User Management',
  },
  access: {
    read: ({ req: { user } }) => {
      // Only admins can read account deletion records
      return user?.role === 'admin'
    },
    create: () => true, // Allow creation during deletion process
    update: ({ req: { user } }) => {
      // Only admins can update deletion records
      return user?.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      // Only admins can delete deletion records
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'userId',
      type: 'text',
      required: true,
      admin: {
        description: 'The ID of the user whose account was deleted',
      },
    },
    {
      name: 'userEmail',
      type: 'email',
      required: true,
      admin: {
        description: 'The email address of the deleted user',
      },
    },
    {
      name: 'reason',
      type: 'textarea',
      admin: {
        description: 'Reason provided by user for account deletion',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'pending',
      required: true,
      admin: {
        description: 'Status of the account deletion process',
      },
    },
    {
      name: 'scheduledFor',
      type: 'date',
      required: true,
      admin: {
        description: 'When the account deletion was scheduled',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        description: 'When the account deletion was completed',
      },
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about the deletion',
      },
    },
    {
      name: 'dataRetention',
      type: 'group',
      fields: [
        {
          name: 'postsDeleted',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Number of posts deleted',
          },
        },
        {
          name: 'guidesDeleted',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Number of guides deleted',
          },
        },
        {
          name: 'eventsDeleted',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Number of events deleted',
          },
        },
        {
          name: 'reviewsDeleted',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Number of reviews deleted',
          },
        },
      ],
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
          console.log(`Account deletion record created for user ${doc.userEmail}`)
        }
      },
    ],
  },
  timestamps: true,
}
