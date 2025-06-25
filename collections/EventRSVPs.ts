/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionConfig } from 'payload';

export const EventRSVPs: CollectionConfig = {
  slug: 'eventRSVPs',
  labels: {
    singular: 'Event RSVP',
    plural:   'Event RSVPs',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: async ({ req, id }) => {
      if (!req.user || !id) return false;
      const existing = await req.payload.findByID({ collection: 'eventRSVPs', id, depth: 0 });
      if (!existing) return false;
      const ownerId = typeof existing.user === 'string'
        ? existing.user
        : (existing.user as any).value || (existing.user as any).id;
      return ownerId === req.user.id;
    },
    delete: async ({ req, id }) => {
      if (!req.user || !id) return false;
      const existing = await req.payload.findByID({ collection: 'eventRSVPs', id, depth: 0 });
      if (!existing) return false;
      const ownerId = typeof existing.user === 'string'
        ? existing.user
        : (existing.user as any).value || (existing.user as any).id;
      return ownerId === req.user.id;
    },
  },
  hooks: {
    beforeValidate: [
      async ({ operation, req, data }) => {
        // Only set user from session if not already provided (for invitations)
        if (operation === 'create' && req.user && data && !data.user) {
          data.user = req.user.id;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, previousDoc }) => {
        if (!req.payload) return doc;

        // Normalize event ID from relation
        const ev = doc.event;
        const eventId = typeof ev === 'string'
          ? ev
          : (ev as any).value || (ev as any).id;
        if (!eventId) return doc;

        // Check if status or event changed
        const prevEv = previousDoc?.event;
        const prevId = typeof prevEv === 'string'
          ? prevEv
          : (prevEv as any)?.value || (prevEv as any)?.id;
        if (previousDoc && prevId === eventId && previousDoc.status === doc.status) {
          return doc;
        }

        // Count interested and going
        const [{ totalDocs: interestedCount }, { totalDocs: goingCount }, { totalDocs: invitedCount }] = await Promise.all([
          req.payload.find({ collection: 'eventRSVPs', where: { event: { equals: eventId }, status: { equals: 'interested' } } }),
          req.payload.find({ collection: 'eventRSVPs', where: { event: { equals: eventId }, status: { equals: 'going' } } }),
          req.payload.find({ collection: 'eventRSVPs', where: { event: { equals: eventId }, status: { equals: 'invited' } } }),
        ]);

        // Update parent event counts using direct database update to avoid triggering beforeChange hook
        await req.payload.db.updateOne({
          collection: 'events',
          where: { id: { equals: eventId } },
          data: { 
            interestedCount, 
            goingCount,
            invitedCount: invitedCount || 0
          }
        });

        return doc;
      },
    ],
  },
  fields: [
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, admin: { description: 'Set from the logged-in session' } },
    {
      name: 'status', type: 'select', options: [
        { label: 'Interested', value: 'interested' },
        { label: 'Going',      value: 'going'      },
        { label: 'Not Going',  value: 'not_going'  },
        { label: 'Invited',    value: 'invited'    },
      ], defaultValue: 'interested', required: true,
    },
    { 
      name: 'invitedBy', 
      type: 'relationship', 
      relationTo: 'users', 
      admin: { 
        description: 'User who sent the invitation (only for invited status)',
        condition: (data) => data.status === 'invited'
      } 
    },
    { 
      name: 'invitedAt', 
      type: 'date', 
      admin: { 
        description: 'When the invitation was sent (only for invited status)',
        condition: (data) => data.status === 'invited'
      } 
    },
  ],
};
