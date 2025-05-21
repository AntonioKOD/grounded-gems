import { CollectionConfig } from 'payload';

export const Locations: CollectionConfig = {
  slug: 'locations',
  labels: {
    singular: 'Location',
    plural: 'Locations',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc;

        // Only handle when a location is marked verified
        if (
          operation === 'update' &&
          previousDoc?.isVerified === false &&
          doc.isVerified === true
        ) {
          try {
            // Determine the creator ID (string or object)
            let creatorId: string | undefined;
            if (typeof doc.createdBy === 'string') {
              creatorId = doc.createdBy;
            } else if (typeof doc.createdBy === 'object' && doc.createdBy?.id) {
              creatorId = doc.createdBy.id as string;
            }

            // Notify the creator that their location was verified
            if (creatorId) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: creatorId,
                  type: 'location_verified',
                  title: `Your location "${doc.name}" has been verified!`,
                  message: 'Your location listing is now verified and will be featured more prominently.',
                  relatedTo: {
                    relationTo: 'locations',
                    value: doc.id,
                  },
                  read: false,
                },
              });
            }
          } catch (error) {
            console.error('Error creating location verification notification:', error);
          }
        }

        return doc;
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, admin: { description: 'URL-friendly identifier' } },
    { name: 'description', type: 'text', required: true },
    { name: 'shortDescription', type: 'text' },
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' },
      ],
    },
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
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
    { name: 'neighborhood', type: 'text' },
    {
      name: 'contactInfo',
      type: 'group',
      fields: [
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'website', type: 'text' },
        {
          name: 'socialMedia',
          type: 'group',
          fields: [
            { name: 'facebook', type: 'text' },
            { name: 'twitter', type: 'text' },
            { name: 'instagram', type: 'text' },
            { name: 'linkedin', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'businessHours',
      type: 'array',
      fields: [
        { name: 'day', type: 'select', options: [
            { label: 'Sunday', value: 'Sunday' },
            { label: 'Monday', value: 'Monday' },
            { label: 'Tuesday', value: 'Tuesday' },
            { label: 'Wednesday', value: 'Wednesday' },
            { label: 'Thursday', value: 'Thursday' },
            { label: 'Friday', value: 'Friday' },
            { label: 'Saturday', value: 'Saturday' },
          ],
        },
        { name: 'open', type: 'text', label: 'Opens at' },
        { name: 'close', type: 'text', label: 'Closes at' },
        { name: 'closed', type: 'checkbox', label: 'Closed this day' },
      ],
    },
    { name: 'priceRange', type: 'select', options: [
        { label: 'Free', value: 'free' },
        { label: 'Budget', value: 'budget' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Expensive', value: 'expensive' },
        { label: 'Luxury', value: 'luxury' },
      ],
    },
    { name: 'bestTimeToVisit', type: 'array', fields: [{ name: 'season', type: 'text' }] },
    { name: 'insiderTips', type: 'text' },
    {
      name: 'accessibility',
      type: 'group',
      fields: [
        { name: 'wheelchairAccess', type: 'checkbox' },
        { name: 'parking', type: 'checkbox' },
        { name: 'other', type: 'text', label: 'Other accommodations' },
      ],
    },
    { name: 'createdBy', type: 'relationship', relationTo: 'users' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Review', value: 'review' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      required: true,
    },
    { name: 'isFeatured', type: 'checkbox' },
    { name: 'isVerified', type: 'checkbox' },
    { name: 'visitVerificationCount', type: 'number' },
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
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'keywords', type: 'text' },
      ],
    },
    { name: 'averageRating', type: 'number', admin: { readOnly: true } },
    { name: 'reviewCount', type: 'number', admin: { readOnly: true } },
  ],
};
