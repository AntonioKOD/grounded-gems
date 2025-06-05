import type { CollectionConfig } from "payload"

export const DeviceTokens: CollectionConfig = {
  slug: "device-tokens",
  labels: {
    singular: "Device Token",
    plural: "Device Tokens",
  },
  access: {
    read: ({ req: { user } }) => {
      // Only admins or the token owner can read
      if (user?.role === 'admin') return true
      
      if (user) {
        return {
          user: {
            equals: user.id,
          },
        }
      }
      return false
    },
    create: ({ req: { user } }) => !!user, // Only authenticated users can create
    update: ({ req: { user } }) => {
      // Only admins or the token owner can update
      if (user?.role === 'admin') return true
      
      if (user) {
        return {
          user: {
            equals: user.id,
          },
        }
      }
      return false
    },
    delete: ({ req: { user } }) => {
      // Only admins or the token owner can delete
      if (user?.role === 'admin') return true
      
      if (user) {
        return {
          user: {
            equals: user.id,
          },
        }
      }
      return false
    },
  },
  admin: {
    useAsTitle: "platform",
    defaultColumns: ["user", "platform", "isActive", "lastSeen", "createdAt"],
    listSearchableFields: ["user", "platform", "token"],
  },
  fields: [
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
      admin: {
        description: "The user this token belongs to",
      },
    },
    {
      name: "token",
      type: "text",
      required: true,
      index: true,
      admin: {
        description: "The device push notification token",
      },
    },
    {
      name: "platform",
      type: "select",
      required: true,
      options: [
        { label: "iOS", value: "ios" },
        { label: "Android", value: "android" },
        { label: "Web", value: "web" },
      ],
      index: true,
      admin: {
        description: "The platform this token is for",
      },
    },
    {
      name: "deviceInfo",
      type: "group",
      label: "Device Information",
      fields: [
        {
          name: "platform",
          type: "text",
          label: "Platform Details",
          admin: {
            description: "Detailed platform information",
          },
        },
        {
          name: "version",
          type: "text",
          label: "App Version",
          admin: {
            description: "Version of the app when token was registered",
          },
        },
        {
          name: "model",
          type: "text",
          label: "Device Model",
          admin: {
            description: "Device model (e.g., iPhone 14, Pixel 7)",
          },
        },
        {
          name: "osVersion",
          type: "text",
          label: "OS Version",
          admin: {
            description: "Operating system version",
          },
        },
        {
          name: "appVersion",
          type: "text",
          label: "Application Version",
          admin: {
            description: "Version of the application",
          },
        },
      ],
      admin: {
        description: "Additional device information for analytics",
      },
    },
    {
      name: "isActive",
      type: "checkbox",
      required: true,
      defaultValue: true,
      index: true,
      admin: {
        description: "Whether this token is currently active",
      },
    },
    {
      name: "lastSeen",
      type: "date",
      admin: {
        description: "When this token was last seen/updated",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
    {
      name: "notificationCount",
      type: "number",
      defaultValue: 0,
      admin: {
        description: "Number of notifications sent to this token",
      },
    },
    {
      name: "failureCount",
      type: "number",
      defaultValue: 0,
      admin: {
        description: "Number of failed notification attempts",
      },
    },
    {
      name: "lastFailure",
      type: "date",
      admin: {
        description: "When the last notification failure occurred",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Set lastSeen to current time on updates
        if (operation === 'update') {
          data.lastSeen = new Date()
        }
        
        // Set createdAt on create
        if (operation === 'create') {
          data.createdAt = new Date()
          data.lastSeen = new Date()
        }
        
        return data
      },
    ],
  },
  timestamps: true,
} 