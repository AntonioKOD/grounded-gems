
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
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Verify Your Email</title>
          </head>
          <body style="margin:0;padding:0;background-color:#ffffff;font-family:'Inter',Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="min-width:100%;border-collapse:collapse;">
              <tr>
                <td align="center" style="padding:40px 0;">
                  <table width="580" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.08);">
                    <!-- Logo Header -->
                    <tr>
                      <td align="center" style="padding:35px 30px 20px 30px;background-color:#ffffff;">
                        <img src="https://i.imgur.com/btJCRer.png" alt="Grounded Gems Logo" width="120" style="display:block;border:0;max-width:100%;" />
                      </td>
                    </tr>
                    
                    <!-- Colored Divider -->
                    <tr>
                      <td>
                        <div style="height:4px;background:linear-gradient(to right, #ff6b6b, #4ecdc4);margin:0 30px;"></div>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding:40px 30px;font-size:16px;line-height:1.6;color:#333333;">
                        <p style="margin-top:0;margin-bottom:20px;">
                          Hi <strong>${user.name}</strong>,
                        </p>
                        <p style="margin-top:0;margin-bottom:25px;">
                          Thank you for joining Grounded Gems! We're excited to have you as part of our community. To get started, please verify your email address by clicking the button below:
                        </p>
                        
                        <!-- Button -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center" style="padding:15px 0 25px 0;">
                              <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td align="center" style="border-radius:8px;background-color:#ff6b6b;">
                                    <a href="${url}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:16px;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:8px;">
                                      Verify Email
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin-top:0;margin-bottom:20px;font-size:14px;color:#666666;">
                          If the button above doesn't work, copy and paste this URL into your browser:
                        </p>
                        <p style="margin-top:0;margin-bottom:30px;font-size:14px;color:#666666;word-break:break-all;background-color:#f3f4f6;padding:12px;border-radius:8px;border:1px solid #4ecdc4;">
                          <a href="${url}" style="color:#ff6b6b;text-decoration:none;">${url}</a>
                        </p>
                        
                        <p style="margin-top:30px;margin-bottom:0;border-top:1px solid #4ecdc4;padding-top:20px;">
                          Cheers,<br />
                          <strong>The Grounded Gems Team</strong>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color:#f3f4f6;padding:25px 30px;text-align:center;font-size:13px;color:#666666;border-top:1px solid #4ecdc4;">
                        <p style="margin:0 0 10px 0;">
                          &copy; ${new Date().getFullYear()} Grounded Gems. All rights reserved.
                        </p>
                        <p style="margin:0;font-size:12px;color:#666666;">
                          If you didn't create an account with us, please disregard this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Accent Bar -->
                  <table width="580" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding:10px 0;">
                        <div style="height:4px;background:linear-gradient(to right, #ff6b6b, #4ecdc4, #ffe66d);border-radius:2px;"></div>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Space at bottom -->
                  <table width="580" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding:10px 0;text-align:center;font-size:12px;color:#666666;">
                        <p style="margin:0;">
                          This is an automated message, please do not reply.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        `;
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
