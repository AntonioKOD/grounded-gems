import { CollectionConfig } from 'payload';


export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: {
    singular: 'Review',
    plural: 'Reviews',
  },
  access: {
    read: () => true,
    create: () => true,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'rating', 'reviewType', 'status'],
  },
  fields: [
    // Basic Information
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'text', required: true,  },
    { name: 'rating', type: 'number', required: true, min: 1, max: 5 },

    // Review Target
    {
      name: 'reviewType',
      type: 'select',
      required: true,
      options: [
        { label: 'Location', value: 'location' },
        { label: 'Event',    value: 'event' },
        { label: 'Special',  value: 'special' },
      ],
    },
    { name: 'location', type: 'relationship', relationTo: 'locations' },
    { name: 'event',    type: 'relationship', relationTo: 'events' },
    { name: 'special',  type: 'relationship', relationTo: 'specials' },

    

    // Review Details
    { name: 'visitDate', type: 'date' },
    { name: 'pros',     type: 'array', fields: [{ name: 'pro',  type: 'text' }] },
    { name: 'cons',     type: 'array', fields: [{ name: 'con',  type: 'text' }] },
    { name: 'tips',     type: 'text' },
    { name: 'categories', type: 'array', fields: [{ name: 'category', type: 'text' }] },
    {
      name: 'categoryRatings',
      type: 'array',
      fields: [
        { name: 'category', type: 'text' },
        { name: 'rating',   type: 'number', min: 1, max: 5 },
      ],
    },
    {
      name: 'recommendationLevel',
      type: 'select',
      options: [
        { label: 'Not Recommended', value: 'none' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'Recommended', value: 'yes' },
        { label: 'Strongly Recommended', value: 'strong' },
      ],
    },

    // Author Information
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'isVerifiedVisit', type: 'checkbox', label: 'Verified Visit' },

    // Status Information
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending',    value: 'pending' },
        { label: 'Published',  value: 'published' },
        { label: 'Rejected',   value: 'rejected' },
        { label: 'Reported',   value: 'reported' },
      ],
      defaultValue: 'pending',
    },
    { name: 'moderationNotes', type: 'textarea', admin: { description: 'Admin-only notes' } },

    // Engagement Metrics
    { name: 'helpfulCount',    type: 'number', admin: { readOnly: true } },
    { name: 'unhelpfulCount',  type: 'number', admin: { readOnly: true } },
    { name: 'reportCount',     type: 'number', admin: { readOnly: true } },
    { name: 'usersWhoMarkedHelpful',   type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'usersWhoMarkedUnhelpful', type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'usersWhoReported',         type: 'relationship', relationTo: 'users', hasMany: true },
  ],
};
