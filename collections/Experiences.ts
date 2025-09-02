import { CollectionConfig } from 'payload';

export const Experiences: CollectionConfig = {
  slug: 'experiences',
  labels: { 
    singular: 'Experience', 
    plural: 'Experiences' 
  },
  
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'city', 'status', 'contestEligible', 'owner', 'createdAt'],
    group: 'Content',
    description: 'User experiences and stories that can be entered into contests',
  },

  access: {
    read: ({ req }) => {
      // Public read access only for published experiences
      if (!req.user) {
        return {
          status: { equals: 'PUBLISHED' }
        };
      }
      
      // Authenticated users can read all experiences
      return true;
    },
    
    create: ({ req }) => {
      // Only authenticated users can create experiences
      return !!req.user;
    },
    
    update: ({ req, data }) => {
      // Only owner or admins can update
      if (!req.user) return false;
      
      // Admins can update anything
      if (req.user.role === 'admin') return true;
      
      // Users can only update their own experiences
      return {
        owner: { equals: req.user.id }
      };
    },
    
    delete: ({ req, data }) => {
      // Only owner or admins can delete
      if (!req.user) return false;
      
      // Admins can delete anything
      if (req.user.role === 'admin') return true;
      
      // Users can only delete their own experiences
      return {
        owner: { equals: req.user.id }
      };
    },
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Experience Title',
      admin: {
        description: 'A compelling title for the experience',
      },
      validate: (value: string | null | undefined) => {
        if (!value || value.trim().length < 3) {
          return 'Title must be at least 3 characters long';
        }
        if (value.trim().length > 100) {
          return 'Title must be less than 100 characters';
        }
        return true;
      },
    },
    
    {
      name: 'city',
      type: 'text',
      required: true,
      label: 'City',
      admin: {
        description: 'The city where this experience took place',
      },
      validate: (value: string | null | undefined) => {
        if (!value || value.trim().length < 2) {
          return 'City must be at least 2 characters long';
        }
        return true;
      },
    },
    
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Detailed description of the experience',
        rows: 6,
      },
      validate: (value: string | null | undefined) => {
        if (value && value.length > 2000) {
          return 'Description must be less than 2000 characters';
        }
        return true;
      },
    },
    
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      label: 'Media',
      admin: {
        description: 'Upload photos or videos related to this experience',
      },
      filterOptions: {
        mimeType: { in: ['image/*', 'video/*'] },
      },
    },
    
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'PUBLISHED',
      options: [
        {
          label: 'Draft',
          value: 'DRAFT',
        },
        {
          label: 'Published',
          value: 'PUBLISHED',
        },
        {
          label: 'Rejected',
          value: 'REJECTED',
        },
      ],
      admin: {
        description: 'Current status of the experience',
        position: 'sidebar',
      },
    },
    
    {
      name: 'contestEligible',
      type: 'checkbox',
      defaultValue: false,
      label: 'Contest Eligible',
      admin: {
        description: 'Check if this experience is eligible for contests',
        position: 'sidebar',
      },
    },
    
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Owner',
      admin: {
        description: 'The user who created this experience',
        position: 'sidebar',
        readOnly: true, // Should be set automatically
      },
      hasMany: false,
    },
    
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      admin: {
        description: 'Add relevant tags to help categorize this experience',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
      maxRows: 10,
    },
    
    {
      name: 'rating',
      type: 'number',
      label: 'Rating',
      admin: {
        description: 'User rating of this experience (1-5)',
        position: 'sidebar',
      },
      min: 1,
      max: 5,
      validate: (value: number | null | undefined) => {
        if (value && (value < 1 || value > 5)) {
          return 'Rating must be between 1 and 5';
        }
        return true;
      },
    },
    
    {
      name: 'location',
      type: 'group',
      label: 'Location Details',
      admin: {
        description: 'Additional location information',
      },
      fields: [
        {
          name: 'state',
          type: 'text',
          label: 'State/Province',
        },
        {
          name: 'country',
          type: 'text',
          label: 'Country',
        },
        {
          name: 'coordinates',
          type: 'group',
          label: 'Coordinates',
          fields: [
            {
              name: 'latitude',
              type: 'number',
              label: 'Latitude',
                          validate: (value: number | null | undefined) => {
              if (value && (value < -90 || value > 90)) {
                return 'Latitude must be between -90 and 90';
              }
              return true;
            },
            },
            {
              name: 'longitude',
              type: 'number',
              label: 'Longitude',
                          validate: (value: number | null | undefined) => {
              if (value && (value < -180 || value > 180)) {
                return 'Longitude must be between -180 and 180';
              }
              return true;
            },
            },
          ],
        },
      ],
    },
    
    {
      name: 'metadata',
      type: 'group',
      label: 'Metadata',
      admin: {
        description: 'Additional metadata for the experience',
      },
      fields: [
        {
          name: 'season',
          type: 'select',
          label: 'Season',
          options: [
            { label: 'Spring', value: 'spring' },
            { label: 'Summer', value: 'summer' },
            { label: 'Fall', value: 'fall' },
            { label: 'Winter', value: 'winter' },
          ],
        },
        {
          name: 'duration',
          type: 'text',
          label: 'Duration',
          admin: {
            description: 'How long the experience lasted (e.g., "2 hours", "1 day")',
          },
        },
        {
          name: 'cost',
          type: 'number',
          label: 'Cost',
          admin: {
            description: 'Approximate cost of the experience',
          },
          min: 0,
        },
        {
          name: 'difficulty',
          type: 'select',
          label: 'Difficulty Level',
          options: [
            { label: 'Easy', value: 'easy' },
            { label: 'Moderate', value: 'moderate' },
            { label: 'Challenging', value: 'challenging' },
            { label: 'Expert', value: 'expert' },
          ],
        },
      ],
    },
    
    {
      name: 'upvotesCount',
      type: 'number',
      label: 'Contest Upvotes Count',
      admin: {
        description: 'Number of upvotes this experience has received in contests',
        readOnly: true,
        position: 'sidebar',
      },
      defaultValue: 0,
      min: 0,
      validate: (value: number | null | undefined) => {
        if (value && value < 0) {
          return 'Upvotes count cannot be negative';
        }
        return true;
      },
    },
  ],

  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-set owner on create
        if (operation === 'create' && req.user && !data.owner) {
          data.owner = req.user.id;
        }
        
        // Auto-update status if contestEligible is true but status is DRAFT
        if (data.contestEligible && data.status === 'DRAFT') {
          data.status = 'PUBLISHED';
        }
        
        return data;
      },
    ],
    
    afterChange: [
      async ({ req, doc, operation }) => {
        // Log experience creation/updates for analytics
        if (req.payload) {
          console.log(`📝 Experience ${operation}: ${doc.title} by ${doc.owner}`);
          
          // If this is a new published experience, could trigger notifications
          if (operation === 'create' && doc.status === 'PUBLISHED') {
            // Could add notification logic here for followers, etc.
          }
        }
      },
    ],
  },


};

export default Experiences;
