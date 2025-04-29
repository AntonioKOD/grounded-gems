import { CollectionConfig } from 'payload';

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: {
    singular: 'Subscriber',
    plural: 'Subscribers',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'subscriptionType', 'status'],
  },
  fields: [
    // Basic Information
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'name', type: 'text' },
    { name: 'user', type: 'relationship', relationTo: 'users' },

    // Subscription Details
    {
      name: 'subscriptionType',
      type: 'select',
      required: true,
      options: [
        { label: 'Newsletter', value: 'newsletter' },
        { label: 'Updates',    value: 'updates' },
        { label: 'Promotions', value: 'promotions' },
        { label: 'Alerts',     value: 'alerts' },
      ],
    },
    { name: 'subscribedToCreator',  type: 'relationship', relationTo: 'users' },
    { name: 'subscribedToLocation', type: 'relationship', relationTo: 'locations' },
    { name: 'subscribedCategories', type: 'relationship', relationTo: 'categories', hasMany: true },
    {
      name: 'frequency',
      type: 'select',
      options: [
        { label: 'Instant', value: 'instant' },
        { label: 'Daily',   value: 'daily' },
        { label: 'Weekly',  value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
      ],
    },

    // Preferences
    {
      name: 'preferences',
      type: 'group',
      fields: [
        { name: 'receivePromotions',    type: 'checkbox' },
        { name: 'receivePartnerOffers', type: 'checkbox' },
        {
          name: 'emailFormat',
          type: 'select',
          options: [
            { label: 'HTML',      value: 'html' },
            { label: 'Plain Text', value: 'text' },
          ],
        },
        {
          name: 'preferredLanguage',
          type: 'select',
          options: [
            { label: 'English', value: 'en' },
            { label: 'Spanish', value: 'es' },
            { label: 'French',  value: 'fr' },
            // add more as needed
          ],
        },
      ],
    },

    // Location Information
    {
      name: 'location',
      type: 'group',
      label: 'Subscriber Location',
      fields: [
        { name: 'city',      type: 'text' },
        { name: 'state',     type: 'text' },
        { name: 'country',   type: 'text' },
        { name: 'timezone',  type: 'text', admin: { description: 'IANA timezone string' } },
      ],
    },

    // Status and Tracking
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active',      value: 'active' },
        { label: 'Unconfirmed', value: 'unconfirmed' },
        { label: 'Unsubscribed',value: 'unsubscribed' },
        { label: 'Bounced',     value: 'bounced' },
      ],
    },
    { name: 'confirmationToken', type: 'text' },
    { name: 'unsubscribeToken',  type: 'text' },
    { name: 'confirmedAt',       type: 'date' },
    { name: 'unsubscribedAt',    type: 'date' },
    { name: 'unsubscribeReason', type: 'text' },

    // Analytics
    { name: 'source',             type: 'text' },
    { name: 'ipAddress',          type: 'text' },
    { name: 'userAgent',          type: 'text' },
    { name: 'lastEmailSentAt',    type: 'date' },
    { name: 'lastEmailOpenedAt',  type: 'date' },
    { name: 'emailsSent',         type: 'number' },
    { name: 'emailsOpened',       type: 'number' },
    { name: 'emailsClicked',      type: 'number' },

    // GDPR & Compliance
    { name: 'gdprConsent',      type: 'checkbox', required: true },
    { name: 'gdprConsentText',  type: 'text' },
    { name: 'gdprConsentDate',  type: 'date' },
    { name: 'marketingConsent', type: 'checkbox' },
  ],
};
