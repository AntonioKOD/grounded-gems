import { CollectionConfig } from 'payload';

export const BucketLists: CollectionConfig = {
  slug: 'bucketLists',
  labels: {
    singular: 'Bucket List',
    plural: 'Bucket Lists',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'owner', 'isPublic', 'createdAt'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'List Name',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Personal', value: 'personal' },
        { label: 'Shared', value: 'shared' },
      ],
      defaultValue: 'personal',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'collaborators',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        condition: (_, siblingData) => siblingData.type === 'shared',
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: false,
      label: 'Public List',
      admin: {
        description: 'Allow others to discover and view this list',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Cover Image',
    },
    {
      name: 'items',
      type: 'array',
      label: 'Bucket List Items',
      fields: [
        {
          name: 'location',
          type: 'relationship',
          relationTo: 'locations',
          required: false,
        },
        {
          name: 'goal',
          type: 'text',
          label: 'Personal Goal',
          admin: {
            placeholder: 'e.g., "Try the lemon tart", "Visit at sunset"',
          },
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Notes',
          admin: {
            placeholder: 'Additional notes or details about this item',
          },
        },
        {
          name: 'dueDate',
          type: 'date',
          label: 'Due Date (Optional)',
        },
        {
          name: 'priority',
          type: 'select',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
          ],
          defaultValue: 'medium',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: [
            { label: 'Not Started', value: 'not_started' },
            { label: 'Planned', value: 'planned' },
            { label: 'Completed', value: 'completed' },
          ],
          defaultValue: 'not_started',
        },
        {
          name: 'completedAt',
          type: 'date',
          label: 'Completed Date',
          admin: {
            condition: (_, siblingData) => siblingData.status === 'completed',
          },
        },
        {
          name: 'completionData',
          type: 'group',
          label: 'Completion Details',
          admin: {
            condition: (_, siblingData) => siblingData.status === 'completed',
          },
          fields: [
            {
              name: 'photos',
              type: 'array',
              label: 'Photos',
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'caption',
                  type: 'text',
                },
              ],
            },
            {
              name: 'rating',
              type: 'number',
              min: 1,
              max: 5,
              label: 'Experience Rating',
            },
            {
              name: 'memory',
              type: 'textarea',
              label: 'Memory/Note',
            },
            {
              name: 'xpEarned',
              type: 'number',
              label: 'XP Earned',
              defaultValue: 0,
              admin: {
                readOnly: true,
              },
            },
            {
              name: 'badgesEarned',
              type: 'array',
              label: 'Badges Earned',
              fields: [
                {
                  name: 'badge',
                  type: 'text',
                },
                {
                  name: 'earnedAt',
                  type: 'date',
                },
              ],
            },
          ],
        },
        {
          name: 'addedAt',
          type: 'date',
          required: true,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'stats',
      type: 'group',
      label: 'List Statistics',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'totalItems',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'completedItems',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'progressPercentage',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'lastActivity',
          type: 'date',
        },
      ],
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'updatedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ operation, data, originalDoc }) => {
        const now = new Date().toISOString();
        
        if (operation === 'create') {
          data.createdAt = now;
          data.updatedAt = now;
          
          // Initialize stats
          data.stats = {
            totalItems: data.items?.length || 0,
            completedItems: data.items?.filter((item: any) => item.status === 'completed').length || 0,
            progressPercentage: 0,
            lastActivity: now,
          };
          
          // Calculate progress percentage
          if (data.stats.totalItems > 0) {
            data.stats.progressPercentage = Math.round((data.stats.completedItems / data.stats.totalItems) * 100);
          }
          
          // Set addedAt for items
          if (data.items?.length) {
            data.items = data.items.map((item: any) => ({
              ...item,
              addedAt: item.addedAt || now,
            }));
          }
        } else {
          data.updatedAt = now;
          
          // Update stats
          const totalItems = data.items?.length || 0;
          const completedItems = data.items?.filter((item: any) => item.status === 'completed').length || 0;
          
          data.stats = {
            ...data.stats,
            totalItems,
            completedItems,
            progressPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
            lastActivity: now,
          };
          
          // Handle completion logic for items
          if (data.items?.length) {
            data.items = data.items.map((item: any, index: number) => {
              const originalItem = originalDoc?.items?.[index];
              
              // If item was just completed
              if (item.status === 'completed' && originalItem?.status !== 'completed') {
                const completionData = {
                  ...item.completionData,
                  xpEarned: item.completionData?.xpEarned || 10, // Base XP
                };
                
                // Award bonus XP based on rating
                if (item.completionData?.rating >= 4) {
                  completionData.xpEarned += 5;
                }
                
                return {
                  ...item,
                  completedAt: item.completedAt || now,
                  completionData,
                };
              }
              
              return {
                ...item,
                addedAt: item.addedAt || originalItem?.addedAt || now,
              };
            });
          }
        }
        
        return data;
      },
    ],
  },
  indexes: [
    {
      fields: ['owner', 'type'],
    },
    {
      fields: ['isPublic', 'type'],
    },
    {
      fields: ['createdAt'],
    },
  ],
}; 