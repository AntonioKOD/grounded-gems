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
    defaultColumns: ['name', 'slug', 'type', 'source', 'isActive'],
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
    
    // Source tracking
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Foursquare', value: 'foursquare' },
        { label: 'Imported', value: 'imported' },
      ],
    },
    
    // Foursquare-specific fields
    { 
      name: 'foursquareId', 
      type: 'text', 
      admin: { 
        description: 'Foursquare category ID',
        condition: (data) => data.source === 'foursquare'
      } 
    },
    { 
      name: 'foursquarePluralName', 
      type: 'text', 
      admin: { 
        description: 'Foursquare plural name',
        condition: (data) => data.source === 'foursquare'
      } 
    },
    { 
      name: 'foursquareShortName', 
      type: 'text', 
      admin: { 
        description: 'Foursquare short name',
        condition: (data) => data.source === 'foursquare'
      } 
    },
    {
      name: 'foursquareIcon',
      type: 'group',
      admin: { 
        condition: (data) => data.source === 'foursquare' 
      },
      fields: [
        { name: 'prefix', type: 'text' },
        { name: 'suffix', type: 'text' },
      ],
    },

    // Hierarchy
    { name: 'parent', type: 'relationship', relationTo: 'categories' },
    { name: 'subcategories', type: 'relationship', relationTo: 'categories', hasMany: true, admin: { readOnly: true, description: 'Virtual: populated via custom logic' } },

    // Visual Elements
    { name: 'icon', type: 'relationship', relationTo: 'media' },
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
    { name: 'color', type: 'text', admin: { description: 'Hex color code' } },

    // Display Options
    { name: 'order', type: 'number', admin: { description: 'Display order priority' } },
    { name: 'isActive', type: 'checkbox', label: 'Active', defaultValue: true },
    { name: 'isFeatured', type: 'checkbox', label: 'Featured' },
    { name: 'showInFilter', type: 'checkbox', label: 'Show in Filter', defaultValue: true, admin: { description: 'Show this category in location filters' } },

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

    // Statistics
    { name: 'itemCount', type: 'number', admin: { readOnly: true, description: 'Count of items in this category' } },
    { name: 'lastSyncDate', type: 'date', admin: { readOnly: true, description: 'Last sync with external source' } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate slug if not provided
        if (!data.slug && data.name) {
          data.slug = data.name
            .toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '-');
        }
        
        // Update last sync date for external sources
        if (data.source !== 'manual' && operation === 'update') {
          data.lastSyncDate = new Date();
        }
        
        return data;
      },
    ],
  },
};
