import { CollectionConfig } from 'payload';

export const ChallengeParticipation: CollectionConfig = {
  slug: 'challengeParticipation',
  labels: {
    singular: 'Challenge Participation',
    plural: 'Challenge Participations',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false;
      return {
        user: {
          equals: user.id,
        },
      };
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return {
        user: {
          equals: user.id,
        },
      };
    },
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'challenge', 'status', 'progress', 'joinedAt'],
    group: 'Challenges',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: {
        description: 'User participating in the challenge',
      },
    },
    {
      name: 'challenge',
      type: 'relationship',
      relationTo: 'challenges',
      required: true,
      hasMany: false,
      admin: {
        description: 'Challenge being participated in',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'joined',
      options: [
        { label: 'Joined', value: 'joined' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Abandoned', value: 'abandoned' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        description: 'Current status of participation',
      },
    },
    {
      name: 'progress',
      type: 'json',
      admin: {
        description: 'JSON object tracking progress metrics (e.g., locations visited, points earned)',
      },
    },
    {
      name: 'completionPercentage',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        description: 'Percentage of challenge completed (0-100)',
      },
    },
    {
      name: 'joinedAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
        description: 'When the user joined this challenge',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      admin: {
        description: 'When the user actually started working on the challenge',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        description: 'When the user completed the challenge',
        condition: (data) => data.status === 'completed',
      },
    },
    {
      name: 'abandonedAt',
      type: 'date',
      admin: {
        description: 'When the user abandoned the challenge',
        condition: (data) => data.status === 'abandoned',
      },
    },
    {
      name: 'evidence',
      type: 'array',
      admin: {
        description: 'Evidence of challenge completion (photos, check-ins, reviews)',
      },
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Photo', value: 'photo' },
            { label: 'Check-in', value: 'checkin' },
            { label: 'Review', value: 'review' },
            { label: 'Post', value: 'post' },
            { label: 'Location Visit', value: 'visit' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          name: 'data',
          type: 'json',
          admin: {
            description: 'Evidence data (photo ID, location ID, review ID, etc.)',
          },
        },
        {
          name: 'submittedAt',
          type: 'date',
          defaultValue: () => new Date(),
        },
        {
          name: 'verified',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether this evidence has been verified',
          },
        },
      ],
    },
    {
      name: 'rewards',
      type: 'group',
      admin: {
        description: 'Rewards earned from this challenge',
        condition: (data) => data.status === 'completed',
      },
      fields: [
        {
          name: 'pointsEarned',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'badgesEarned',
          type: 'array',
          fields: [
            {
              name: 'badgeId',
              type: 'text',
              required: true,
            },
            {
              name: 'badgeName',
              type: 'text',
              required: true,
            },
            {
              name: 'earnedAt',
              type: 'date',
              defaultValue: () => new Date(),
            },
          ],
        },
        {
          name: 'specialRewards',
          type: 'array',
          fields: [
            {
              name: 'type',
              type: 'select',
              options: [
                { label: 'Discount', value: 'discount' },
                { label: 'Free Item', value: 'free_item' },
                { label: 'Special Access', value: 'special_access' },
                { label: 'Recognition', value: 'recognition' },
              ],
            },
            {
              name: 'description',
              type: 'text',
              required: true,
            },
            {
              name: 'value',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'User notes about their challenge experience',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ operation, data }) => {
        if (operation === 'create') {
          return {
            ...data,
            joinedAt: new Date().toISOString(),
          };
        }
        
        // Auto-set completion date when status changes to completed
        if (data.status === 'completed' && !data.completedAt) {
          data.completedAt = new Date().toISOString();
          data.completionPercentage = 100;
        }
        
        // Auto-set abandoned date when status changes to abandoned
        if (data.status === 'abandoned' && !data.abandonedAt) {
          data.abandonedAt = new Date().toISOString();
        }
        
        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, operation, previousDoc }) => {
        if (!req.payload) return doc;

        try {
          // Handle status changes
          if (operation === 'update' && previousDoc && doc.status !== previousDoc.status) {
            const user = await req.payload.findByID({
              collection: 'users',
              id: doc.user,
            });

            const challenge = await req.payload.findByID({
              collection: 'challenges',
              id: doc.challenge,
            });

            // Notify user about challenge completion
            if (doc.status === 'completed') {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: doc.user,
                  type: 'challenge_completed',
                  title: `Challenge Completed! 🎉`,
                  message: `Congratulations! You've completed the "${challenge.title}" challenge. Check out your rewards!`,
                  relatedTo: {
                    relationTo: 'challenges',
                    value: doc.challenge,
                  },
                  metadata: {
                    challengeTitle: challenge.title,
                    pointsEarned: doc.rewards?.pointsEarned || 0,
                    badgesEarned: doc.rewards?.badgesEarned?.length || 0,
                  },
                  priority: 'high',
                  read: false,
                },
              });

              // Update challenge participant count
              const participantCount = await req.payload.count({
                collection: 'challengeParticipation',
                where: {
                  challenge: {
                    equals: doc.challenge,
                  },
                  status: {
                    equals: 'completed',
                  },
                },
              });

              await req.payload.update({
                collection: 'challenges',
                id: doc.challenge,
                data: {
                  participants: participantCount.totalDocs,
                },
              });
            }
          }

          // Handle new participation
          if (operation === 'create') {
            const challenge = await req.payload.findByID({
              collection: 'challenges',
              id: doc.challenge,
            });

            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: doc.user,
                type: 'challenge_joined',
                title: `Challenge Joined! 💪`,
                message: `You've joined the "${challenge.title}" challenge. Good luck!`,
                relatedTo: {
                  relationTo: 'challenges',
                  value: doc.challenge,
                },
                metadata: {
                  challengeTitle: challenge.title,
                  difficulty: challenge.difficulty,
                  reward: challenge.reward,
                },
                priority: 'normal',
                read: false,
              },
            });
          }

        } catch (error) {
          console.error('Error creating challenge participation notification:', error);
        }

        return doc;
      },
    ],
  },
  indexes: [
    {
      fields: ['user', 'challenge'],
      unique: true,
    },
    {
      fields: ['challenge', 'status'],
    },
    {
      fields: ['user', 'status'],
    },
    {
      fields: ['status', 'completedAt'],
    },
  ],
}; 