import { CollectionConfig } from 'payload';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

export const Events: CollectionConfig = {
  slug: 'events',
  labels: {
    singular: 'Event',
    plural: 'Events',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'startDate', 'status', 'isFeatured'],
  },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc

        // Handle event updates
        if (operation === "update") {
          // Check if status has changed to postponed or cancelled
          if (previousDoc.status !== doc.status && (doc.status === "postponed" || doc.status === "cancelled")) {
            try {
              // Find all users who are "going" or "interested" in this event
              // This would require a separate collection to track event RSVPs
              // For this example, we'll assume there's an eventRSVPs collection
              const { docs: rsvps } = await req.payload.find({
                collection: "eventRSVPs",
                where: {
                  event: { equals: doc.id },
                },
              })

              // Notify all users who RSVP'd
              for (const rsvp of rsvps) {
                await req.payload.create({
                  collection: "notifications",
                  data: {
                    recipient: rsvp.user,
                    type: "event_update",
                    title: `Event ${doc.status}: ${doc.name}`,
                    message: `The event has been ${doc.status}. ${doc.status === "postponed" ? "New date will be announced soon." : ""}`,
                    relatedTo: {
                      relationTo: "events",
                      value: doc.id,
                    },
                    read: false,
                    createdAt: new Date().toISOString(),
                  },
                })
              }
            } catch (error) {
              console.error("Error creating event update notifications:", error)
            }
          }

          // Check if date has changed
          if (previousDoc.startDate !== doc.startDate) {
            try {
              // Find all users who are "going" or "interested"
              const { docs: rsvps } = await req.payload.find({
                collection: "eventRSVPs",
                where: {
                  event: { equals: doc.id },
                },
              })

              // Notify all users who RSVP'd
              for (const rsvp of rsvps) {
                await req.payload.create({
                  collection: "notifications",
                  data: {
                    recipient: rsvp.user,
                    type: "event_update",
                    title: `Date changed: ${doc.name}`,
                    message: `The event date has been updated to ${new Date(doc.startDate).toLocaleDateString()}.`,
                    relatedTo: {
                      relationTo: "events",
                      value: doc.id,
                    },
                    read: false,
                    createdAt: new Date().toISOString(),
                  },
                })
              }
            } catch (error) {
              console.error("Error creating event date change notifications:", error)
            }
          }
        }

        return doc
      },
    ],
  },
  fields: [
    // Basic Information
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'URL-friendly identifier' } },
    { name: 'description', type: 'richText', required: true, editor: lexicalEditor({}) },
    { name: 'shortDescription', type: 'text' },

    // Media
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' },
      ],
    },

    // Taxonomy
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },

    // Date and Time
    { name: 'startDate', type: 'date', required: true },
    { name: 'endDate', type: 'date' },
    { name: 'isMultiDay', type: 'checkbox' },
    {
      name: 'recurringSchedule',
      type: 'group',
      fields: [
        { name: 'frequency', type: 'select', options: [
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Monthly', value: 'monthly' },
            { label: 'Yearly', value: 'yearly' },
          ] },
        { name: 'interval', type: 'number', label: 'Every N units' },
        { name: 'byDay', type: 'array', fields: [{ name: 'day', type: 'text' }] },
      ],
    },
    { name: 'timezone', type: 'text', admin: { description: 'IANA timezone string' } },

    // Location Information
    {
      name: 'locationDetails',
      label: 'Location Details',
      type: 'group',
      fields: [
        { name: 'name', type: 'text', label: 'Place Name' },
        {
          name: 'address',
          type: 'group',
          fields: [
            { name: 'street', type: 'text' },
            { name: 'city', type: 'text' },
            { name: 'state', type: 'text' },
            { name: 'zip', type: 'text' },
            { name: 'country', type: 'text' },
          ],
        },
        {
          name: 'coordinates',
          type: 'group',
          fields: [
            { name: 'latitude', type: 'number' },
            { name: 'longitude', type: 'number' },
          ],
        },
      ],
    },
    {
      name: 'locationType',
      type: 'select',
      options: [
        { label: 'Physical', value: 'physical' },
        { label: 'Virtual', value: 'virtual' },
        { label: 'Hybrid',  value: 'hybrid' },
      ],
    },
    { name: 'linkedLocation', type: 'relationship', relationTo: 'locations' },
    {
      name: 'customLocation',
      type: 'group',
      label: 'Custom Location',
      fields: [
        { name: 'description', type: 'text' },
        { name: 'virtualUrl', type: 'text', label: 'Virtual Event URL' },
        { name: 'platform', type: 'select', options: [
            { label: 'Zoom', value: 'zoom' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Teams', value: 'teams' },
            { label: 'Other', value: 'other' },
          ] },
      ],
    },

    // Event Details
    {
      name: 'eventType',
      type: 'select',
      options: [
        { label: 'Workshop', value: 'workshop' },
        { label: 'Concert', value: 'concert' },
        { label: 'Webinar', value: 'webinar' },
        { label: 'Meetup', value: 'meetup' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'ageRestriction',
      type: 'select',
      options: [
        { label: 'All Ages', value: 'all' },
        { label: '18+',    value: '18plus' },
        { label: '21+',    value: '21plus' },
      ],
    },
    { name: 'capacity', type: 'number' },
    {
      name: 'ticketTiers',
      label: 'Ticketing',
      type: 'array',
      fields: [
        { name: 'tierName', type: 'text', label: 'Tier Name' },
        { name: 'price', type: 'number' },
        { name: 'priceId', type: 'text', label: 'Stripe Price ID' },
        { name: 'quantityAvailable', type: 'number' },
      ],
    },

    // Organizer Information
    {
      name: 'organizer',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'contactEmail', type: 'text' },
        { name: 'contactPhone', type: 'text' },
      ],
    },
    { name: 'performers', type: 'array', fields: [{ name: 'name', type: 'text' }] },

    // Additional Info
    {
      name: 'schedule',
      type: 'array',
      fields: [
        { name: 'time', type: 'text' },
        { name: 'activity', type: 'text' },
      ],
    },
    { name: 'amenities', type: 'array', fields: [{ name: 'item', type: 'text' }] },
    {
      name: 'faqs',
      type: 'array',
      fields: [
        { name: 'question', type: 'text' },
        { name: 'answer', type: 'richText', editor: lexicalEditor({}) },
      ],
    },
    { name: 'insiderTips', type: 'richText', editor: lexicalEditor({}) },

    // Creator & Status
    { name: 'createdBy', type: 'relationship', relationTo: 'users' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft',      value: 'draft' },
        { label: 'Review',     value: 'review' },
        { label: 'Published',  value: 'published' },
        { label: 'Archived',   value: 'archived' },
        { label: 'Cancelled',  value: 'cancelled' },
        { label: 'Postponed',  value: 'postponed' },
      ],
      required: true,
    },
    { name: 'isFeatured', type: 'checkbox' },
    { name: 'isVerified', type: 'checkbox' },

    // Monetization & Analytics
    { name: 'interestedCount', type: 'number', admin: { readOnly: true } },
    { name: 'goingCount',     type: 'number', admin: { readOnly: true } },
    { name: 'hasBusinessPartnership', type: 'checkbox' },
    {
      name: 'partnershipDetails',
      type: 'group',
      fields: [
        { name: 'partnerName', type: 'text' },
        { name: 'partnerContact', type: 'text' },
        { name: 'details', type: 'text' },
      ],
    },

    // SEO & Metadata
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'keywords', type: 'text' },
      ],
    },

    // Virtual Fields
    { name: 'averageRating', type: 'number', admin: { readOnly: true } },
    { name: 'reviewCount',   type: 'number', admin: { readOnly: true } },
  ],
};
