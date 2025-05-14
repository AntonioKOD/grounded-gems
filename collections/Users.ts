
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: {
      generateEmailSubject: ({ user }) => 
        `Welcome to Grounded Gems, please verify ${user.email}`,   // Custom subject  [oai_citation:14‡Payload](https://payloadcms.com/docs/authentication/email?utm_source=chatgpt.com)
      generateEmailHTML: ({ req, token, user }) => {
        const url = `${process.env.FRONTEND_URL}/verify?token=${token}`;
        return `
          <html>
            <body>
              <h1>Hello, ${user.email}!</h1>
              <p>Click below to verify your account:</p>
              <a href="${url}">${url}</a>
            </body>
          </html>`;
      }, 
    },
  },
  admin: {
    useAsTitle: 'email',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        // Only run on update operations
        if (operation !== "update" || !req.payload) return doc

        // Check if the followers array has changed
        const prevFollowers = previousDoc.followers || []
        const newFollowers = doc.followers || []

        // Find new followers (users who just followed this user)
        const newFollowerIds = newFollowers.filter((followerId: string) => !prevFollowers.includes(followerId))

        // Create notifications for new followers
        if (newFollowerIds.length > 0) {
          for (const followerId of newFollowerIds) {
            try {
              // Get follower details to include in notification
              const follower = await req.payload.findByID({
                collection: "users",
                id: followerId,
              })

              // Create notification for the user being followed
              await req.payload.create({
                collection: "notifications",
                data: {
                  recipient: doc.id,
                  type: "follow",
                  title: `${follower.name} started following you`,
                  relatedTo: {
                    relationTo: "users",
                    value: followerId,
                  },
                  read: false,
                  createdAt: new Date().toISOString(),
                },
              })
            } catch (error) {
              console.error("Error creating follow notification:", error)
            }
          }
        }

        return doc
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'profileImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'state',
          type: 'text',
        },
        {
          name: 'country',
          type: 'text',
        },
      ],
    },
    {
      name: 'interests',
      type: 'array',
      fields: [
        {
          name: 'interest',
          type: 'text',
        },
      ],
    },
    {
      name: 'isCreator',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'creatorLevel',
      type: 'select',
      options: [
        { label: 'Local Explorer', value: 'explorer' },
        { label: 'Hidden Gem Hunter', value: 'hunter' },
        { label: 'Local Authority', value: 'authority' },
        { label: 'Destination Expert', value: 'expert' },
      ],
      admin: {
        condition: (data) => data.isCreator,
      },
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: [
            { label: 'Instagram', value: 'instagram' },
            { label: 'Twitter', value: 'twitter' },
            { label: 'TikTok', value: 'tiktok' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Website', value: 'website' },
          ],
        },
        {
          name: 'url',
          type: 'text',
        },
      ],
    },
    {
      name: 'followers',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        description: 'Users who follow this user',
      },
    },
    {
      name: 'following',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    {
      name: 'likedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      admin: {
        description: 'Posts liked by this user',
      },
    }
  ],
};
