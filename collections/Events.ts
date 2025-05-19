import { CollectionConfig } from 'payload';

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
    defaultColumns: ['name', 'startDate', 'status'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },

    // Event image
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Primary image for the event' },
    },

    // Core details
    { name: 'description', type: 'text', required: true },
    { name: 'startDate', type: 'date', required: true },
    { name: 'endDate', type: 'date' },

    // Category selection
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Entertainment', value: 'entertainment' },
        { label: 'Education',      value: 'education'      },
        { label: 'Social',         value: 'social'         },
        { label: 'Business',       value: 'business'       },
        { label: 'Sports',         value: 'sports'         },
        { label: 'Other',          value: 'other'          },
      ],
  
    },

    // Event type (e.g., workshop, meetup, sports matchmaking)
    {
      name: 'eventType',
      type: 'select',
      options: [
        { label: 'Workshop',             value: 'workshop'             },
        { label: 'Concert',              value: 'concert'              },
        { label: 'Meetup',               value: 'meetup'               },
        { label: 'Webinar',              value: 'webinar'              },
        { label: 'Sports Matchmaking',   value: 'sports_matchmaking'   },
        { label: 'Sports Tournament',    value: 'sports_tournament'    },
        { label: 'Social Event',         value: 'social_event'         },
        { label: 'Other',                value: 'other_event'          },
      ],
      
    },

    // If category is Sports, suggest specific sports types
    {
      name: 'sportType',
      type: 'select',
      options: [
        { label: 'Tennis',      value: 'tennis'      },
        { label: 'Soccer',      value: 'soccer'      },
        { label: 'Basketball',  value: 'basketball'  },
        { label: 'Volleyball',  value: 'volleyball'  },
        { label: 'Running',     value: 'running'     },
        { label: 'Cycling',     value: 'cycling'     },
        { label: 'Swimming',    value: 'swimming'    },
        { label: 'Golf',        value: 'golf'        },
        { label: 'Other',       value: 'other_sport' },
      ],
      required: false,
      admin: {
        condition: data => data.category === 'sports',
        description: 'Select the specific sport for sports events',
      },
    },

    // Linked location
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: false,
      required: true,
    },

    // Capacity & attendance
    {
      name: 'capacity',
      type: 'number',
      admin: { description: 'Max attendees' },
    },

    // Organizer
    {
      name: 'organizer',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },

    // Status & visibility
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft',     value: 'draft'     },
        { label: 'Published', value: 'published' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Postponed', value: 'postponed' },
      ],
      defaultValue: 'draft',
      required: true,
    },

    // SEO metadata
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title',       type: 'text' },
        { name: 'description', type: 'text' },
      ],
    },

    // Virtual join to RSVPs
    {
      name: 'rsvps',
      label: 'RSVPs',
      type: 'relationship',
      relationTo: 'eventRSVPs',
      admin: { position: 'sidebar' },
    },
  ],
};
