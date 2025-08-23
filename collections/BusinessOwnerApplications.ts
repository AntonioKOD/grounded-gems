import { CollectionConfig } from 'payload';
import { sendPushNotification } from '@/lib/push-notifications';

export const BusinessOwnerApplications: CollectionConfig = {
  slug: 'business-owner-applications',
  labels: {
    singular: 'Business Owner Application',
    plural: 'Business Owner Applications',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false;
      
      // Admins can read all applications
      if (req.user.role === 'admin') return true;
      
      // Users can only read their own applications
      return {
        applicant: { equals: req.user.id }
      };
    },
    create: ({ req }) => {
      // Any authenticated user can create an application
      return !!req.user;
    },
    update: ({ req }) => {
      if (!req.user) return false;
      
      // Admins can update any application
      if (req.user.role === 'admin') return true;
      
      // Users can only update their own pending applications
      return {
        and: [
          { applicant: { equals: req.user.id } },
          { status: { equals: 'pending' } }
        ]
      } as any;
    },
    delete: ({ req }) => {
      if (!req.user) return false;
      
      // Admins can delete any application
      if (req.user.role === 'admin') return true;
      
      // Users can only delete their own pending applications
      return {
        and: [
          { applicant: { equals: req.user.id } },
          { status: { equals: 'pending' } }
        ]
      } as any;
    },
  },
  admin: {
    useAsTitle: 'businessName',
    defaultColumns: ['businessName', 'applicant', 'status', 'submittedAt'],
    group: 'Business Management',
  },
  hooks: {
    beforeChange: [
      async ({ operation, data, req }) => {
        // Set submittedAt if not provided
        if (operation === 'create' && !data.submittedAt) {
          data.submittedAt = new Date().toISOString();
        }
        
        // Set reviewedAt and reviewedBy when status changes
        if (operation === 'update' && data.status && data.status !== 'pending') {
          if (!data.reviewedAt) {
            data.reviewedAt = new Date().toISOString();
          }
          if (!data.reviewedBy && req.user?.id) {
            data.reviewedBy = req.user.id;
          }
        }
        
        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, operation }) => {
        if (!req.payload) return doc;

        // If application is approved, update the user to be a business owner
        if (operation === 'update' && doc.status === 'approved') {
          try {
            // Update user to be a business owner
            await req.payload.update({
              collection: 'users',
              id: doc.applicant,
              data: {
                isBusinessOwner: true,
                businessOwnerProfile: {
                  businessName: doc.businessName,
                  contactEmail: doc.contactEmail,
                  phoneNumber: doc.phoneNumber,
                  website: doc.website,
                  businessType: doc.businessType,
                  verificationStatus: 'verified',
                  verificationDocuments: doc.verificationDocuments,
                  approvedAt: new Date().toISOString(),
                  approvedBy: req.user?.id
                }
              }
            });

            // Generate API key for the business owner
            const apiKey = `sacavia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await req.payload.update({
              collection: 'users',
              id: doc.applicant,
              data: {
                businessApiKey: apiKey
              }
            });

            // Create notification for the applicant
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: doc.applicant,
                type: 'business_owner_approved',
                title: 'Business Owner Application Approved!',
                message: `Congratulations! Your application to become a business owner for "${doc.businessName}" has been approved. You can now claim and manage your locations.`,
                priority: 'high',
                read: false,
              },
            });

          } catch (error) {
            console.error('Error updating user to business owner:', error);
          }
        }

        // If application is rejected, notify the applicant
        if (operation === 'update' && doc.status === 'rejected') {
          try {
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: doc.applicant,
                type: 'business_owner_rejected',
                title: 'Business Owner Application Update',
                message: `Your application to become a business owner for "${doc.businessName}" was not approved. Please review the feedback and consider reapplying.`,
                priority: 'normal',
                read: false,
              },
            });
          } catch (error) {
            console.error('Error creating rejection notification:', error);
          }
        }

        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'applicant',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User applying to become a business owner'
      }
    },
    {
      name: 'businessName',
      type: 'text',
      required: true,
      admin: {
        description: 'Name of the business'
      }
    },
    {
      name: 'businessType',
      type: 'select',
      required: true,
      options: [
        { label: 'Restaurant', value: 'restaurant' },
        { label: 'Retail', value: 'retail' },
        { label: 'Service', value: 'service' },
        { label: 'Entertainment', value: 'entertainment' },
        { label: 'Other', value: 'other' }
      ],
      admin: {
        description: 'Type of business'
      }
    },
    {
      name: 'contactEmail',
      type: 'email',
      required: true,
      admin: {
        description: 'Business contact email'
      }
    },
    {
      name: 'phoneNumber',
      type: 'text',
      admin: {
        description: 'Business phone number'
      }
    },
    {
      name: 'website',
      type: 'text',
      admin: {
        description: 'Business website'
      }
    },
    {
      name: 'businessDescription',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Description of the business and why you want to become a business owner'
      }
    },
    {
      name: 'verificationDocuments',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Business verification documents (license, tax documents, etc.)'
      }
    },
    {
      name: 'locationsToClaim',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: true,
      admin: {
        description: 'Locations the applicant wants to claim ownership of'
      }
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' }
      ],
      defaultValue: 'pending',
      admin: {
        description: 'Application status'
      }
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      admin: {
        description: 'Admin notes about the application'
      }
    },
    {
      name: 'submittedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'When the application was submitted'
      }
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'When the application was reviewed'
      }
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        description: 'Admin who reviewed the application'
      }
    },
    {
      name: 'rejectionReason',
      type: 'textarea',
      admin: {
        description: 'Reason for rejection (if applicable)',
        condition: (data) => data.status === 'rejected'
      }
    }
  ],
  timestamps: true,
}; 