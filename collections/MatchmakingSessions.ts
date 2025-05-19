import { CollectionConfig } from 'payload';
import { runMatchAlgorithm } from '@/app/actions'; // Adjust the import path as needed

export const MatchmakingSessions: CollectionConfig = {
  slug: 'matchmakingSessions',
  labels: {
    singular: 'Matchmaking Session',
    plural: 'Matchmaking Sessions',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: async ({ req, id }) => {
      // only organizer or admin can modify
      if (!req.user || !id) return false;
      const doc = await req.payload.findByID({ collection: 'matchmakingSessions',id, depth: 0 });
      return doc?.organizer === req.user.id;
    },
    delete: async ({ req, id }) => {
      if (!req.user || !id) return false;
      const doc = await req.payload.findByID({ collection: 'matchmakingSessions', id: id, depth: 0 });
      return doc?.organizer === req.user.id;
    },
  },
  hooks: {
    afterChange: [
      async ({ req, doc, operation }) => {
        // when participants hit maxPlayers and autoMatch, trigger matching logic
        if (
          operation === 'update'
          && doc.autoMatch
          && doc.participants?.length >= doc.maxPlayers
          && !doc.matchedGroups?.length
        ) {
          // call your matching function here, e.g.
          const groups = await runMatchAlgorithm(doc.participants, doc.skillLevel, doc.location);
          await req.payload.update({
            collection: 'matchmakingSessions',
            id: doc.id,
            data: { matchedGroups: groups },
          });
        }
        return doc;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'sportType',
      type: 'select',
      options: [
        { label: 'Tennis', value: 'tennis' },
        { label: 'Soccer', value: 'soccer' },
        { label: 'Basketball', value: 'basketball' },
        // …
      ],
      required: true,
    },
    {
      name: 'skillLevel',
      type: 'select',
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' },
      ],
      required: true,
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: false,
      required: true,
    },
    { name: 'virtualUrl', type: 'text', admin: { description: 'If virtual or hybrid' } },
    {
      name: 'timeWindow',
      type: 'group',
      fields: [
        { name: 'start', type: 'date', required: true },
        { name: 'end',   type: 'date', required: true },
      ],
      required: true,
    },
    { name: 'minPlayers', type: 'number', defaultValue: 2 },
    { name: 'maxPlayers', type: 'number', defaultValue: 4 },
    {
      name: 'participants',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { description: 'Users who signed up' },
    },
    {
      name: 'preferences',
      type: 'group',
      fields: [
        { name: 'ageRange', type: 'array', fields: [
            { name: 'min', type: 'number' }, { name: 'max', type: 'number' }
          ]},
        { name: 'gender', type: 'select', options: [
            { label: 'Any', value: 'any' },
            { label: 'Male', value: 'male' },
            { label: 'Female', value: 'female' },
          ]},
        { name: 'availability', type: 'array', fields: [
            { name: 'day', type: 'select', options: [
                { label: 'Monday', value: 'monday' },
                /* … */ ],
            },
            { name: 'timeSlot', type: 'text' },
          ]},
      ],
    },
    { name: 'autoMatch', type: 'checkbox', defaultValue: true },
    {
      name: 'matchedGroups',
      type: 'array',
      label: 'Matched Groups',
      fields: [
        { name: 'group', type: 'array', fields: [
            { name: 'user', type: 'relationship', relationTo: 'users', hasMany: false }
          ]},
      ],
      admin: { readOnly: true, description: 'Output of matching algorithm' },
    },
    {
      name: 'organizer',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft',      value: 'draft'      },
        { label: 'Open',       value: 'open'       },
        { label: 'In Progress',value: 'in_progress'},
        { label: 'Completed',  value: 'completed'  },
        { label: 'Cancelled',  value: 'cancelled'  },
      ],
      defaultValue: 'draft',
      required: true,
    },
  ],
};