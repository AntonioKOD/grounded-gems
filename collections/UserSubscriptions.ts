import { CollectionConfig } from 'payload';

export const UserSubscriptions: CollectionConfig = {
  slug: 'userSubscriptions',
  labels: {
    singular: 'User Subscription',
    plural: 'User Subscriptions',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'user',
    defaultColumns: ['user', 'subscriptionTier', 'status', 'nextBillingDate'],
  },
  fields: [
    // User & Subscription Details
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
    },
    {
      name: 'subscriptionTier',
      type: 'select',
      required: true,
      defaultValue: 'free',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Explorer Pro ($9.99/month)', value: 'explorer_pro' },
        { label: 'Local Authority ($19.99/month)', value: 'local_authority' },
        { label: 'Creator Plus ($29.99/month)', value: 'creator_plus' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Past Due', value: 'past_due' },
        { label: 'Paused', value: 'paused' },
        { label: 'Pending', value: 'pending' },
      ],
    },
    
    // Billing Information
    {
      name: 'billing',
      type: 'group',
      fields: [
        { name: 'stripeCustomerId', type: 'text' },
        { name: 'subscriptionId', type: 'text' },
        { name: 'priceId', type: 'text' },
        { name: 'currentPeriodStart', type: 'date' },
        { name: 'currentPeriodEnd', type: 'date' },
        { name: 'nextBillingDate', type: 'date' },
        { name: 'lastPaymentDate', type: 'date' },
        { name: 'monthlyAmount', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'usd' },
      ],
    },
    
    // Feature Access
    {
      name: 'features',
      type: 'group',
      fields: [
        { name: 'unlimitedSaves', type: 'checkbox', defaultValue: false },
        { name: 'advancedPersonalization', type: 'checkbox', defaultValue: false },
        { name: 'adFreeExperience', type: 'checkbox', defaultValue: false },
        { name: 'prioritySupport', type: 'checkbox', defaultValue: false },
        { name: 'creatorTools', type: 'checkbox', defaultValue: false },
        { name: 'analyticsAccess', type: 'checkbox', defaultValue: false },
        { name: 'revenueSharing', type: 'checkbox', defaultValue: false },
        { name: 'customBranding', type: 'checkbox', defaultValue: false },
        { name: 'apiAccess', type: 'checkbox', defaultValue: false },
        { name: 'whiteLabel', type: 'checkbox', defaultValue: false },
      ],
    },
    
    // Creator Monetization
    {
      name: 'creatorProgram',
      type: 'group',
      fields: [
        { name: 'isCreator', type: 'checkbox', defaultValue: false },
        { name: 'creatorLevel', type: 'select', options: [
          { label: 'Local Explorer', value: 'explorer' },
          { label: 'Hidden Gem Hunter', value: 'hunter' },
          { label: 'Local Authority', value: 'authority' },
          { label: 'Destination Expert', value: 'expert' },
        ]},
        { name: 'revenueSharePercentage', type: 'number', defaultValue: 15 },
        { name: 'monthlyEarnings', type: 'number', defaultValue: 0 },
        { name: 'totalEarnings', type: 'number', defaultValue: 0 },
        { name: 'lastPayoutDate', type: 'date' },
        { name: 'minimumPayout', type: 'number', defaultValue: 50 },
        { name: 'payoutMethod', type: 'select', options: [
          { label: 'Stripe Connect', value: 'stripe' },
          { label: 'PayPal', value: 'paypal' },
          { label: 'Bank Transfer', value: 'bank' },
        ]},
        { name: 'stripeAccountId', type: 'text' },
      ],
    },
    
    // Usage Limits & Tracking
    {
      name: 'usageLimits',
      type: 'group',
      fields: [
        { name: 'monthlySaveLimit', type: 'number', defaultValue: 5 },
        { name: 'currentMonthlySaves', type: 'number', defaultValue: 0 },
        { name: 'apiCallsLimit', type: 'number', defaultValue: 0 },
        { name: 'currentApiCalls', type: 'number', defaultValue: 0 },
        { name: 'listLimit', type: 'number', defaultValue: 3 },
        { name: 'currentLists', type: 'number', defaultValue: 0 },
        { name: 'lastResetDate', type: 'date', defaultValue: () => new Date() },
      ],
    },
    
    // Premium Features Usage
    {
      name: 'premiumUsage',
      type: 'group',
      fields: [
        { name: 'advancedFiltersUsed', type: 'number', defaultValue: 0 },
        { name: 'customBadgesOwned', type: 'array', fields: [
          { name: 'badgeId', type: 'text' },
          { name: 'purchasedAt', type: 'date', defaultValue: () => new Date() },
          { name: 'amount', type: 'number' },
        ]},
        { name: 'premiumTemplatesOwned', type: 'array', fields: [
          { name: 'templateId', type: 'text' },
          { name: 'templateName', type: 'text' },
          { name: 'purchasedAt', type: 'date', defaultValue: () => new Date() },
          { name: 'amount', type: 'number' },
        ]},
      ],
    },
    
    // Subscription History
    {
      name: 'subscriptionHistory',
      type: 'array',
      fields: [
        { name: 'tier', type: 'text' },
        { name: 'startDate', type: 'date' },
        { name: 'endDate', type: 'date' },
        { name: 'reason', type: 'text' },
        { name: 'amount', type: 'number' },
      ],
    },
    
    // Revenue Tracking (for creators)
    {
      name: 'revenueTracking',
      type: 'group',
      fields: [
        { name: 'locationCommissions', type: 'number', defaultValue: 0 },
        { name: 'eventCommissions', type: 'number', defaultValue: 0 },
        { name: 'specialOfferCommissions', type: 'number', defaultValue: 0 },
        { name: 'contentLicensing', type: 'number', defaultValue: 0 },
        { name: 'guideServices', type: 'number', defaultValue: 0 },
        { name: 'affiliateCommissions', type: 'number', defaultValue: 0 },
        { name: 'lastCalculatedAt', type: 'date' },
      ],
    },
    
    // Support & Communication
    {
      name: 'supportTier',
      type: 'select',
      defaultValue: 'standard',
      options: [
        { label: 'Standard (Email)', value: 'standard' },
        { label: 'Priority (Email + Chat)', value: 'priority' },
        { label: 'Premium (Phone + Dedicated)', value: 'premium' },
      ],
    },
    {
      name: 'accountManager',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        condition: (data) => data.supportTier === 'premium',
      },
    },
    
    // Analytics & Insights
    {
      name: 'analytics',
      type: 'group',
      fields: [
        { name: 'monthlyActiveMinutes', type: 'number', defaultValue: 0 },
        { name: 'locationsDiscovered', type: 'number', defaultValue: 0 },
        { name: 'postsCreated', type: 'number', defaultValue: 0 },
        { name: 'eventsAttended', type: 'number', defaultValue: 0 },
        { name: 'revenueGenerated', type: 'number', defaultValue: 0 },
        { name: 'engagementScore', type: 'number', defaultValue: 0 },
      ],
    },
    
    // Cancellation & Retention
    {
      name: 'cancellation',
      type: 'group',
      fields: [
        { name: 'cancelledAt', type: 'date' },
        { name: 'cancellationReason', type: 'select', options: [
          { label: 'Too Expensive', value: 'price' },
          { label: 'Not Using Enough', value: 'usage' },
          { label: 'Missing Features', value: 'features' },
          { label: 'Technical Issues', value: 'technical' },
          { label: 'Other', value: 'other' },
        ]},
        { name: 'feedback', type: 'textarea' },
        { name: 'retentionOffersReceived', type: 'array', fields: [
          { name: 'offerType', type: 'text' },
          { name: 'discount', type: 'number' },
          { name: 'offeredAt', type: 'date', defaultValue: () => new Date() },
          { name: 'accepted', type: 'checkbox', defaultValue: false },
        ]},
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Set features based on subscription tier
        if (operation === 'create' || data.subscriptionTier) {
          const tierFeatures = {
            free: {
              unlimitedSaves: false,
              advancedPersonalization: false,
              adFreeExperience: false,
              prioritySupport: false,
              creatorTools: false,
              analyticsAccess: false,
              revenueSharing: false,
              customBranding: false,
              apiAccess: false,
              whiteLabel: false,
            },
            explorer_pro: {
              unlimitedSaves: true,
              advancedPersonalization: true,
              adFreeExperience: true,
              prioritySupport: true,
              creatorTools: false,
              analyticsAccess: true,
              revenueSharing: false,
              customBranding: false,
              apiAccess: false,
              whiteLabel: false,
            },
            local_authority: {
              unlimitedSaves: true,
              advancedPersonalization: true,
              adFreeExperience: true,
              prioritySupport: true,
              creatorTools: true,
              analyticsAccess: true,
              revenueSharing: true,
              customBranding: true,
              apiAccess: false,
              whiteLabel: false,
            },
            creator_plus: {
              unlimitedSaves: true,
              advancedPersonalization: true,
              adFreeExperience: true,
              prioritySupport: true,
              creatorTools: true,
              analyticsAccess: true,
              revenueSharing: true,
              customBranding: true,
              apiAccess: true,
              whiteLabel: true,
            },
          };
          
          data.features = { ...data.features, ...tierFeatures[data.subscriptionTier as keyof typeof tierFeatures] };
        }
        
        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, operation, previousDoc }) => {
        // Handle subscription tier changes
        if (operation === 'update' && doc.subscriptionTier !== previousDoc?.subscriptionTier) {
          // Add to subscription history
          const historyEntry = {
            tier: doc.subscriptionTier,
            startDate: new Date(),
            endDate: null,
            reason: 'tier_change',
            amount: doc.billing?.monthlyAmount,
          };
          
          const updatedHistory = [...(doc.subscriptionHistory || []), historyEntry];
          
          await req.payload.update({
            collection: 'userSubscriptions',
            id: doc.id,
            data: { subscriptionHistory: updatedHistory },
          });
          
          // Send notification about tier change
          await req.payload.create({
            collection: 'notifications',
            data: {
              recipient: doc.user,
              type: 'subscription_changed',
              title: 'Subscription updated!',
              message: `Your subscription has been updated to ${doc.subscriptionTier.replace('_', ' ')}. New features are now available.`,
              priority: 'high',
              relatedTo: {
                relationTo: 'userSubscriptions',
                value: doc.id,
              },
            },
          });
        }
      },
    ],
  },
}; 