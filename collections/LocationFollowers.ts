import { CollectionConfig } from 'payload';

export const LocationFollowers: CollectionConfig = {
  slug: 'locationFollowers',
  labels: {
    singular: 'Location Follower',
    plural: 'Location Followers',
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
    defaultColumns: ['user', 'location', 'notificationPreferences', 'followedAt'],
    group: 'User Engagement',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: {
        description: 'User who is following the location',
      },
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      hasMany: false,
      admin: {
        description: 'Location being followed',
      },
    },
    {
      name: 'notificationPreferences',
      type: 'select',
      required: true,
      defaultValue: 'all',
      options: [
        { label: 'All Updates', value: 'all' },
        { label: 'Events Only', value: 'events' },
        { label: 'Specials Only', value: 'specials' },
        { label: 'Business Hours Changes', value: 'business_hours' },
        { label: 'New Reviews', value: 'reviews' },
        { label: 'Menu Updates', value: 'menu_updates' },
        { label: 'None (Just Follow)', value: 'none' },
      ],
      admin: {
        description: 'What type of notifications the user wants to receive',
      },
    },
    {
      name: 'followedAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
        description: 'When the user started following this location',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this follow relationship is active',
      },
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Manual Follow', value: 'manual' },
        { label: 'Auto Follow (Visited)', value: 'auto_visit' },
        { label: 'Auto Follow (Saved)', value: 'auto_save' },
        { label: 'Recommended', value: 'recommended' },
      ],
      admin: {
        description: 'How the user came to follow this location',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ operation, data }) => {
        if (operation === 'create') {
          return {
            ...data,
            followedAt: new Date().toISOString(),
          };
        }
        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, operation }) => {
        if (!req.payload || operation !== 'create') return doc;

        try {
          // Get the location and user info
          const location = await req.payload.findByID({
            collection: 'locations',
            id: doc.location,
          });

          const user = await req.payload.findByID({
            collection: 'users',
            id: doc.user,
          });

          // Notify location owner about new follower
          if (location.createdBy && location.createdBy !== doc.user) {
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: location.createdBy,
                type: 'location_followed',
                title: `${user.name || 'Someone'} is now following ${location.name}`,
                message: `${user.name || 'A user'} started following "${location.name}" and will receive updates about your location.`,
                relatedTo: {
                  relationTo: 'locations',
                  value: doc.location,
                },
                actionBy: doc.user,
                metadata: {
                  locationName: location.name,
                  followerName: user.name,
                  notificationPreferences: doc.notificationPreferences,
                },
                priority: 'normal',
                read: false,
              },
            });
          }

          // Update location follower count
          const followerCount = await req.payload.count({
            collection: 'locationFollowers',
            where: {
              location: {
                equals: doc.location,
              },
              isActive: {
                equals: true,
              },
            },
          });

          // Update the location with new follower count
          await req.payload.update({
            collection: 'locations',
            id: doc.location,
            data: {
              followerCount: followerCount.totalDocs,
            },
          });

        } catch (error) {
          console.error('Error creating location follower notification:', error);
        }

        return doc;
      },
    ],
  },
  indexes: [
    {
      fields: ['user', 'location'],
      unique: true,
    },
    {
      fields: ['location', 'isActive'],
    },
    {
      fields: ['user', 'followedAt'],
    },
  ],
}; 