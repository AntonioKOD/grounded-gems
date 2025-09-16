import { CollectionConfig } from 'payload';

export const ContestPayments: CollectionConfig = {
  slug: 'contest-payments',
  labels: { 
    singular: 'Contest Payment', 
    plural: 'Contest Payments' 
  },
  admin: {
    useAsTitle: 'locationName',
    defaultColumns: ['locationName', 'amount', 'status', 'paymentMethod', 'createdAt'],
    group: 'Content',
    description: 'Payments for contest entries',
  },
  access: {
    read: ({ req }) => {
      // Only admins can read all payments
      if (req.user?.role === 'admin') return true;
      // Users can read their own payments
      return { createdBy: { equals: req.user?.id } };
    },
    create: ({ req }) => {
      // Only authenticated users can create payments
      return !!req.user;
    },
    update: ({ req }) => {
      // Only admins can update payments
      return req.user?.role === 'admin';
    },
    delete: ({ req }) => {
      // Only admins can delete payments
      return req.user?.role === 'admin';
    },
  },
  fields: [
    {
      name: 'experienceId',
      type: 'relationship',
      relationTo: 'experiences',
      required: true,
      label: 'Experience',
      admin: {
        description: 'The experience created for the contest',
      },
    },
    {
      name: 'orderId',
      type: 'text',
      required: true,
      label: 'Order ID',
      admin: {
        description: 'PayPal order ID',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: 'Amount',
      admin: {
        description: 'Payment amount in USD',
      },
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: 'USD',
      label: 'Currency',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
      defaultValue: 'pending',
      label: 'Status',
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      options: [
        { label: 'PayPal', value: 'paypal' },
        { label: 'Stripe', value: 'stripe' },
        { label: 'Credit Card', value: 'card' },
      ],
      label: 'Payment Method',
    },
    {
      name: 'paypalOrderId',
      type: 'text',
      label: 'PayPal Order ID',
      admin: {
        description: 'PayPal order identifier',
      },
    },
    {
      name: 'paypalCaptureId',
      type: 'text',
      label: 'PayPal Capture ID',
      admin: {
        description: 'PayPal capture identifier',
      },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      label: 'Stripe Payment Intent ID',
      admin: {
        description: 'Stripe payment intent identifier',
      },
    },
    {
      name: 'locationName',
      type: 'text',
      required: true,
      label: 'Location Name',
      admin: {
        description: 'Name of the location entered in contest',
      },
    },
    {
      name: 'city',
      type: 'text',
      required: true,
      label: 'City',
    },
    {
      name: 'state',
      type: 'text',
      label: 'State',
    },
    {
      name: 'country',
      type: 'text',
      required: true,
      defaultValue: 'US',
      label: 'Country',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Created By',
      admin: {
        description: 'User who made the payment',
      },
    },
    {
      name: 'paymentData',
      type: 'json',
      label: 'Payment Data',
      admin: {
        description: 'Raw payment response data',
      },
    },
    {
      name: 'metadata',
      type: 'group',
      label: 'Metadata',
      fields: [
        {
          name: 'ipAddress',
          type: 'text',
          label: 'IP Address',
          admin: {
            description: 'IP address of the user',
          },
        },
        {
          name: 'userAgent',
          type: 'text',
          label: 'User Agent',
          admin: {
            description: 'Browser/device information',
          },
        },
        {
          name: 'referrer',
          type: 'text',
          label: 'Referrer',
          admin: {
            description: 'Page that referred the user',
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Set createdBy if not provided
        if (operation === 'create' && !data.createdBy && req.user) {
          data.createdBy = req.user.id;
        }

        // Add metadata if available
        if (req && req.headers) {
          const forwardedFor = req.headers.get('x-forwarded-for');
          const realIp = req.headers.get('x-real-ip');
          data.metadata = {
            ...data.metadata,
            ipAddress: forwardedFor || realIp || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
            referrer: req.headers.get('referer') || 'unknown',
          };
        }

        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, operation }) => {
        // Log payment activity
        console.log(`💳 Contest payment ${operation}:`, {
          paymentId: doc.id,
          experienceId: doc.experienceId,
          amount: doc.amount,
          status: doc.status,
          paymentMethod: doc.paymentMethod,
          locationName: doc.locationName,
          operation,
        });

        // If payment is completed, ensure the experience is contest eligible
        if (operation === 'create' && doc.status === 'completed') {
          try {
            const payload = req.payload;
            await payload.update({
              collection: 'experiences',
              id: doc.experienceId,
              data: {
                contestEligible: true,
                status: 'published',
              },
            });
            console.log('✅ Experience marked as contest eligible:', doc.experienceId);
          } catch (error) {
            console.error('Failed to update experience contest eligibility:', error);
          }
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['orderId'],
      unique: true,
    },
    {
      fields: ['experienceId'],
    },
    {
      fields: ['createdBy'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['paymentMethod'],
    },
    {
      fields: ['createdAt'],
    },
  ],
  timestamps: true,
};

export default ContestPayments;
