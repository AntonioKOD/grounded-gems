/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CollectionConfig } from 'payload'

export const Journeys: CollectionConfig = {
  slug: 'journeys',
  labels: {
    singular: 'Journey',
    plural: 'Journeys',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: () => true,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'owner', 'date', 'createdAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'steps', type: 'array', required: true, fields: [
      { name: 'step', type: 'text', required: true },
    ] },
    { name: 'context', type: 'text' },
    { name: 'date', type: 'date', required: true },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Solo', value: 'solo' },
        { label: 'Date', value: 'date' },
        { label: 'Group', value: 'group' },
        { label: 'Family', value: 'family' },
      ],
    },
    {
      name: 'invitees',
      type: 'array',
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Accepted', value: 'accepted' },
            { label: 'Declined', value: 'declined' },
          ],
          defaultValue: 'pending',
        },
      ],
    },
    { name: 'createdAt', type: 'date', admin: { readOnly: true } },
    { name: 'updatedAt', type: 'date', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      async ({ operation, data }) => {
        const now = new Date().toISOString()
        if (operation === 'create') {
          return { ...data, createdAt: now, updatedAt: now }
        }
        if (operation === 'update') {
          return { ...data, updatedAt: now }
        }
        return data
      },
    ],
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc
        // Only on update, check for new invitees
        if (operation === 'update' && previousDoc) {
          const prevInvitees = previousDoc.invitees || []
          const newInvitees = doc.invitees || []
          // Find newly added invitees
          const prevIds = prevInvitees.map((i: any) => String(i.user))
          const added = newInvitees.filter((i: any) => !prevIds.includes(String(i.user)))
          for (const invitee of added) {
            try {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: invitee.user,
                  type: 'invite',
                  title: `${doc.title}: You have been invited to a Gem Journey`,
                  message: `You have been invited to join the journey "${doc.title}"`,
                  relatedTo: { relationTo: 'journeys', value: doc.id },
                  read: false,
                },
              })
            } catch (err) {
              req.payload.logger?.error('Error creating invite notification:', err)
            }
          }
        }
        return doc
      },
    ],
  },
} 