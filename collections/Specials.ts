/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionConfig } from 'payload';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

const normalizeId = (val: any): string | undefined => {
  if (typeof val === 'string') return val;
  if (val?.id) return val.id;
  if (val?._id) return val._id;
  return undefined;
};

export const Specials: CollectionConfig = {
  slug: 'specials',
  labels: {
    singular: 'Special',
    plural: 'Specials',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'startDate', 'endDate'],
  },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc;

        // Only handle when a new special is published
        if (operation === 'create' && doc.status === 'published') {
          try {
            // Normalize location reference
            const locationId = normalizeId(doc.location);
            if (!locationId) return doc;

            // Fetch followers for this location
            const followersResult = await req.payload.find({
              collection: 'locationFollowers',
              where: { location: { equals: locationId } },
              depth: 0,
            });

            // Normalize creator of special
            const creatorId = normalizeId(doc.createdBy);

            for (const follower of followersResult.docs) {
              const recipientId = normalizeId((follower as any).user);
              if (!recipientId) continue;

              // Avoid notifying the creator if they follow their own location
              if (creatorId && recipientId === creatorId) continue;

              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: recipientId,
                  type: 'special_offer',
                  title: `New special: ${doc.title}`,
                  message: (doc.shortDescription || doc.description).slice(0, 100) +
                           ((doc.shortDescription || doc.description).length > 100 ? '...' : ''),
                  relatedTo: {
                    relationTo: 'specials',
                    value: doc.id,
                  },
                  read: false,
                },
              });
            }
          } catch (err) {
            req.payload.logger.error('Error creating special notifications:', err);
          }
        }

        return doc;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'URL-friendly identifier' } },
    { name: 'description', type: 'richText', required: true, editor: lexicalEditor({}) },
    { name: 'shortDescription', type: 'text' },
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
    { name: 'gallery', type: 'array', fields: [
      { name: 'image', type: 'upload', relationTo: 'media', required: true },
      { name: 'caption', type: 'text' },
    ] },
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
    { name: 'location', relationTo: 'locations', type: 'relationship' },
    { name: 'event', relationTo: 'events', type: 'relationship' },
    { name: 'specialType', type: 'select', options: [
      { label: 'Discount', value: 'discount' },
      { label: 'Happy Hour', value: 'happy_hour' },
      { label: 'Bundle', value: 'bundle' },
      { label: 'Other', value: 'other' },
    ] },
    { name: 'discountValue', type: 'group', fields: [
      { name: 'amount', type: 'number', required: true },
      { name: 'type', type: 'select', options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'Fixed', value: 'fixed' },
      ] },
    ] },
    { name: 'redemptionDetails', type: 'group', fields: [
      { name: 'instructions', type: 'text' },
      { name: 'code', type: 'text', label: 'Redemption Code' },
    ] },
    { name: 'startDate', type: 'date', required: true },
    { name: 'endDate', type: 'date' },
    { name: 'isOngoing', type: 'checkbox', label: 'No end date' },
    { name: 'daysAvailable', type: 'array', fields: [{ name: 'day', type: 'select', options: [
      { label: 'Sunday', value: 'Sunday' },
      { label: 'Monday', value: 'Monday' },
      { label: 'Tuesday', value: 'Tuesday' },
      { label: 'Wednesday', value: 'Wednesday' },
      { label: 'Thursday', value: 'Thursday' },
      { label: 'Friday', value: 'Friday' },
      { label: 'Saturday', value: 'Saturday' },
    ] }] },
    { name: 'timeRestrictions', type: 'group', fields: [
      { name: 'startTime', type: 'text', label: 'Start Time' },
      { name: 'endTime', type: 'text', label: 'End Time' },
    ] },
    { name: 'termsAndConditions', type: 'richText', editor: lexicalEditor({}), admin: { description: 'Terms and fine print' } },
    { name: 'restrictions', type: 'array', fields: [{ name: 'restriction', type: 'text' }] },
    { name: 'createdBy', type: 'relationship', relationTo: 'users' },
    { name: 'status', type: 'select', options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Review', value: 'review' },
      { label: 'Published', value: 'published' },
      { label: 'Archived', value: 'archived' },
      { label: 'Expired', value: 'expired' },
    ], required: true },
    { name: 'isFeatured', type: 'checkbox' },
    { name: 'isVerified', type: 'checkbox' },
    { name: 'redemptionCount', type: 'number', admin: { readOnly: true } },
    { name: 'saveCount', type: 'number', admin: { readOnly: true } },
    { name: 'hasBusinessPartnership', type: 'checkbox' },
    { name: 'partnershipDetails', type: 'group', fields: [
      { name: 'partnerName', type: 'text' },
      { name: 'partnerContact', type: 'text' },
      { name: 'details', type: 'text' },
    ] },
    { name: 'meta', type: 'group', fields: [
      { name: 'title', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'keywords', type: 'text' },
    ] },
  ],
};
