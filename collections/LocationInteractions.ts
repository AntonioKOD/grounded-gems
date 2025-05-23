import { CollectionConfig } from 'payload';

export const LocationInteractions: CollectionConfig = {
  slug: 'locationInteractions',
  labels: {
    singular: 'Location Interaction',
    plural: 'Location Interactions',
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
    defaultColumns: ['user', 'location', 'type', 'createdAt'],
    group: 'Analytics',
  },
  hooks: {
    afterChange: [
      async ({ req, doc, operation }) => {
        if (!req.payload || operation !== 'create') return doc;

        try {
          // Extract location ID properly (handle both string and populated object)
          const locationId = typeof doc.location === 'string' 
            ? doc.location 
            : doc.location?.id || doc.location;

          // Extract user ID properly (handle both string and populated object)  
          const userId = typeof doc.user === 'string'
            ? doc.user
            : doc.user?.id || doc.user;

          if (!locationId) {
            console.error('No valid location ID found:', doc.location);
            return doc;
          }

          const location = await req.payload.findByID({
            collection: 'locations',
            id: locationId,
          });

          const user = await req.payload.findByID({
            collection: 'users',
            id: userId,
          });

          // Only notify for certain interaction types and if the location has an owner
          if (location.createdBy && location.createdBy !== userId) {
            let shouldNotify = false;
            let notificationType = '';
            let title = '';
            let message = '';
            let priority = 'normal';

            switch (doc.type) {
              case 'like':
                shouldNotify = true;
                notificationType = 'location_liked';
                title = `${user.name || 'Someone'} liked your location`;
                message = `${user.name || 'A user'} liked "${location.name}"`;
                break;
              
              case 'share':
                shouldNotify = true;
                notificationType = 'location_shared';
                title = `${user.name || 'Someone'} shared your location`;
                message = `${user.name || 'A user'} shared "${location.name}" with others`;
                priority = 'high';
                break;
              
              case 'check_in':
                shouldNotify = true;
                notificationType = 'check_in';
                title = `${user.name || 'Someone'} checked in at your location`;
                message = `${user.name || 'A user'} checked in at "${location.name}"`;
                break;
              
              case 'visit':
                // Only notify for special milestones (every 10th visit, 50th, 100th, etc.)
                const visitCount = await req.payload.count({
                  collection: 'locationInteractions',
                  where: {
                    location: {
                      equals: locationId,
                    },
                    type: {
                      equals: 'visit',
                    },
                  },
                });

                if (visitCount.totalDocs % 10 === 0 && visitCount.totalDocs >= 10) {
                  shouldNotify = true;
                  notificationType = 'location_milestone';
                  title = `${location.name} reached ${visitCount.totalDocs} visits!`;
                  message = `Your location "${location.name}" has now been visited ${visitCount.totalDocs} times. Congratulations!`;
                  priority = 'high';
                }
                break;
            }

            if (shouldNotify) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: location.createdBy,
                  type: notificationType,
                  title,
                  message,
                  relatedTo: {
                    relationTo: 'locations',
                    value: locationId,
                  },
                  actionBy: userId,
                  metadata: {
                    interactionType: doc.type,
                    locationName: location.name,
                    userName: user.name,
                    coordinates: doc.coordinates,
                    visitCount: notificationType === 'location_milestone' ? 
                      (await req.payload.count({
                        collection: 'locationInteractions',
                        where: {
                          location: { equals: locationId },
                          type: { equals: 'visit' },
                        },
                      })).totalDocs : undefined,
                  },
                  priority,
                  read: false,
                },
              });
            }
          }
        } catch (error) {
          console.error('Error creating location interaction notification:', error);
        }

        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'User',
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      label: 'Location',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Like', value: 'like' },
        { label: 'Unlike', value: 'unlike' },
        { label: 'Share', value: 'share' },
        { label: 'Visit', value: 'visit' },
        { label: 'Check-in', value: 'check_in' },
        { label: 'View Details', value: 'view_details' },
        { label: 'Save to Favorites', value: 'save' },
        { label: 'Remove from Favorites', value: 'unsave' },
        { label: 'Subscribe', value: 'subscribe' },
        { label: 'Unsubscribe', value: 'unsubscribe' },
        { label: 'Report', value: 'report' },
        { label: 'Photo Upload', value: 'photo_upload' },
        { label: 'Review Submit', value: 'review_submit' },
      ],
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Interaction Metadata',
      admin: {
        description: 'Additional data about the interaction (e.g., share platform, visit duration)',
      },
    },
    {
      name: 'coordinates',
      type: 'group',
      label: 'User Location During Interaction',
      fields: [
        {
          name: 'latitude',
          type: 'number',
          label: 'Latitude',
        },
        {
          name: 'longitude',
          type: 'number',
          label: 'Longitude',
        },
      ],
      admin: {
        description: 'User\'s location when the interaction occurred (for proximity verification)',
      },
    },
    {
      name: 'platform',
      type: 'select',
      label: 'Platform',
      options: [
        { label: 'Web App', value: 'web' },
        { label: 'Mobile App', value: 'mobile' },
        { label: 'iOS App', value: 'ios' },
        { label: 'Android App', value: 'android' },
      ],
      defaultValue: 'web',
    },
    {
      name: 'verificationStatus',
      type: 'select',
      label: 'Verification Status',
      options: [
        { label: 'Unverified', value: 'unverified' },
        { label: 'Proximity Verified', value: 'proximity_verified' },
        { label: 'Photo Verified', value: 'photo_verified' },
        { label: 'Staff Verified', value: 'staff_verified' },
      ],
      defaultValue: 'unverified',
      admin: {
        description: 'Whether the interaction was verified (e.g., user was actually at the location)',
      },
    },
    {
      name: 'deviceInfo',
      type: 'json',
      label: 'Device Information',
      admin: {
        description: 'Device and browser information for analytics',
      },
    },
    {
      name: 'duration',
      type: 'number',
      label: 'Duration (seconds)',
      admin: {
        description: 'How long the user spent on this interaction (for visits, page views, etc.)',
      },
    },
    {
      name: 'referrerSource',
      type: 'text',
      label: 'Referrer Source',
      admin: {
        description: 'How the user found this location (search, social media, etc.)',
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      label: 'Public Interaction',
      defaultValue: true,
      admin: {
        description: 'Whether this interaction can be shown to others (e.g., in activity feeds)',
      },
    },
  ],
  indexes: [
    // Temporarily commenting out unique index to debug validation issues
    // {
    //   fields: ['user', 'location', 'type'],
    //   unique: true,
    //   partialFilterExpression: {
    //     type: { $in: ['like', 'save', 'subscribe'] },
    //   },
    // },
    {
      fields: ['location', 'type', 'createdAt'],
    },
    {
      fields: ['user', 'createdAt'],
    },
    {
      fields: ['coordinates.latitude', 'coordinates.longitude'],
    },
  ],
}; 