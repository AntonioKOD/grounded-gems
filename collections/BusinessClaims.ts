import { CollectionConfig } from 'payload';

export const BusinessClaims: CollectionConfig = {
  slug: 'businessClaims',
  labels: {
    singular: 'Business Claim',
    plural: 'Business Claims',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'businessName',
    defaultColumns: ['businessName', 'location', 'claimStatus', 'subscriptionTier', 'createdAt'],
  },
  fields: [
    // Business Information
    {
      name: 'businessName',
      type: 'text',
      required: true,
      label: 'Business Name',
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      label: 'Claimed Location',
    },
    {
      name: 'claimant',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Business Owner/Manager',
    },
    
    // Claim Status & Verification
    {
      name: 'claimStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Verification', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Suspended', value: 'suspended' },
      ],
    },
    {
      name: 'verificationMethod',
      type: 'select',
      options: [
        { label: 'Phone Verification', value: 'phone' },
        { label: 'Document Upload', value: 'document' },
        { label: 'Postcard Verification', value: 'postcard' },
        { label: 'Google My Business', value: 'google_my_business' },
      ],
    },
    {
      name: 'verificationDocuments',
      type: 'array',
      fields: [
        { name: 'document', type: 'upload', relationTo: 'media' },
        { name: 'documentType', type: 'text' },
        { name: 'uploadedAt', type: 'date', defaultValue: () => new Date() },
      ],
    },
    
    // Subscription & Billing
    {
      name: 'subscriptionTier',
      type: 'select',
      required: true,
      defaultValue: 'basic',
      options: [
        { label: 'Basic ($29/month)', value: 'basic' },
        { label: 'Premium ($79/month)', value: 'premium' },
        { label: 'Enterprise ($199/month)', value: 'enterprise' },
        { label: 'Custom Enterprise', value: 'custom' },
      ],
    },
    {
      name: 'billingInfo',
      type: 'group',
      fields: [
        { name: 'stripeCustomerId', type: 'text' },
        { name: 'subscriptionId', type: 'text' },
        { name: 'billingEmail', type: 'email' },
        { name: 'lastPaymentDate', type: 'date' },
        { name: 'nextBillingDate', type: 'date' },
        { name: 'paymentStatus', type: 'select', options: [
          { label: 'Active', value: 'active' },
          { label: 'Past Due', value: 'past_due' },
          { label: 'Cancelled', value: 'cancelled' },
          { label: 'Paused', value: 'paused' },
        ]},
      ],
    },
    
    // Business Details
    {
      name: 'businessDetails',
      type: 'group',
      fields: [
        { name: 'website', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'businessType', type: 'select', options: [
          { label: 'Restaurant', value: 'restaurant' },
          { label: 'Retail', value: 'retail' },
          { label: 'Service', value: 'service' },
          { label: 'Entertainment', value: 'entertainment' },
          { label: 'Tourism', value: 'tourism' },
          { label: 'Other', value: 'other' },
        ]},
        { name: 'employeeCount', type: 'select', options: [
          { label: '1-10', value: '1-10' },
          { label: '11-50', value: '11-50' },
          { label: '51-200', value: '51-200' },
          { label: '200+', value: '200+' },
        ]},
      ],
    },
    
    // Enterprise Features
    {
      name: 'enabledFeatures',
      type: 'array',
      fields: [
        { name: 'feature', type: 'select', options: [
          { label: 'Business Hours Management', value: 'business_hours' },
          { label: 'Photo Management', value: 'photo_management' },
          { label: 'Review Response', value: 'review_response' },
          { label: 'Special Offers', value: 'special_offers' },
          { label: 'Event Creation', value: 'event_creation' },
          { label: 'Analytics Dashboard', value: 'analytics' },
          { label: 'API Access', value: 'api_access' },
          { label: 'Custom Branding', value: 'custom_branding' },
          { label: 'Priority Support', value: 'priority_support' },
          { label: 'Multi-location Management', value: 'multi_location' },
        ]},
        { name: 'enabledAt', type: 'date', defaultValue: () => new Date() },
      ],
    },
    
    // Analytics & Performance
    {
      name: 'analytics',
      type: 'group',
      fields: [
        { name: 'monthlyViews', type: 'number', defaultValue: 0 },
        { name: 'monthlyInteractions', type: 'number', defaultValue: 0 },
        { name: 'totalRevenue', type: 'number', defaultValue: 0 },
        { name: 'averageRating', type: 'number' },
        { name: 'totalReviews', type: 'number', defaultValue: 0 },
        { name: 'lastAnalyticsUpdate', type: 'date' },
      ],
    },
    
    // Communication & Support
    {
      name: 'supportLevel',
      type: 'select',
      defaultValue: 'standard',
      options: [
        { label: 'Standard (Email)', value: 'standard' },
        { label: 'Priority (Phone + Email)', value: 'priority' },
        { label: 'Dedicated (Account Manager)', value: 'dedicated' },
      ],
    },
    {
      name: 'accountManager',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        condition: (data) => data.supportLevel === 'dedicated',
      },
    },
    
    // Revenue Tracking
    {
      name: 'revenueSharing',
      type: 'group',
      fields: [
        { name: 'creatorCommissionRate', type: 'number', defaultValue: 15 },
        { name: 'platformFeeRate', type: 'number', defaultValue: 5 },
        { name: 'monthlyPayout', type: 'number', defaultValue: 0 },
        { name: 'totalPaidOut', type: 'number', defaultValue: 0 },
        { name: 'lastPayoutDate', type: 'date' },
      ],
    },
    
    // Status Tracking
    {
      name: 'claimedAt',
      type: 'date',
      defaultValue: () => new Date(),
    },
    {
      name: 'verifiedAt',
      type: 'date',
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes for support team',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ req, doc, operation }) => {
        // Send notification when claim status changes
        if (operation === 'update' && doc.claimStatus === 'verified') {
          await req.payload.create({
            collection: 'notifications',
            data: {
              recipient: doc.claimant,
              type: 'business_claim_approved',
              title: 'Business claim approved!',
              message: `Your claim for ${doc.businessName} has been verified. You can now manage your business listing.`,
              priority: 'high',
              relatedTo: {
                relationTo: 'businessClaims',
                value: doc.id,
              },
            },
          });
        }
      },
    ],
  },
}; 