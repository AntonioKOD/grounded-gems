import { CollectionConfig } from 'payload'

export const Reports: CollectionConfig = {
  slug: 'reports',
  admin: {
    useAsTitle: 'contentId',
    defaultColumns: ['contentType', 'reason', 'status', 'priority', 'reporter', 'createdAt'],
    group: 'Moderation',
  },
  access: {
    read: ({ req: { user } }) => {
      // Only admins and the reporter can read reports
      return user?.role === 'admin' || { reporter: { equals: user?.id } }
    },
    create: () => true, // Allow creation during reporting process
    update: ({ req: { user } }) => {
      // Only admins can update reports
      return user?.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      // Only admins can delete reports
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'contentType',
      type: 'select',
      options: [
        { label: 'Post', value: 'post' },
        { label: 'Comment', value: 'comment' },
        { label: 'User', value: 'user' },
        { label: 'Location', value: 'location' },
        { label: 'Guide', value: 'guide' },
        { label: 'Event', value: 'event' },
      ],
      required: true,
      admin: {
        description: 'Type of content being reported',
      },
    },
    {
      name: 'contentId',
      type: 'text',
      required: true,
      admin: {
        description: 'ID of the reported content',
      },
    },
    {
      name: 'reason',
      type: 'select',
      options: [
        { label: 'Spam', value: 'spam' },
        { label: 'Inappropriate Content', value: 'inappropriate' },
        { label: 'Harassment', value: 'harassment' },
        { label: 'Violence', value: 'violence' },
        { label: 'Copyright Violation', value: 'copyright' },
        { label: 'Other', value: 'other' },
      ],
      required: true,
      admin: {
        description: 'Reason for the report',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Additional details about the report',
      },
    },
    {
      name: 'evidence',
      type: 'array',
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Screenshot', value: 'screenshot' },
            { label: 'Link', value: 'link' },
            { label: 'Text', value: 'text' },
          ],
        },
        {
          name: 'content',
          type: 'text',
        },
      ],
      admin: {
        description: 'Evidence provided by the reporter',
      },
    },
    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User who submitted the report',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Under Review', value: 'reviewing' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Dismissed', value: 'dismissed' },
      ],
      defaultValue: 'pending',
      required: true,
      admin: {
        description: 'Current status of the report',
      },
    },
    {
      name: 'priority',
      type: 'select',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' },
      ],
      defaultValue: 'low',
      required: true,
      admin: {
        description: 'Priority level of the report',
      },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin who reviewed the report',
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: {
        description: 'When the report was reviewed',
      },
    },
    {
      name: 'action',
      type: 'select',
      options: [
        { label: 'No Action', value: 'none' },
        { label: 'Warning', value: 'warning' },
        { label: 'Content Removed', value: 'removed' },
        { label: 'User Suspended', value: 'suspended' },
        { label: 'User Banned', value: 'banned' },
      ],
      admin: {
        description: 'Action taken on the reported content/user',
      },
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about the report',
      },
    },
    {
      name: 'contentSnapshot',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: {
            description: 'Title of the reported content',
          },
        },
        {
          name: 'content',
          type: 'textarea',
          admin: {
            description: 'Content that was reported',
          },
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'Author of the reported content',
          },
        },
      ],
      admin: {
        description: 'Snapshot of the reported content at time of report',
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
          console.log(`New report created for ${doc.contentType} ${doc.contentId}`)
        }
      },
    ],
  },
  timestamps: true,
}
