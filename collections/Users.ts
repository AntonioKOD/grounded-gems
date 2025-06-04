/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionConfig } from 'payload';


const normalizeId = (val: any): string => {
  if (typeof val === 'string') return val;
  if (val?.id) return val.id;
  if (val?._id) return val._id;
  throw new Error(`Unable to normalize ID from value: ${JSON.stringify(val)}`);
};

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 0, // Disable login attempt limits (0 = unlimited)
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
    forgotPassword: {
      generateEmailSubject: ({ user }) => 
        `Reset your Grounded Gems password`,
      generateEmailHTML: ({ req, token, user }) => {
        const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
       return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Reset Your Password</title>
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
                          Hi <strong>${user.name || user.email}</strong>,
                        </p>
                        <p style="margin-top:0;margin-bottom:25px;">
                          We received a request to reset your password for your Grounded Gems account. If you didn't make this request, you can safely ignore this email.
                        </p>
                        <p style="margin-top:0;margin-bottom:25px;">
                          To reset your password, click the button below:
                        </p>
                        
                        <!-- Button -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center" style="padding:15px 0 25px 0;">
                              <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td align="center" style="border-radius:8px;background-color:#ff6b6b;">
                                    <a href="${url}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:16px;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:8px;">
                                      Reset Password
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
                        
                        <p style="margin-top:0;margin-bottom:20px;font-size:14px;color:#999999;">
                          <strong>Security note:</strong> This password reset link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email or contact us if you have concerns.
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
                          If you didn't request this password reset, please ignore this email.
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
    tokenExpiration: 60 * 60 * 24 * 7,
    cookies: {
      secure: true,
      sameSite: 'None',
    },
  },
  admin: {
    useAsTitle: 'email',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: ({ req, id }) => req.user?.id === id,
  },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (operation !== 'update' || !req.payload || !previousDoc) return doc;

        const prevFollowers: any[] = previousDoc.followers || [];
        const newFollowers: any[] = doc.followers || [];

        // Determine newly added follower IDs
        const added = newFollowers
          .map(normalizeId)
          .filter(id => !prevFollowers.map(normalizeId).includes(id));

        for (const followerId of added) {
          try {
            // Do not notify if user follows themselves
            if (followerId === doc.id) continue;

            // Fetch follower details
            const follower = await req.payload.findByID({
              collection: 'users',
              id: followerId,
            });

            // Create notification for the user being followed
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: doc.id,
                type: 'follow',
                title: `${follower.name} started following you`,
                relatedTo: { relationTo: 'users', value: followerId },
                read: false,
              },
            });
          } catch (error) {
            req.payload.logger.error('Error creating follow notification:', error);
          }
        }

        return doc;
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { 
      name: 'username', 
      type: 'text', 
      required: true,
      unique: true,
      admin: {
        description: 'Unique username for the user (no spaces, lowercase)'
      },
      validate: (value: any) => {
        if (!value) return 'Username is required'
        if (!/^[a-z0-9_-].+$/.test(value)) {
          return 'Username can only contain lowercase letters, numbers, hyphens, and underscores'
        }
        if (value.length < 3) return 'Username must be at least 3 characters long'
        if (value.length > 30) return 'Username must be less than 30 characters'
        return true
      }
    },
    { name: 'profileImage', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'textarea' },
    {
      name: 'location',
      type: 'group',
      fields: [
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'country', type: 'text' },
        {
          name: 'coordinates',
          type: 'group',
          label: 'Coordinates',
          fields: [
            { name: 'latitude', type: 'number' },
            { name: 'longitude', type: 'number' },
          ],
        },
      ],
    },
    { 
      name: 'interests', 
      type: 'select', 
      hasMany: true,
      options: [
        { label: 'Coffee Shops', value: 'coffee' },
        { label: 'Restaurants', value: 'restaurants' },
        { label: 'Nature & Parks', value: 'nature' },
        { label: 'Photography Spots', value: 'photography' },
        { label: 'Nightlife', value: 'nightlife' },
        { label: 'Shopping', value: 'shopping' },
        { label: 'Arts & Culture', value: 'arts' },
        { label: 'Sports & Recreation', value: 'sports' },
        { label: 'Markets & Local Business', value: 'markets' },
        { label: 'Events & Entertainment', value: 'events' }
      ],
      admin: {
        description: 'Select your main interests for personalized recommendations'
      }
    },
    { name: 'isCreator', type: 'checkbox', defaultValue: false },
    {
      name: 'creatorLevel',
      type: 'select',
      options: [
        { label: 'Local Explorer', value: 'explorer' },
        { label: 'Hidden Gem Hunter', value: 'hunter' },
        { label: 'Local Authority', value: 'authority' },
        { label: 'Destination Expert', value: 'expert' },
      ],
      admin: { condition: data => data.isCreator },
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'platform', type: 'select', options: [
          { label: 'Instagram', value: 'instagram' },
          { label: 'Twitter', value: 'twitter' },
          { label: 'TikTok', value: 'tiktok' },
          { label: 'YouTube', value: 'youtube' },
          { label: 'Website', value: 'website' },
        ] },
        { name: 'url', type: 'text' },
      ],
    },
    { name: 'followers', type: 'relationship', relationTo: 'users', hasMany: true, admin: { description: 'Users who follow this user' } },
    { name: 'following', type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'likedPosts', type: 'relationship', relationTo: 'posts', hasMany: true },
    { name: 'savedPosts', type: 'relationship', relationTo: 'posts', hasMany: true },
    // Add persistent savedGemJourneys field
    {
      name: 'savedGemJourneys',
      type: 'relationship',
      relationTo: 'journeys',
      hasMany: true,
      admin: {
        description: 'Journeys saved by the user (Gem Journeys)'
      }
    },
    // Simplified onboarding preferences
    {
      name: 'onboardingData',
      type: 'group',
      admin: {
        description: 'Essential user preferences for personalization'
      },
      fields: [
        {
          name: 'primaryUseCase',
          type: 'select',
          options: [
            { label: 'Discover new places', value: 'explore' },
            { label: 'Plan outings', value: 'plan' },
            { label: 'Share discoveries', value: 'share' },
            { label: 'Meet like-minded people', value: 'connect' }
          ],
          admin: {
            description: 'How the user primarily wants to use the app'
          }
        },
        {
          name: 'travelRadius',
          type: 'select',
          options: [
            { label: 'Walking distance (0.5 mi)', value: '0.5' },
            { label: 'Nearby (2 mi)', value: '2' },
            { label: 'Local area (5 mi)', value: '5' },
            { label: 'Extended area (15 mi)', value: '15' },
            { label: 'Anywhere', value: 'unlimited' }
          ],
          defaultValue: '5'
        },
        {
          name: 'budgetPreference',
          type: 'select',
          options: [
            { label: 'Free activities', value: 'free' },
            { label: 'Budget-friendly ($)', value: 'budget' },
            { label: 'Moderate ($$)', value: 'moderate' },
            { label: 'Premium ($$$)', value: 'premium' },
            { label: 'Luxury ($$$$)', value: 'luxury' }
          ]
        },
        { 
          name: 'onboardingCompleted', 
          type: 'checkbox', 
          defaultValue: false,
          admin: {
            description: 'Whether user completed the basic onboarding flow'
          }
        },
        { 
          name: 'signupStep', 
          type: 'number', 
          defaultValue: 1,
          admin: {
            description: 'Current step in signup process (1-3)'
          }
        }
      ]
    },
    {
      name: 'sportsPreferences',
      type: 'group',
      fields: [
        { name: 'sports', type: 'select', hasMany: true, options: [
          { label: 'Tennis', value: 'tennis' },
          { label: 'Soccer', value: 'soccer' },
          { label: 'Basketball', value: 'basketball' },
        ] },
        { name: 'skillLevel', type: 'select', options: [
          { label: 'Beginner', value: 'beginner' },
          { label: 'Intermediate', value: 'intermediate' },
          { label: 'Advanced', value: 'advanced' },
        ] },
        { name: 'availability', type: 'array', fields: [
          { name: 'day', type: 'select', options: [
            { label: 'Monday', value: 'monday' },
            { label: 'Tuesday', value: 'tuesday' },
            { label: 'Wednesday', value: 'wednesday' },
            { label: 'Thursday', value: 'thursday' },
            { label: 'Friday', value: 'friday' },
            { label: 'Saturday', value: 'saturday' },
            { label: 'Sunday', value: 'sunday' },
          ] },
          { name: 'timeSlot', type: 'text' },
        ] },
      ],
    },
  ],
};
