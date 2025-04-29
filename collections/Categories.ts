import { CollectionConfig } from 'payload';

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Category',
    plural: 'Categories',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'type', 'isActive'],
  },
  fields: [
    // Basic Information
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'URL-friendly identifier' } },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Location', value: 'location' },
        { label: 'Event',    value: 'event' },
        { label: 'Special',  value: 'special' },
        { label: 'General',  value: 'general' },
      ],
    },
    { name: 'description', type: 'text' },

    // Hierarchy
    { name: 'parent', type: 'relationship', relationTo: 'categories' },
    { name: 'subcategories', type: 'relationship', relationTo: 'categories', hasMany: true, admin: { readOnly: true, description: 'Virtual: populated via custom logic' } },

    // Visual Elements
    { name: 'icon', type: 'relationship', relationTo: 'media' },
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
    { name: 'color', type: 'text', admin: { description: 'Hex color code' } },

    // Display Options
    { name: 'order', type: 'number', admin: { description: 'Display order priority' } },
    { name: 'isActive', type: 'checkbox', label: 'Active' },
    { name: 'isFeatured', type: 'checkbox', label: 'Featured' },

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
    { name: 'itemCount', type: 'number', admin: { readOnly: true, description: 'Count of items in this category' } },
  ],
};
