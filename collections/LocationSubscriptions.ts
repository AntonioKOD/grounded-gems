import { CollectionConfig } from 'payload';

export const LocationSubscriptions: CollectionConfig = {
  slug: 'locationSubscriptions',
  labels: {
    singular: 'Location Subscription',
    plural: 'Location Subscriptions',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'user', 'location', 'notificationType', 'isActive', 'updatedAt'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      hasMany: false,
    },
    {
      name: 'notificationType',
      type: 'select',
      options: [
        { label: 'All Notifications', value: 'all' },
        { label: 'Events Only', value: 'events' },
        { label: 'Updates Only', value: 'updates' },
        { label: 'Specials & Offers', value: 'specials' },
        { label: 'Business Hours Changes', value: 'business_hours' },
        { label: 'New Reviews', value: 'reviews' },
        { label: 'Menu Updates', value: 'menu_updates' },
        { label: 'Proximity Alerts', value: 'proximity' },
        { label: 'Friend Check-ins', value: 'friend_checkins' },
        { label: 'Milestone Celebrations', value: 'milestones' },
      ],
      defaultValue: 'all',
      required: true,
    },
    {
      name: 'proximityRadius',
      type: 'number',
      label: 'Proximity Radius (meters)',
      defaultValue: 100,
      min: 50,
      max: 5000,
      admin: {
        condition: (data) => data.notificationType === 'proximity' || data.notificationType === 'all',
        description: 'Get notified when you are within this distance of the location',
      },
    },
    {
      name: 'notificationSchedule',
      type: 'group',
      label: 'Notification Schedule',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Schedule Notifications',
          defaultValue: false,
        },
        {
          name: 'daysOfWeek',
          type: 'select',
          label: 'Days of Week',
          hasMany: true,
          options: [
            { label: 'Monday', value: 'monday' },
            { label: 'Tuesday', value: 'tuesday' },
            { label: 'Wednesday', value: 'wednesday' },
            { label: 'Thursday', value: 'thursday' },
            { label: 'Friday', value: 'friday' },
            { label: 'Saturday', value: 'saturday' },
            { label: 'Sunday', value: 'sunday' },
          ],
          admin: {
            condition: (data) => data.notificationSchedule?.enabled,
          },
        },
        {
          name: 'startTime',
          type: 'text',
          label: 'Start Time',
          admin: {
            condition: (data) => data.notificationSchedule?.enabled,
            placeholder: '09:00',
          },
        },
        {
          name: 'endTime',
          type: 'text',
          label: 'End Time',
          admin: {
            condition: (data) => data.notificationSchedule?.enabled,
            placeholder: '21:00',
          },
        },
      ],
    },
    {
      name: 'quietHours',
      type: 'group',
      label: 'Quiet Hours',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Enable Quiet Hours',
          defaultValue: true,
        },
        {
          name: 'startTime',
          type: 'text',
          label: 'Start Time',
          defaultValue: '22:00',
          admin: {
            condition: (data) => data.quietHours?.enabled,
          },
        },
        {
          name: 'endTime',
          type: 'text',
          label: 'End Time',
          defaultValue: '08:00',
          admin: {
            condition: (data) => data.quietHours?.enabled,
          },
        },
      ],
    },
    {
      name: 'preferences',
      type: 'group',
      label: 'Notification Preferences',
      fields: [
        {
          name: 'enablePushNotifications',
          type: 'checkbox',
          label: 'Push Notifications',
          defaultValue: true,
        },
        {
          name: 'enableEmailNotifications',
          type: 'checkbox',
          label: 'Email Notifications',
          defaultValue: false,
        },
        {
          name: 'enableSMSNotifications',
          type: 'checkbox',
          label: 'SMS Notifications',
          defaultValue: false,
        },
        {
          name: 'maxNotificationsPerDay',
          type: 'number',
          label: 'Max Notifications Per Day',
          defaultValue: 5,
          min: 1,
          max: 20,
        },
        {
          name: 'priorityOnly',
          type: 'checkbox',
          label: 'High Priority Only',
          defaultValue: false,
          admin: {
            description: 'Only receive high priority notifications',
          },
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Active',
      defaultValue: true,
      required: true,
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'updatedAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ operation, data }) => {
        const now = new Date().toISOString();
        
        if (operation === 'create') {
          return {
            ...data,
            createdAt: now,
            updatedAt: now,
          };
        }
        
        if (operation === 'update') {
          return {
            ...data,
            updatedAt: now,
          };
        }
        
        return data;
      },
    ],
  },
}; 