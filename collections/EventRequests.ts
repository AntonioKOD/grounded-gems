import { CollectionConfig } from 'payload';

export const EventRequests: CollectionConfig = {
  slug: 'eventRequests',
  labels: {
    singular: 'Event Request',
    plural: 'Event Requests',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'eventTitle',
    defaultColumns: ['eventTitle', 'location', 'requestedBy', 'status', 'requestedDate', 'createdAt'],
    group: 'Content Management',
  },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc;

        try {
          // Extract location ID properly (handle both string and populated object)
          const locationId = typeof doc.location === 'string' 
            ? doc.location 
            : doc.location?.id || doc.location;

          // Extract user IDs properly
          const requestedById = typeof doc.requestedBy === 'string'
            ? doc.requestedBy
            : doc.requestedBy?.id || doc.requestedBy;

          if (!locationId) {
            console.error('No valid location ID found:', doc.location);
            return doc;
          }

          // Handle status changes
          if (operation === 'update' && previousDoc && doc.status !== previousDoc.status) {
            const location = await req.payload.findByID({
              collection: 'locations',
              id: locationId,
            });

            // Notify the requester about status changes
            if (doc.status === 'approved') {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: requestedById,
                  type: 'event_request_approved',
                  title: `Event request approved for ${location.name}`,
                  message: `Your event "${doc.eventTitle}" has been approved by the location owner. You can now create your event!`,
                  relatedTo: {
                    relationTo: 'eventRequests',
                    value: doc.id,
                  },
                  actionBy: location.createdBy,
                  metadata: {
                    locationName: location.name,
                    eventTitle: doc.eventTitle,
                    requestedDate: doc.requestedDate,
                  },
                  priority: 'high',
                  read: false,
                },
              });
            } else if (doc.status === 'denied') {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: requestedById,
                  type: 'event_request_denied',
                  title: `Event request denied for ${location.name}`,
                  message: `Your event request "${doc.eventTitle}" was not approved. ${doc.denialReason || 'Please contact the location for more information.'}`,
                  relatedTo: {
                    relationTo: 'eventRequests',
                    value: doc.id,
                  },
                  actionBy: location.createdBy,
                  metadata: {
                    locationName: location.name,
                    eventTitle: doc.eventTitle,
                    denialReason: doc.denialReason,
                  },
                  priority: 'normal',
                  read: false,
                },
              });
            }
          }

          // Handle new event requests
          if (operation === 'create') {
            const location = await req.payload.findByID({
              collection: 'locations',
              id: locationId,
            });

            // Extract location owner ID properly
            const locationOwnerId = typeof location.createdBy === 'string'
              ? location.createdBy
              : location.createdBy?.id || location.createdBy;

            // Notify the location owner about new event request
            if (locationOwnerId) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: locationOwnerId,
                  type: 'event_request_received',
                  title: `New event request for ${location.name}`,
                  message: `Someone wants to host "${doc.eventTitle}" at your location on ${new Date(doc.requestedDate).toLocaleDateString()}.`,
                  relatedTo: {
                    relationTo: 'eventRequests',
                    value: doc.id,
                  },
                  actionBy: requestedById,
                  actionRequired: true,
                  actionStatus: 'pending',
                  metadata: {
                    locationName: location.name,
                    eventTitle: doc.eventTitle,
                    requestedDate: doc.requestedDate,
                    eventType: doc.eventType,
                    expectedAttendees: doc.expectedAttendees,
                    expectedGuests: doc.expectedGuests,
                  },
                  priority: 'high',
                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                  read: false,
                },
              });
            }
          }
        } catch (error) {
          console.error('Error creating event request notification:', error);
        }

        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'eventTitle',
      type: 'text',
      required: true,
      label: 'Event Title',
    },
    {
      name: 'eventDescription',
      type: 'textarea',
      required: true,
      label: 'Event Description',
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'Private Party', value: 'private_party' },
        { label: 'Corporate Event', value: 'corporate_event' },
        { label: 'Birthday Party', value: 'birthday_party' },
        { label: 'Wedding Reception', value: 'wedding_reception' },
        { label: 'Business Meeting', value: 'business_meeting' },
        { label: 'Product Launch', value: 'product_launch' },
        { label: 'Community Event', value: 'community_event' },
        { label: 'Fundraiser', value: 'fundraiser' },
        { label: 'Workshop', value: 'workshop' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      label: 'Requested Location',
      filterOptions: {
        // Only allow restaurants to have event requests
        'categories.name': {
          in: ['Restaurant', 'Bar', 'Cafe', 'Event Venue'],
        },
      },
    },
    {
      name: 'requestedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Requested By',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'requestedDate',
      type: 'date',
      required: true,
      label: 'Requested Event Date',
    },
    {
      name: 'requestedTime',
      type: 'text',
      required: true,
      label: 'Requested Time',
      admin: {
        placeholder: 'e.g., 7:00 PM - 10:00 PM',
      },
    },
    {
      name: 'expectedAttendees',
      type: 'number',
      required: true,
      label: 'Expected Number of Attendees',
      min: 1,
    },
    {
      name: 'expectedGuests',
      type: 'number',
      label: 'Expected Number of Guests',
      admin: {
        description: 'How many guests you expect to attend this event (optional)',
        placeholder: 'e.g., 50 for a large gathering, 10 for an intimate dinner',
      },
      min: 1,
    },
    {
      name: 'specialRequests',
      type: 'textarea',
      label: 'Special Requests',
      admin: {
        placeholder: 'Any special accommodations, menu preferences, decorations, etc.',
      },
    },
    {
      name: 'contactInfo',
      type: 'group',
      label: 'Contact Information',
      fields: [
        {
          name: 'phone',
          type: 'text',
          label: 'Phone Number',
        },
        {
          name: 'email',
          type: 'email',
          label: 'Email Address',
        },
        {
          name: 'preferredContact',
          type: 'select',
          label: 'Preferred Contact Method',
          options: [
            { label: 'Phone', value: 'phone' },
            { label: 'Email', value: 'email' },
            { label: 'In-App Message', value: 'in_app' },
          ],
        },
      ],
    },
    {
      name: 'budget',
      type: 'group',
      label: 'Budget Information',
      fields: [
        {
          name: 'estimatedBudget',
          type: 'number',
          label: 'Estimated Budget ($)',
        },
        {
          name: 'budgetRange',
          type: 'select',
          label: 'Budget Range',
          options: [
            { label: 'Under $500', value: 'under_500' },
            { label: '$500 - $1,000', value: '500_1000' },
            { label: '$1,000 - $2,500', value: '1000_2500' },
            { label: '$2,500 - $5,000', value: '2500_5000' },
            { label: '$5,000+', value: '5000_plus' },
          ],
        },
        {
          name: 'includesFood',
          type: 'checkbox',
          label: 'Includes Food Service',
        },
        {
          name: 'includesDrinks',
          type: 'checkbox',
          label: 'Includes Drink Service',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Denied', value: 'denied' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Expired', value: 'expired' },
      ],
      admin: {
        description: 'Status of the event request',
      },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Reviewed By',
      admin: {
        condition: (data) => data.status !== 'pending',
        description: 'Location owner or manager who reviewed this request',
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      label: 'Reviewed At',
      admin: {
        condition: (data) => data.status !== 'pending',
        readOnly: true,
      },
    },
    {
      name: 'denialReason',
      type: 'textarea',
      label: 'Reason for Denial',
      admin: {
        condition: (data) => data.status === 'denied',
        description: 'Explanation for why the request was denied',
      },
    },
    {
      name: 'approvalNotes',
      type: 'textarea',
      label: 'Approval Notes',
      admin: {
        condition: (data) => data.status === 'approved',
        description: 'Additional notes or conditions for the approved event',
      },
    },
    {
      name: 'linkedEvent',
      type: 'relationship',
      relationTo: 'events',
      label: 'Created Event',
      admin: {
        condition: (data) => data.status === 'approved',
        description: 'The actual event created after approval',
      },
    },
  ],
  indexes: [
    {
      fields: ['requestedBy', 'status'],
    },
    {
      fields: ['location', 'status'],
    },
    {
      fields: ['requestedDate'],
    },
  ],
}; 