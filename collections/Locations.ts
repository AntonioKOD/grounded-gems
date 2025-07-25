import { CollectionConfig } from 'payload';
// import type { Access, AccessResult } from 'payload/config';

export const Locations: CollectionConfig = {
  slug: 'locations',
  labels: {
    singular: 'Location',
    plural: 'Locations',
  },
  access: {
    read: ({req}) => {
      if (!req.user) {
        return {
          privacy: { equals: 'public' },
          status: { equals: 'published' }
        } as any;
      }

      // Allow admins to read all locations
      if (req.user.role === 'admin') {
        return true;
      }

      // Normal user logic
      return {
        or: [
          { privacy: { equals: 'public' }, status: { equals: 'published' } },
          { privacy: { equals: 'private' }, privateAccess: { in: [req.user.id] } },
          { createdBy: { equals: req.user.id } }
        ]
      } as any;
    },
    create: ({ req }) => {
      // Any authenticated user can create locations
      return !!req.user;
    },
    update: async ({ req }) => {
      // Users can update their own locations, admins can update any
      if (!req.user) return false;
      
      if (req.user.role === 'admin') return true;
      
      return {
        createdBy: { equals: req.user.id }
      };
    },
    delete: async ({ req }) => {
      // Users can delete their own locations, admins can delete any
      if (!req.user) return false;
      
      if (req.user.role === 'admin') return true;
      
      return {
        createdBy: { equals: req.user.id }
      };
    }
,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Ensure proper image ordering and primary image management
        if (data.gallery && Array.isArray(data.gallery)) {
          // Sort gallery by order
          data.gallery.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          
          // Check if any gallery image is marked as primary
          const primaryGalleryImage = data.gallery.find((item: any) => item.isPrimary);
          
          // If a gallery image is marked as primary, set it as featuredImage
          if (primaryGalleryImage) {
            data.featuredImage = primaryGalleryImage.image;
            // Ensure only one image is marked as primary
            data.gallery = data.gallery.map((item: any, index: number) => ({
              ...item,
              isPrimary: item === primaryGalleryImage,
              order: item.order !== undefined ? item.order : index
            }));
          } else if (data.gallery.length > 0 && !data.featuredImage) {
            // If no featured image is set and no gallery image is primary, use first gallery image
            data.featuredImage = data.gallery[0].image;
            data.gallery[0].isPrimary = true;
            data.gallery[0].order = 0;
          }
          
          // Ensure all gallery items have proper order values
          data.gallery = data.gallery.map((item: any, index: number) => ({
            ...item,
            order: item.order !== undefined ? item.order : index
          }));
        }
        
        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc;

        // Determine the creator ID (string or object)
        let creatorId: string | undefined;
        if (typeof doc.createdBy === 'string') {
          creatorId = doc.createdBy;
        } else if (typeof doc.createdBy === 'object' && doc.createdBy?.id) {
          creatorId = doc.createdBy.id as string;
        }

        try {
          // Notify when a location is marked verified
          if (
            operation === 'update' &&
            previousDoc?.isVerified === false &&
            doc.isVerified === true &&
            creatorId
          ) {
            console.log('Creating location verified notification:', {
              creatorId,
              locationName: doc.name,
              locationId: doc.id
            });
            
            const notification = await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: creatorId,
                type: 'location_verified',
                title: `Your location "${doc.name}" has been verified!`,
                message: 'Your location listing is now verified and will be featured more prominently.',
                priority: 'high',
                relatedTo: {
                  relationTo: 'locations',
                  value: doc.id,
                },
                metadata: {
                  locationName: doc.name,
                },
                read: false,
              },
            });
            
            console.log('Location verified notification created successfully:', notification.id);
          }

          // Notify when a location is marked as featured
          if (
            operation === 'update' &&
            previousDoc?.isFeatured === false &&
            doc.isFeatured === true &&
            creatorId
          ) {
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: creatorId,
                type: 'location_featured',
                title: `Your location "${doc.name}" is now featured!`,
                message: 'Your location has been selected as a featured location and will get extra visibility.',
                priority: 'high',
                relatedTo: {
                  relationTo: 'locations',
                  value: doc.id,
                },
                metadata: {
                  locationName: doc.name,
                },
                read: false,
              },
            });
          }

          // Notify when location status changes to published
          if (
            operation === 'update' &&
            previousDoc?.status !== 'published' &&
            doc.status === 'published' &&
            creatorId
          ) {
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: creatorId,
                type: 'location_published',
                title: `Your location "${doc.name}" is now live!`,
                message: 'Your location has been published and is now visible to all users.',
                priority: 'normal',
                relatedTo: {
                  relationTo: 'locations',
                  value: doc.id,
                },
                metadata: {
                  locationName: doc.name,
                },
                read: false,
              },
            });
          }

          // Notify when average rating reaches milestones
          if (
            operation === 'update' &&
            doc.averageRating &&
            previousDoc?.averageRating !== doc.averageRating &&
            creatorId
          ) {
            const milestones = [4.0, 4.5, 4.8, 5.0];
            const newRating = doc.averageRating;
            const oldRating = previousDoc?.averageRating || 0;
            
            const achievedMilestone = milestones.find(
              milestone => newRating >= milestone && oldRating < milestone
            );

            if (achievedMilestone) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: creatorId,
                  type: 'location_milestone',
                  title: `Amazing! Your location reached ${achievedMilestone} stars!`,
                  message: `"${doc.name}" now has an average rating of ${newRating.toFixed(1)} stars based on ${doc.reviewCount || 0} reviews.`,
                  priority: 'high',
                  relatedTo: {
                    relationTo: 'locations',
                    value: doc.id,
                  },
                  metadata: {
                    locationName: doc.name,
                    milestone: achievedMilestone,
                    averageRating: newRating,
                    reviewCount: doc.reviewCount,
                  },
                  read: false,
                },
              });
            }
          }

          // Notify when review count reaches milestones
          if (
            operation === 'update' &&
            doc.reviewCount &&
            previousDoc?.reviewCount !== doc.reviewCount &&
            creatorId
          ) {
            const reviewMilestones = [10, 25, 50, 100, 250, 500];
            const newCount = doc.reviewCount;
            const oldCount = previousDoc?.reviewCount || 0;
            
            const achievedMilestone = reviewMilestones.find(
              milestone => newCount >= milestone && oldCount < milestone
            );

            if (achievedMilestone) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: creatorId,
                  type: 'location_milestone',
                  title: `Congratulations! ${achievedMilestone} reviews milestone reached!`,
                  message: `"${doc.name}" now has ${newCount} reviews. Thank you for providing a great experience!`,
                  priority: 'normal',
                  relatedTo: {
                    relationTo: 'locations',
                    value: doc.id,
                  },
                  metadata: {
                    locationName: doc.name,
                    milestone: achievedMilestone,
                    milestoneType: 'reviews',
                    reviewCount: newCount,
                  },
                  read: false,
                },
              });
            }
          }

        } catch (error) {
          console.error('Error creating location notification:', error);
          // Don't fail the main operation if notification fails
        }

        // Ensure any new user-submitted gallery photo is also in communityPhotos
        try {
          if (Array.isArray(doc.gallery)) {
            // Find gallery items that are not in communityPhotos
            const communityPhotos = Array.isArray(doc.communityPhotos) ? doc.communityPhotos : [];
            const newCommunityPhotos = doc.gallery
              .filter((g: any) => g.submittedBy && !communityPhotos.some((cp: any) => String(cp.photo) == String(g.image)))
              .map((g: any) => ({
                photo: g.image,
                caption: g.caption || '',
                submittedBy: g.submittedBy,
                submittedAt: new Date().toISOString(),
                status: 'approved',
              }));
            if (newCommunityPhotos.length > 0) {
              await req.payload.update({
                collection: 'locations',
                id: doc.id,
                data: {
                  communityPhotos: [...communityPhotos, ...newCommunityPhotos],
                },
              });
            }
          }
        } catch (err) {
          console.error('Error syncing gallery to communityPhotos:', err);
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
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: false,
      admin: {
        description: 'Primary image that will be displayed first across the platform'
      }
    },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
        {
          name: 'isPrimary',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Mark as primary image (will override featuredImage)'
          }
        },
        {
          name: 'order',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Display order (0 = first, 1 = second, etc.)'
          }
        },
        {
          name: 'altText',
          type: 'text',
          admin: {
            description: 'Alternative text for accessibility'
          }
        },
        {
          name: 'tags',
          type: 'array',
          fields: [
            {
              name: 'tag',
              type: 'select',
              options: [
                { label: 'Exterior', value: 'exterior' },
                { label: 'Interior', value: 'interior' },
                { label: 'Food', value: 'food' },
                { label: 'Menu', value: 'menu' },
                { label: 'Staff', value: 'staff' },
                { label: 'Atmosphere', value: 'atmosphere' },
                { label: 'Event', value: 'event' },
              ]
            }
          ]
        }
      ],
      admin: {
        description: 'Gallery images will be automatically ordered with the first image as primary'
      }
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
    {
      name: 'insiderTips',
      type: 'array',
      admin: {
        description: 'Structured insider tips that only locals would know'
      },
      fields: [
        {
          name: 'category',
          type: 'select',
          options: [
            { label: '⏰ Best Times to Visit', value: 'timing' },
            { label: '🍽️ Food & Drinks', value: 'food' },
            { label: '💡 Local Secrets', value: 'secrets' },
            { label: '🎯 Pro Tips', value: 'protips' },
            { label: '🚗 Getting There', value: 'access' },
            { label: '💰 Money Saving', value: 'savings' },
            { label: '📱 What to Order/Try', value: 'recommendations' },
            { label: '🎪 Hidden Features', value: 'hidden' },
          ]
        },
        {
          name: 'tip',
          type: 'text',
          admin: {
            description: 'The actual tip (keep it concise and actionable)'
          }
        },
        {
          name: 'priority',
          type: 'select',
          defaultValue: 'medium',
          options: [
            { label: '🔥 Essential', value: 'high' },
            { label: '⭐ Helpful', value: 'medium' },
            { label: '💡 Nice to Know', value: 'low' },
          ]
        },
        {
          name: 'isVerified',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Has this tip been verified by locals/staff?'
          }
        },
        {
          name: 'source',
          type: 'select',
          defaultValue: 'ai_generated',
          options: [
            { label: '🤖 AI Generated', value: 'ai_generated' },
            { label: '👥 User Submitted', value: 'user_submitted' },
            { label: '🏢 Business Provided', value: 'business_provided' },
            { label: '✅ Staff Verified', value: 'staff_verified' },
          ]
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: '⏳ Pending Review', value: 'pending' },
            { label: '✅ Approved', value: 'approved' },
            { label: '❌ Rejected', value: 'rejected' },
          ],
          admin: {
            description: 'Approval status for user-submitted tips'
          }
        },
        {
          name: 'submittedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'User who submitted this tip',
            condition: (data) => data.source === 'user_submitted'
          }
        },
        {
          name: 'submittedAt',
          type: 'date',
          admin: {
            description: 'When this tip was submitted',
            condition: (data) => data.source === 'user_submitted'
          }
        },
        {
          name: 'reviewedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'Admin who reviewed this tip',
            condition: (data) => data.source === 'user_submitted'
          }
        },
        {
          name: 'reviewedAt',
          type: 'date',
          admin: {
            description: 'When this tip was reviewed',
            condition: (data) => data.source === 'user_submitted'
          }
        },
        {
          name: 'rejectionReason',
          type: 'text',
          admin: {
            description: 'Reason for rejection (if applicable)',
            condition: (data) => data.status === 'rejected'
          }
        }
      ]
    },
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
      name: 'privacy',
      type: 'select',
      defaultValue: 'public',
      options: [
        { label: '🌍 Public', value: 'public' },
        { label: '🔒 Private', value: 'private' },
      ],
      admin: {
        description: 'Control who can see this location'
      }
    },
    {
      name: 'privateAccess',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        description: 'Friends who can access this private location',
        condition: (data) => data.privacy === 'private'
      }
    },
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
    { name: 'followerCount', type: 'number', admin: { readOnly: true, description: 'Number of users following this location' } },
    { name: 'foursquareId', type: 'text', admin: { description: 'Foursquare place ID for API integration' } },
    {
      name: 'communityPhotos',
      type: 'array',
      admin: {
        description: 'User-submitted community photos for this location (approved or pending)',
      },
      fields: [
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
        {
          name: 'submittedBy',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'submittedAt',
          type: 'date',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
          ],
          defaultValue: 'pending',
        },
      ],
    },
  ],
};
