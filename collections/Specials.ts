import { CollectionConfig } from 'payload';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

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
  fields: [
    // Basic Information
    { name: 'title', type: 'text', required: true },
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

    // Related Content
    { name: 'location', relationTo: 'locations', type: 'relationship' },
    { name: 'event', relationTo: 'events', type: 'relationship' },

    // Special Details
    {
      name: 'specialType',
      type: 'select',
      options: [
        { label: 'Discount', value: 'discount' },
        { label: 'Happy Hour', value: 'happy_hour' },
        { label: 'Bundle', value: 'bundle' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'discountValue',
      type: 'group',
      fields: [
        { name: 'amount', type: 'number', required: true },
        { name: 'type', type: 'select', options: [
            { label: 'Percentage', value: 'percentage' },
            { label: 'Fixed', value: 'fixed' },
          ] },
      ],
    },
    {
      name: 'redemptionDetails',
      type: 'group',
      fields: [
        { name: 'instructions', type: 'text' },
        { name: 'code', type: 'text', label: 'Redemption Code' },
      ],
    },

    // Date and Time
    { name: 'startDate', type: 'date', required: true },
    { name: 'endDate', type: 'date' },
    { name: 'isOngoing', type: 'checkbox', label: 'No end date' },
    {
      name: 'daysAvailable',
      type: 'array',
      fields: [{ name: 'day', type: 'select', options: [
        { label: 'Sunday', value: 'Sunday' },
        { label: 'Monday', value: 'Monday' },
        { label: 'Tuesday', value: 'Tuesday' },
        { label: 'Wednesday', value: 'Wednesday' },
        { label: 'Thursday', value: 'Thursday' },
        { label: 'Friday', value: 'Friday' },
        { label: 'Saturday', value: 'Saturday' },
      ] }],
    },
    {
      name: 'timeRestrictions',
      type: 'group',
      fields: [
        { name: 'startTime', type: 'text', label: 'Start Time' },
        { name: 'endTime', type: 'text', label: 'End Time' },
      ],
    },

    // Terms and Conditions
    { name: 'termsAndConditions', type: 'richText', editor: lexicalEditor({}), admin: { description: 'Terms and fine print' } },
    { name: 'restrictions', type: 'array', fields: [{ name: 'restriction', type: 'text' }] },

    // Creator & Status
    { name: 'createdBy', type: 'relationship', relationTo: 'users' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Review', value: 'review' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
        { label: 'Expired', value: 'expired' },
      ],
      required: true,
    },
    { name: 'isFeatured', type: 'checkbox' },
    { name: 'isVerified', type: 'checkbox' },

    // Monetization & Analytics
    { name: 'redemptionCount', type: 'number', admin: { readOnly: true } },
    { name: 'saveCount', type: 'number', admin: { readOnly: true } },
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
  ],
};
