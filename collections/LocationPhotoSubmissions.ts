import { CollectionConfig } from 'payload';

export const LocationPhotoSubmissions: CollectionConfig = {
  slug: 'locationPhotoSubmissions',
  labels: {
    singular: 'Location Photo Submission',
    plural: 'Location Photo Submissions',
  },
  access: {
    read: ({ req: { user } }) => {
      // Allow everyone to read (for now - will be filtered by status later)
      // Admins can see all, users can see their own submissions
      if (!user) return false;
      
      // For now, allow all authenticated users to read (will filter by status/ownership in queries)
      return true;
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      // Allow Antonio (antonio_kodheli@icloud.com) to update any submission
      if (user?.email === 'antonio_kodheli@icloud.com') return true;
      // Allow users to update their own submissions if status is 'pending' or 'needs_improvement'
      // Allow admins/moderators to update any submission for review
      return Boolean(user);
    },
    delete: ({ req: { user } }) => {
      // Allow users to delete their own pending submissions
      // Allow admins to delete any submission
      return Boolean(user);
    },
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['photo', 'location', 'submittedBy', 'status', 'category', 'qualityScore', 'submittedAt'],
    group: 'Content Management',
    listSearchableFields: ['caption', 'category', 'status'],
    pagination: {
      defaultLimit: 50,
    },
    preview: (doc) => {
      const locationName = (doc?.location && (doc.location as any).name) ? (doc.location as any).name : null;
      if (locationName && doc?.category) {
        return `${locationName} - ${doc.category}`;
      }
      return `Photo Submission ${doc.id}`;
    },
  },
  fields: [
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      admin: {
        description: 'The location this photo is for',
      },
    },
    {
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Submitted By',
      admin: {
        description: 'User who submitted the photo',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'The submitted photo',
      },
    },
    {
      name: 'caption',
      type: 'text',
      maxLength: 200,
      admin: {
        description: 'Optional caption for the photo',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Exterior', value: 'exterior' },
        { label: 'Interior', value: 'interior' },
        { label: 'Food & Drinks', value: 'food_drinks' },
        { label: 'Atmosphere', value: 'atmosphere' },
        { label: 'Menu', value: 'menu' },
        { label: 'Staff', value: 'staff' },
        { label: 'Events', value: 'events' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Category of the photo',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Under Review', value: 'reviewing' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Needs Improvement', value: 'needs_improvement' },
      ],
      admin: {
        description: 'Review status of the submission',
      },
    },
    {
      name: 'qualityScore',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        description: 'Quality score (0-100) based on automated and manual review',
        condition: (data) => data.status !== 'pending',
      },
    },
    {
      name: 'autoQualityChecks',
      type: 'group',
      admin: {
        description: 'Automated quality assessment results',
        condition: (data) => data.status !== 'pending',
      },
      fields: [
        {
          name: 'resolution',
          type: 'group',
          fields: [
            { name: 'width', type: 'number' },
            { name: 'height', type: 'number' },
            { name: 'score', type: 'number', min: 0, max: 100 },
          ],
        },
        {
          name: 'fileSize',
          type: 'group',
          fields: [
            { name: 'bytes', type: 'number' },
            { name: 'score', type: 'number', min: 0, max: 100 },
          ],
        },
        {
          name: 'format',
          type: 'group',
          fields: [
            { name: 'type', type: 'text' },
            { name: 'score', type: 'number', min: 0, max: 100 },
          ],
        },
        {
          name: 'blur',
          type: 'group',
          fields: [
            { name: 'detected', type: 'checkbox' },
            { name: 'confidence', type: 'number', min: 0, max: 100 },
            { name: 'score', type: 'number', min: 0, max: 100 },
          ],
        },
        {
          name: 'overallScore',
          type: 'number',
          min: 0,
          max: 100,
          admin: {
            description: 'Combined automated quality score',
          },
        },
      ],
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin/moderator who reviewed this submission',
        condition: (data) => data.status !== 'pending',
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: {
        description: 'Date when the submission was reviewed',
        condition: (data) => data.status !== 'pending',
      },
    },
    {
      name: 'reviewNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes from the reviewer',
        condition: (data) => data.status !== 'pending',
      },
    },
    {
      name: 'rejectionReason',
      type: 'select',
      options: [
        { label: 'Poor Quality', value: 'poor_quality' },
        { label: 'Blurry/Out of Focus', value: 'blurry' },
        { label: 'Inappropriate Content', value: 'inappropriate' },
        { label: 'Not Relevant to Location', value: 'not_relevant' },
        { label: 'Duplicate Photo', value: 'duplicate' },
        { label: 'Copyright Issue', value: 'copyright' },
        { label: 'Low Resolution', value: 'low_resolution' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Reason for rejection',
        condition: (data) => data.status === 'rejected' || data.status === 'needs_improvement',
      },
    },
    {
      name: 'rejectionFeedback',
      type: 'textarea',
      admin: {
        description: 'Feedback for the user on how to improve their submission',
        condition: (data) => data.status === 'rejected' || data.status === 'needs_improvement',
      },
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'approvedAt',
      type: 'date',
      admin: {
        description: 'Date when the photo was approved and added to location gallery',
        condition: (data) => data.status === 'approved',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this photo should be featured in the location gallery',
        condition: (data) => data.status === 'approved',
      },
    },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Location Owner Only', value: 'owner_only' },
        { label: 'Hidden', value: 'hidden' },
      ],
      admin: {
        description: 'Visibility level of the approved photo',
        condition: (data) => data.status === 'approved',
      },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        { name: 'tag', type: 'text' },
      ],
      admin: {
        description: 'Tags to help categorize and search photos',
      },
    },
    {
      name: 'metadata',
      type: 'group',
      admin: {
        description: 'Additional metadata about the submission',
      },
      fields: [
        {
          name: 'deviceInfo',
          type: 'text',
          admin: {
            description: 'Device/camera used to take the photo',
          },
        },
        {
          name: 'timestamp',
          type: 'date',
          admin: {
            description: 'When the photo was originally taken',
          },
        },
        {
          name: 'gpsLocation',
          type: 'group',
          fields: [
            { name: 'latitude', type: 'number' },
            { name: 'longitude', type: 'number' },
          ],
        },
        {
          name: 'visitVerified',
          type: 'checkbox',
          admin: {
            description: 'Whether the user\'s visit to the location was verified',
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ operation, data, req }) => {
        if (operation === 'create') {
          // Set submittedAt if not already set
          if (!data.submittedAt) {
            data.submittedAt = new Date().toISOString();
          }
          
          // Set submittedBy if not already set and user is available
          if (!data.submittedBy && req.user?.id) {
            data.submittedBy = req.user.id;
          }
          
          // Validate that submittedBy is set
          if (!data.submittedBy) {
            throw new Error('submittedBy is required for photo submissions');
          }
        }
        
        if (data.status === 'approved' && !data.approvedAt) {
          data.approvedAt = new Date().toISOString();
        }
        
        if ((data.status === 'approved' || data.status === 'rejected') && !data.reviewedAt) {
          data.reviewedAt = new Date().toISOString();
          data.reviewedBy = req.user?.id;
        }
        
        return data;
      },
    ],
    afterChange: [
      async ({ operation, doc, req }) => {
        // If photo is approved, add it to the location's communityPhotos array
        if (operation === 'update' && doc.status === 'approved') {
          try {
            const payload = req.payload;
            // Get the current location
            const location = await payload.findByID({
              collection: 'locations',
              id: doc.location,
            });
            if (location) {
              // Prepare new community photo entry
              const newCommunityPhoto = {
                photo: doc.photo,
                caption: doc.caption || '',
                submittedBy: doc.submittedBy,
                submittedAt: doc.submittedAt || new Date().toISOString(),
                status: 'approved',
              };
              // Avoid duplicates: filter out any with the same photo ID
              const existing = Array.isArray(location.communityPhotos) ? location.communityPhotos : [];
              const filtered = existing.filter((item: any) => String(item.photo) !== String(doc.photo));
              const updatedCommunityPhotos = [...filtered, newCommunityPhoto];
              await payload.update({
                collection: 'locations',
                id: doc.location,
                data: {
                  communityPhotos: updatedCommunityPhotos,
                },
              });
            }
          } catch (error) {
            console.error('Error adding approved photo to communityPhotos:', error);
          }
        }
        
        // If photo is rejected, notify the submitter
        if (operation === 'update' && doc.status === 'rejected') {
          try {
            const payload = req.payload;
            
            const location = await payload.findByID({
              collection: 'locations',
              id: doc.location,
            });
            
            if (location) {
              await payload.create({
                collection: 'notifications',
                data: {
                  recipient: doc.submittedBy,
                  type: 'photo_rejected',
                  title: 'Photo Submission Update',
                  message: `Your photo submission for ${location.name} was not approved. ${doc.rejectionFeedback || 'Please review our photo guidelines and try again.'}`,
                  priority: 'normal',
                  relatedTo: {
                    relationTo: 'locations',
                    value: doc.location,
                  },
                  metadata: {
                    locationName: location.name,
                    rejectionReason: doc.rejectionReason,
                    submissionId: doc.id,
                  },
                  read: false,
                },
              });
            }
          } catch (error) {
            console.error('Error sending rejection notification:', error);
          }
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['location', 'status'],
    },
    {
      fields: ['submittedBy', 'status'],
    },
    {
      fields: ['status', 'submittedAt'],
    },
  ],
}; 