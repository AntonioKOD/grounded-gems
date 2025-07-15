import { CollectionConfig } from 'payload';

export const CreatorApplications: CollectionConfig = {
  slug: 'creatorApplications',
  labels: {
    singular: 'Creator Application',
    plural: 'Creator Applications',
  },
  access: {
    read: ({ req: { user } }) => {
      // Admins can read all applications
      if (user?.role === 'admin') return true;
      
      // Specific admin emails can also read all applications
      if (user?.email && ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com'].includes(user.email)) {
        return true;
      }
      
      // Users can only read their own applications
      if (user) {
        return {
          applicant: {
            equals: user.id,
          },
        };
      }
      return false;
    },
    create: ({ req: { user } }) => Boolean(user), // Any logged-in user can apply
    update: ({ req: { user } }) => {
      // Admins can update applications
      if (user?.role === 'admin') return true;
      
      // Specific admin emails can also update applications
      if (user?.email && ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com'].includes(user.email)) {
        return true;
      }
      
      return false;
    },
    delete: ({ req: { user } }) => {
      // Admins can delete applications
      if (user?.role === 'admin') return true;
      
      // Specific admin emails can also delete applications
      if (user?.email && ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com'].includes(user.email)) {
        return true;
      }
      
      return false;
    },
  },
  admin: {
    useAsTitle: 'applicantName',
    defaultColumns: ['applicantName', 'applicantEmail', 'status', 'experienceLevel', 'specialties', 'createdAt'],
    group: 'Creator Management',
    description: 'Review and manage creator applications. When you approve an application, the user will automatically become a creator and receive a notification.',
    pagination: {
      defaultLimit: 25,
    },
    listSearchableFields: ['applicantName', 'applicantEmail', 'localAreas'],
    preview: (doc) => {
      return `${doc.applicantName} - ${doc.status}`
    },
  },
  fields: [
    // Basic applicant info
    {
      name: 'applicant',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'The user applying to become a creator',
      },
    },
    {
      name: 'applicantName',
      type: 'text',
      required: true,
      admin: {
        description: 'Full name of the applicant',
      },
    },
    {
      name: 'applicantEmail',
      type: 'email',
      required: true,
      admin: {
        description: 'Contact email for the applicant',
      },
    },
    
    // Application status
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: '🟡 Pending Review', value: 'pending' },
        { label: '🔵 Under Review', value: 'reviewing' },
        { label: '✅ Approved', value: 'approved' },
        { label: '❌ Rejected', value: 'rejected' },
        { label: '📝 Needs More Info', value: 'needs_info' },
      ],
      admin: {
        description: 'Current status of the application',
      },
    },
    
    // Why they want to be a creator
    {
      name: 'motivation',
      type: 'textarea',
      required: true,
      maxLength: 1000,
      admin: {
        description: 'Why do you want to become a creator? (Max 1000 characters)',
      },
    },
    
    // Experience level
    {
      name: 'experienceLevel',
      type: 'select',
      required: true,
      options: [
        { label: '🌱 Beginner - New to creating content', value: 'beginner' },
        { label: '🌿 Intermediate - Some content creation experience', value: 'intermediate' },
        { label: '🌳 Expert - Experienced content creator', value: 'expert' },
      ],
      admin: {
        description: 'Content creation experience level',
      },
    },
    
    // Local expertise
    {
      name: 'localAreas',
      type: 'textarea',
      required: true,
      maxLength: 500,
      admin: {
        description: 'What local areas/cities do you know well? (Max 500 characters)',
      },
    },
    
    // Specialties
    {
      name: 'specialties',
      type: 'select',
      hasMany: true,
      required: true,
      options: [
        { label: '🍽️ Food & Dining', value: 'food' },
        { label: '🍻 Nightlife & Entertainment', value: 'nightlife' },
        { label: '🎨 Culture & Arts', value: 'culture' },
        { label: '🏞️ Outdoor & Adventure', value: 'outdoor' },
        { label: '🛍️ Shopping', value: 'shopping' },
        { label: '🏛️ Historical Sites', value: 'historical' },
        { label: '👨‍👩‍👧‍👦 Family-Friendly', value: 'family' },
        { label: '💎 Hidden Gems', value: 'hidden' },
        { label: '📸 Photography Spots', value: 'photography' },
        { label: '🏠 Local Lifestyle', value: 'lifestyle' },
      ],
      admin: {
        description: 'What types of places/experiences are you most knowledgeable about?',
      },
    },
    
    // Sample content or portfolio
    {
      name: 'portfolioDescription',
      type: 'textarea',
      maxLength: 800,
      admin: {
        description: 'Describe any relevant experience, social media, blog, or content you\'ve created (Max 800 characters)',
      },
    },
    
    // Social media (optional)
    {
      name: 'socialMedia',
      type: 'text',
      admin: {
        description: 'Your main social media handle or website (optional)',
      },
    },
    
    // Admin review section
    {
      name: 'reviewNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes for admin review (not visible to applicant)',
        condition: (data, siblingData, { user }) => {
          return Boolean(user && (user.role === 'admin' || (user.email && ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com'].includes(user.email))));
        },
      },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin who reviewed this application',
        condition: (data, siblingData, { user }) => {
          return Boolean(user && (user.role === 'admin' || (user.email && ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com'].includes(user.email))));
        },
        readOnly: true,
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: {
        description: 'When the application was reviewed',
        condition: (data) => data.status && data.status !== 'pending',
        readOnly: true,
      },
    },
    {
      name: 'rejectionReason',
      type: 'textarea',
      admin: {
        description: 'Reason for rejection (will be sent to applicant) - This message will be included in the notification to the user',
        condition: (data) => data.status === 'rejected' || data.status === 'needs_info',
        placeholder: 'Please provide specific feedback that will help the applicant improve their application...',
      },
    },
  ],
  
  hooks: {
    beforeChange: [
      async ({ operation, data, req }) => {
        // Set applicant info from logged-in user if creating
        if (operation === 'create' && req.user) {
          if (!data.applicant) {
            data.applicant = req.user.id;
          }
          if (!data.applicantName) {
            data.applicantName = req.user.name || req.user.username || req.user.email;
          }
          if (!data.applicantEmail) {
            data.applicantEmail = req.user.email;
          }
        }
        
        // Set review timestamp and reviewer when status changes from pending
        if (operation === 'update' && data.status && data.status !== 'pending') {
          // Only set these if they're not already set (to preserve original review data)
          if (!data.reviewedAt) {
            data.reviewedAt = new Date().toISOString();
          }
          if (
            !data.reviewedBy &&
            req.user &&
            req.user.id &&
            (
              req.user.role === 'admin' ||
              (typeof req.user.email === 'string' && ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com'].includes(req.user.email))
            )
          ) {
            data.reviewedBy = req.user.id;
          }
        }
        
        return data;
      },
    ],
    
    afterChange: [
      async ({ req, doc, operation, previousDoc }) => {
        if (!req.payload) return doc;

        try {
          // Send notification when application status changes
          if (operation === 'update' && previousDoc && doc.status !== previousDoc.status) {
            let notificationTitle = '';
            let notificationMessage = '';
            let priority = 'normal';

            // Get current user data to preserve existing creatorProfile
            const currentUser = await req.payload.findByID({
              collection: 'users',
              id: doc.applicant
            });

            switch (doc.status) {
              case 'approved':
                notificationTitle = '🎉 Creator Application Approved!';
                notificationMessage = 'Congratulations! Your creator application has been approved. You can now start creating and publishing guides!';
                priority = 'high';
                
                // Update user to creator role and application status
                await req.payload.update({
                  collection: 'users',
                  id: doc.applicant,
                  data: {
                    role: 'creator',
                    isCreator: true,
                    creatorProfile: {
                      ...currentUser.creatorProfile,
                      applicationStatus: 'approved',
                      joinedCreatorProgram: new Date().toISOString(),
                    },
                  },
                });
                break;
                
              case 'rejected':
                notificationTitle = 'Creator Application Update';
                notificationMessage = doc.rejectionReason 
                  ? `Your creator application was not approved at this time. Feedback: ${doc.rejectionReason}`
                  : 'Your creator application was not approved at this time. Please feel free to apply again in the future with additional experience or information.';
                
                // Update user application status
                await req.payload.update({
                  collection: 'users',
                  id: doc.applicant,
                  data: {
                    creatorProfile: {
                      ...currentUser.creatorProfile,
                      applicationStatus: 'rejected',
                    },
                  },
                });
                break;
                
              case 'needs_info':
                notificationTitle = 'Creator Application - Additional Information Needed';
                notificationMessage = doc.rejectionReason 
                  ? `We need some additional information for your creator application. Details: ${doc.rejectionReason}`
                  : 'We need some additional information for your creator application. Please check your application and provide the requested details.';
                
                // Update user application status
                await req.payload.update({
                  collection: 'users',
                  id: doc.applicant,
                  data: {
                    creatorProfile: {
                      ...currentUser.creatorProfile,
                      applicationStatus: 'needs_info',
                    },
                  },
                });
                break;
                
              case 'reviewing':
                // Update status to reviewing
                await req.payload.update({
                  collection: 'users',
                  id: doc.applicant,
                  data: {
                    creatorProfile: {
                      ...currentUser.creatorProfile,
                      applicationStatus: 'reviewing',
                    },
                  },
                });
                break;
            }

            if (notificationTitle) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: doc.applicant,
                  type: 'creator_application_update',
                  title: notificationTitle,
                  message: notificationMessage,
                  priority,
                  relatedTo: {
                    relationTo: 'creatorApplications',
                    value: doc.id,
                  },
                  read: false,
                },
              });
            }
          }
        } catch (error) {
          console.error('Error creating application notification:', error);
        }

        return doc;
      },
    ],
  },
  
  timestamps: true,
}; 