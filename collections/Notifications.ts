import type { CollectionConfig } from "payload"

export const Notifications: CollectionConfig = {
  slug: "notifications",
  labels: {
    singular: "Notification",
    plural: "Notifications",
  },
  access: {
    read: ({ req: { user } }) => {
      // Users can only read their own notifications
      if (user) {
        return {
          recipient: {
            equals: user.id,
          },
        }
      }
      return false
    },
    create: () => true, // System needs to create notifications
    update: ({ req: { user } }) => {
      // Users can only update their own notifications (to mark as read)
      if (user) {
        return {
          recipient: {
            equals: user.id,
          },
        }
      }
      return false
    },
    delete: ({ req: { user } }) => {
      // Users can only delete their own notifications
      if (user) {
        return {
          recipient: {
            equals: user.id,
          },
        }
      }
      return false
    },
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "recipient", "type", "read", "createdAt"],
  },
  fields: [
    {
      name: "recipient",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
    },
    {
      name: "type",
      type: "select",
      required: true,
      options: [
        { label: "Follow", value: "follow" },
        { label: "Like", value: "like" },
        { label: "Comment", value: "comment" },
        { label: "Mention", value: "mention" },
        { label: "Reminder", value: "reminder" },
        { label: "Event Update", value: "event_update" },
      ],
    },
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "message",
      type: "text",
    },
    {
      name: "relatedTo",
      type: "relationship",
      relationTo: ["posts", "users", "locations", "events", "specials"],
      hasMany: false,
    },
    {
      name: "read",
      type: "checkbox",
      defaultValue: false,
      index: true,
    },
    {
      name: "createdAt",
      type: "date",
      defaultValue: () => new Date().toISOString(),
      index: true,
    },
  ],
  indexes: [
    {
      fields: ["recipient", "read", "createdAt"],
    },
  ],
}
