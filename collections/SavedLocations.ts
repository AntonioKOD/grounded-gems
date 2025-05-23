import { CollectionConfig } from 'payload';

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
  },
}; 