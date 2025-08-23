import { CollectionConfig } from 'payload';
import { sendPushNotification } from '@/lib/push-notifications';

export const SavedLocations: CollectionConfig = {
  slug: 'savedLocations',
  labels: {
    singular: 'Saved Location',
    plural: 'Saved Locations',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'user', 'location', 'createdAt'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      hasMany: false,
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ operation, data }) => {
        if (operation === 'create') {
          return {
            ...data,
            createdAt: new Date().toISOString(),
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

          // Notify location owner about new save
          if (location.createdBy && location.createdBy !== doc.user) {
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: location.createdBy,
                type: 'location_saved',
                title: `${user.name || 'Someone'} saved your location`,
                message: `${user.name || 'A user'} saved "${location.name}" to their favorites.`,
                relatedTo: {
                  relationTo: 'locations',
                  value: doc.location,
                },
                actionBy: doc.user,
                metadata: {
                  locationName: location.name,
                  userName: user.name,
                },
                priority: 'normal',
                read: false,
              },
            });
          }
        } catch (error) {
          console.error('Error creating saved location notification:', error);
        }

        return doc;
      },
    ],
  },
}; 