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
        if (operation === 'create' && req.user && data) {
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
        const [{ totalDocs: interestedCount }, { totalDocs: goingCount }] = await Promise.all([
          req.payload.find({ collection: 'eventRSVPs', where: { event: { equals: eventId }, status: { equals: 'interested' } } }),
          req.payload.find({ collection: 'eventRSVPs', where: { event: { equals: eventId }, status: { equals: 'going' } } }),
        ]);

        // Update parent event counts
        await req.payload.update({ collection: 'events', id: eventId, data: { interestedCount, goingCount } });

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
      ], defaultValue: 'interested', required: true,
    },
  ],
};
