import { CollectionConfig } from 'payload';

export const ContestUpvotes: CollectionConfig = {
  slug: 'contest-upvotes',
  labels: { 
    singular: 'Contest Upvote', 
    plural: 'Contest Upvotes' 
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['experience', 'user', 'createdAt'],
    group: 'Content',
    description: 'Contest upvotes for experiences',
  },
  access: {
    read: ({ req }) => {
      // Public read access for upvote counts
      return true;
    },
    create: ({ req }) => {
      // Only authenticated users can create upvotes
      return !!req.user;
    },
    update: ({ req }) => {
      // Users can only update their own upvotes
      if (!req.user) return false;
      if (req.user.role === 'admin') return true;
      return { user: { equals: req.user.id } };
    },
    delete: ({ req }) => {
      // Users can only delete their own upvotes
      if (!req.user) return false;
      if (req.user.role === 'admin') return true;
      return { user: { equals: req.user.id } };
    },
  },
  fields: [
    {
      name: 'experience',
      type: 'relationship',
      relationTo: 'experiences',
      required: true,
      label: 'Experience',
      admin: {
        readOnly: true,
        description: 'The experience being upvoted',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'User',
      admin: {
        readOnly: true,
        description: 'The user who upvoted',
      },
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      label: 'Upvoted At',
      admin: {
        readOnly: true,
        description: 'When the upvote was created',
      },
      defaultValue: () => new Date().toISOString(),
    },
    {
      name: 'ipAddress',
      type: 'text',
      label: 'IP Address',
      admin: {
        readOnly: true,
        description: 'IP address of the user (for rate limiting)',
      },
    },
    {
      name: 'userAgent',
      type: 'text',
      label: 'User Agent',
      admin: {
        readOnly: true,
        description: 'Browser/device information',
      },
    },
    {
      name: 'metadata',
      type: 'group',
      label: 'Metadata',
      fields: [
        {
          name: 'source',
          type: 'select',
          options: [
            { label: 'Web App', value: 'web' },
            { label: 'Mobile App', value: 'mobile' },
            { label: 'API', value: 'api' },
          ],
          defaultValue: 'web',
          label: 'Source',
        },
        {
          name: 'sessionId',
          type: 'text',
          label: 'Session ID',
          admin: {
            description: 'User session identifier',
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Set creation timestamp
        if (operation === 'create') {
          data.createdAt = new Date().toISOString();
        }

        // Add IP address and user agent if available
        if (req && req.headers) {
          const forwardedFor = req.headers.get('x-forwarded-for');
          const realIp = req.headers.get('x-real-ip');
          data.ipAddress = forwardedFor || realIp || 'unknown';

          data.userAgent = req.headers.get('user-agent') || 'unknown';
        }

        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, operation }) => {
        // Log upvote activity
        console.log(`🎯 Contest upvote ${operation}:`, {
          experienceId: doc.experience,
          userId: doc.user,
          operation,
          timestamp: doc.createdAt,
        });

        // Update experience upvotes count
        try {
          const payload = req.payload;
          const upvotesResult = await payload.find({
            collection: 'contest-upvotes',
            where: {
              experience: { equals: doc.experience }
            },
            limit: 0, // Just get count
          });

          await payload.update({
            collection: 'experiences',
            id: doc.experience,
            data: {
              upvotesCount: upvotesResult.totalDocs,
            },
          });
        } catch (error) {
          console.error('Failed to update experience upvotes count:', error);
        }
      },
    ],
    afterDelete: [
      async ({ req, doc }) => {
        // Update experience upvotes count after deletion
        try {
          const payload = req.payload;
          const upvotesResult = await payload.find({
            collection: 'contest-upvotes',
            where: {
              experience: { equals: doc.experience }
            },
            limit: 0, // Just get count
          });

          await payload.update({
            collection: 'experiences',
            id: doc.experience,
            data: {
              upvotesCount: upvotesResult.totalDocs,
            },
          });
        } catch (error) {
          console.error('Failed to update experience upvotes count after deletion:', error);
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['experience', 'user'],
      unique: true,
    },
    {
      fields: ['experience'],
    },
    {
      fields: ['user'],
    },
    {
      fields: ['createdAt'],
    },
    {
      fields: ['ipAddress'],
    },
  ],
  timestamps: false, // We manage timestamps manually
};

export default ContestUpvotes;
