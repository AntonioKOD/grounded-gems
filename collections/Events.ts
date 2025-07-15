import { CollectionConfig } from 'payload';

export const Events: CollectionConfig = {
  slug: 'events',
  labels: {
    singular: 'Event',
    plural: 'Events',
  },
  access: {
    read: ({ req }) => {
      // If no user is logged in, only show public events
      if (!req.user) {
        return {
          privacy: { equals: 'public' },
          status: { equals: 'published' }
        } as any;
      }

      // If user is logged in, show public events and private events they have access to
      return {
        or: [
          {
            privacy: { equals: 'public' },
            status: { equals: 'published' }
          },
          {
            privacy: { equals: 'private' },
            privateAccess: { in: [req.user.id] }
          },
          {
            organizer: { equals: req.user.id }
          },
          {
            coOrganizers: { in: [req.user.id] }
          }
        ]
      } as any;
    },
    create: ({ req }) => {
      // Any authenticated user can create events
      return !!req.user;
    },
    update: ({ req }) => {
      // Users can update their own events, admins can update any
      if (!req.user) return false;
      
      if (req.user.role === 'admin') return true;
      
      return {
        or: [
          { organizer: { equals: req.user.id } },
          { coOrganizers: { in: [req.user.id] } }
        ]
      } as any;
    },
    delete: async ({ req }) => {
      // Users can delete their own events, admins can delete any
      if (!req.user) return false;
      
      if (req.user.role === 'admin') return true;
      
      return {
        organizer: { equals: req.user.id }
      };
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'startDate', 'status'],
  },
  hooks: {
    beforeChange: [
      async ({ req, data, operation }) => {
        // Debug logging
        console.log('Events beforeChange hook triggered:', {
          operation,
          dataKeys: Object.keys(data || {}),
          dataValues: data,
          headers: req.headers,
          body: req.body
        })

        // Skip conflict check if this is triggered by an RSVP update
        // Check multiple indicators that this is an RSVP operation
        const isFromRSVP = (
          // Check if the request has specific headers indicating RSVP operation
          req.headers && typeof req.headers.get === 'function' && req.headers.get('x-operation-source') === 'rsvp-update' ||
          // Check if this is an update operation that only modifies count fields
          (operation === 'update' && 
           data && 
           Object.keys(data).length <= 3 && 
           (data.interestedCount !== undefined || 
            data.goingCount !== undefined || 
            data.invitedCount !== undefined) &&
           // Ensure we're not updating critical event fields
           !data.name && 
           !data.startDate && 
           !data.endDate && 
           !data.location &&
           !data.organizer &&
           !data.description &&
           !data.slug &&
           !data.category &&
           !data.eventType &&
           !data.capacity &&
           !data.status &&
           !data.image)
        )
        
        if (isFromRSVP) {
          console.log('Skipping event conflict check - RSVP operation detected')
          return data
        }

        // Check for date/time conflicts when creating or updating events
        if ((operation === 'create' || operation === 'update') && data.location && data.startDate) {
          try {
            const startDate = new Date(data.startDate)
            const endDate = data.endDate ? new Date(data.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours

            // Query for existing events at the same location that overlap with this time
            const overlappingEvents = await req.payload.find({
              collection: 'events',
              where: {
                and: [
                  {
                    location: {
                      equals: data.location,
                    },
                  },
                  {
                    status: {
                      not_equals: 'cancelled',
                    },
                  },
                  {
                    or: [
                      // Event starts during existing event
                      {
                        and: [
                          {
                            startDate: {
                              less_than_equal: startDate.toISOString(),
                            },
                          },
                          {
                            or: [
                              {
                                endDate: {
                                  greater_than: startDate.toISOString(),
                                },
                              },
                              {
                                // If no end date, assume it ends 2 hours after start
                                and: [
                                  {
                                    endDate: {
                                      exists: false,
                                    },
                                  },
                                  {
                                    startDate: {
                                      greater_than: new Date(startDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                                    },
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      // Event ends during existing event
                      {
                        and: [
                          {
                            startDate: {
                              less_than: endDate.toISOString(),
                            },
                          },
                          {
                            or: [
                              {
                                endDate: {
                                  greater_than_equal: endDate.toISOString(),
                                },
                              },
                              {
                                // If no end date, assume it ends 2 hours after start
                                startDate: {
                                  greater_than_equal: new Date(endDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                                },
                              },
                            ],
                          },
                        ],
                      },
                      // Event completely contains existing event
                      {
                        and: [
                          {
                            startDate: {
                              greater_than_equal: startDate.toISOString(),
                            },
                          },
                          {
                            or: [
                              {
                                endDate: {
                                  less_than_equal: endDate.toISOString(),
                                },
                              },
                              {
                                startDate: {
                                  less_than_equal: endDate.toISOString(),
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            })

            // Exclude current event from overlap check if updating
            const conflictingEvents = overlappingEvents.docs.filter(event => 
              operation === 'create' || event.id !== data.id
            )

            if (conflictingEvents.length > 0) {
              const conflictEvent = conflictingEvents[0];
              if (conflictEvent) {
                const conflictStart = new Date(conflictEvent.startDate).toLocaleString();
                const conflictEnd = conflictEvent.endDate 
                  ? new Date(conflictEvent.endDate).toLocaleString()
                  : 'TBD';
                throw new Error(
                  `Event time conflict detected. Another event "${conflictEvent.name}" is already scheduled at this location from ${conflictStart} to ${conflictEnd}. Please choose a different time slot.`
                );
              }
            }
          } catch (error: unknown) {
            console.error('Error checking event conflicts:', error)
            if (error instanceof Error && error.message.includes('Event time conflict')) {
              throw error // Re-throw conflict errors
            }
            // Continue with creation/update if conflict check fails for other reasons
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ req, doc, operation }) => {
        if (!req.payload) return doc

        try {
          // Create notifications for event creation/updates
          if (operation === 'create') {
            // Notify location owner about new event
            const location = await req.payload.findByID({
              collection: 'locations',
              id: doc.location,
            })

            if (location.createdBy && location.createdBy !== doc.organizer) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: location.createdBy,
                  type: 'event_created',
                  title: `New event at ${location.name}`,
                  message: `"${doc.name}" has been scheduled at your location on ${new Date(doc.startDate).toLocaleDateString()}.`,
                  relatedTo: {
                    relationTo: 'events',
                    value: doc.id,
                  },
                  actionBy: doc.organizer,
                  metadata: {
                    locationName: location.name,
                    eventName: doc.name,
                    eventDate: doc.startDate,
                  },
                  priority: 'normal',
                  read: false,
                },
              })
            }

            // Notify subscribers of the location about new event
            const subscribers = await req.payload.find({
              collection: 'locationSubscriptions',
              where: {
                and: [
                  {
                    location: {
                      equals: doc.location,
                    },
                  },
                  {
                    isActive: {
                      equals: true,
                    },
                  },
                  {
                    or: [
                      {
                        notificationType: {
                          equals: 'all',
                        },
                      },
                      {
                        notificationType: {
                          equals: 'events',
                        },
                      },
                    ],
                  },
                ],
              },
            })

            // Create notifications for subscribers
            for (const subscription of subscribers.docs) {
              if (subscription.user !== doc.organizer) {
                await req.payload.create({
                  collection: 'notifications',
                  data: {
                    recipient: subscription.user,
                    type: 'location_event',
                    title: `New event at ${location.name}`,
                    message: `"${doc.name}" is happening on ${new Date(doc.startDate).toLocaleDateString()}. Don't miss out!`,
                    relatedTo: {
                      relationTo: 'events',
                      value: doc.id,
                    },
                    metadata: {
                      locationName: location.name,
                      eventName: doc.name,
                      eventDate: doc.startDate,
                      eventType: doc.eventType,
                    },
                    priority: 'normal',
                    read: false,
                  },
                })
              }
            }
          }

          // Handle status changes
          if (operation === 'update' && doc.status === 'cancelled') {
            // Notify attendees about cancellation
            const rsvps = await req.payload.find({
              collection: 'eventRSVPs',
              where: {
                event: {
                  equals: doc.id,
                },
              },
            })

            for (const rsvp of rsvps.docs) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: rsvp.user,
                  type: 'event_cancelled',
                  title: `Event cancelled: ${doc.name}`,
                  message: `Unfortunately, "${doc.name}" scheduled for ${new Date(doc.startDate).toLocaleDateString()} has been cancelled.`,
                  relatedTo: {
                    relationTo: 'events',
                    value: doc.id,
                  },
                  actionBy: doc.organizer,
                  metadata: {
                    eventName: doc.name,
                    eventDate: doc.startDate,
                  },
                  priority: 'high',
                  read: false,
                },
              })
            }
          }
        } catch (error) {
          console.error('Error creating event notifications:', error)
        }

        return doc
      },
    ],
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
    { 
      name: 'endDate', 
      type: 'date',
      admin: {
        description: 'If not specified, event duration defaults to 2 hours'
      }
    },

    // Duration in minutes (alternative to end date)
    {
      name: 'durationMinutes',
      type: 'number',
      admin: {
        description: 'Event duration in minutes (used if end date is not specified)',
      },
    },

    // Category selection
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Entertainment', value: 'entertainment' },
        { label: 'Education',      value: 'education'      },
        { label: 'Social',         value: 'social'         },
        { label: 'Business',       value: 'business'       },
        { label: 'Other',          value: 'other'          },
      ],
    },

    // Event type
    {
      name: 'eventType',
      type: 'select',
      options: [
        { label: 'Workshop',             value: 'workshop'             },
        { label: 'Concert',              value: 'concert'              },
        { label: 'Meetup',               value: 'meetup'               },
        { label: 'Social Event',         value: 'social_event'         },
        { label: 'Other',                value: 'other_event'          },
      ],
    },

    // Linked location
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: false,
      required: true,
    },

    // Event request reference (if created from a request)
    {
      name: 'eventRequest',
      type: 'relationship',
      relationTo: 'eventRequests',
      hasMany: false,
      admin: {
        description: 'If this event was created from an event request',
      },
    },

    // Capacity & attendance
    {
      name: 'capacity',
      type: 'number',
      admin: { description: 'Max attendees' },
    },

    // Current attendance count (calculated)
    {
      name: 'attendeeCount',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Current number of confirmed attendees',
      },
    },

    // RSVP status counts (calculated)
    {
      name: 'interestedCount',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Number of users interested in this event',
      },
    },
    {
      name: 'goingCount',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Number of users confirmed going to this event',
      },
    },
    {
      name: 'invitedCount',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Number of users invited to this event',
      },
    },

    // Organizer
    {
      name: 'organizer',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },

    // Privacy settings
    {
      name: 'privacy',
      type: 'select',
      defaultValue: 'public',
      options: [
        { label: '🌍 Public', value: 'public' },
        { label: '🔒 Private', value: 'private' },
      ],
      admin: {
        description: 'Control who can see this event'
      }
    },
    {
      name: 'privateAccess',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        description: 'Friends who can access this private event',
        condition: (data) => data.privacy === 'private'
      }
    },

    // Co-organizers
    {
      name: 'coOrganizers',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        description: 'Additional organizers who can manage this event',
      },
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

    // Event tags for better discovery
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
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
