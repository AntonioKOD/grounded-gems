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
