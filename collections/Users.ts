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
        `Welcome to Sacavia, please verify ${user?.email}`,   // Custom subject
      generateEmailHTML: (args: any) => {
        const { req, token, user } = args || {};
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
                          Thank you for joining Sacavia! We're excited to have you as part of our community of explorers. To get started on your journey of guided discovery, please verify your email address by clicking the button below:
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
                        <p style="margin-top:0;margin-bottom:30px;font-size:14px;color:#666666;word-break:break-all;background-color:#f3f4f6;padding:12px;border-radius:8px;border:1px solid #8B4513;">
                          <a href="${url}" style="color:#8B4513;text-decoration:none;">${url}</a>
                        </p>
                        
                        <p style="margin-top:30px;margin-bottom:0;border-top:1px solid #8B4513;padding-top:20px;">
                          Blessings on your journey,<br />
                          <strong>The Sacavia Team</strong>
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
      generateEmailSubject: (args: any) => 
        `Reset your Sacavia password`,
      generateEmailHTML: (args: any) => {
        const { req, token, user } = args || {};
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
                          We received a request to reset your password for your Sacavia account. If you didn't make this request, you can safely ignore this email.
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
    delete: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // Track username changes for 7-day cooldown
        if (operation === 'update' && data.username && originalDoc?.username && data.username !== originalDoc.username) {
          data.lastUsernameChange = new Date()
        }
        
        // Initialize creatorProfile for creators if it doesn't exist
        if ((data.role === 'creator' || data.isCreator) && !data.creatorProfile) {
          data.creatorProfile = {
            creatorLevel: 'explorer',
            specialty: [],
            experienceAreas: [],
            verification: {
              isVerified: false,
              verifiedAt: null,
              verificationMethod: null
            },
            stats: {
              totalGuides: 0,
              publishedGuides: 0,
              totalViews: 0,
              totalSales: 0,
              totalEarnings: 0,
              averageRating: null,
              followerCount: 0
            },
            earnings: {
              totalEarnings: 0,
              withdrawalSettings: {
                payoutMethod: null,
                payoutEmail: null,
                stripeAccountId: null
              }
            },
            joinedCreatorProgram: new Date(),
            creatorBio: '',
            website: ''
          }
        }
        
        // Ensure verification object exists within creatorProfile for ALL users (even existing ones)
        if (data.creatorProfile && !data.creatorProfile.verification) {
          data.creatorProfile.verification = {
            isVerified: false,
            verifiedAt: null,
            verificationMethod: null
          }
        }
        
        return data
      },
      async ({ data, req, operation }) => {
        // Auto-update updatedAt timestamp
        if (operation === 'update') {
          data.updatedAt = new Date().toISOString()
        }
        
        return data
      }
    ],
    afterRead: [
      async ({ doc, req }) => {
        // Fix existing users that don't have the new verification structure
        if (doc && typeof doc === 'object') {
          let needsUpdate = false
          
          // If user has creatorProfile but missing verification
          if (doc.creatorProfile && !doc.creatorProfile.verification) {
            doc.creatorProfile.verification = {
              isVerified: false,
              verifiedAt: null,
              verificationMethod: null
            }
            needsUpdate = true
          }
          
          // If user is a creator but has no creatorProfile at all
          if ((doc.role === 'creator' || doc.isCreator) && !doc.creatorProfile) {
            doc.creatorProfile = {
              creatorLevel: 'explorer',
              specialty: [],
              experienceAreas: [],
              verification: {
                isVerified: false,
                verifiedAt: null,
                verificationMethod: null
              },
              stats: {
                totalGuides: 0,
                publishedGuides: 0,
                totalViews: 0,
                totalSales: 0,
                totalEarnings: 0,
                averageRating: null,
                followerCount: 0
              },
              earnings: {
                totalEarnings: 0,
                withdrawalSettings: {
                  payoutMethod: null,
                  payoutEmail: null,
                  stripeAccountId: null
                }
              },
              joinedCreatorProgram: new Date(),
              creatorBio: '',
              website: ''
            }
            needsUpdate = true
          }
          
          // Update the user in the database if needed (but only for significant operations)
          if (needsUpdate && req?.payload && doc.id) {
            try {
              await req.payload.update({
                collection: 'users',
                id: doc.id,
                data: {
                  creatorProfile: doc.creatorProfile
                }
              })
            } catch (error) {
              // Silently fail to avoid infinite loops, but log the error
              req?.payload?.logger?.warn('Failed to auto-update user verification structure:', error)
            }
          }
        }
        
        return doc
      }
    ],
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (operation !== 'update' || !req.payload || !previousDoc) return doc;

        // Note: Follow notifications are now handled by the centralized notification service
        // in the API routes to avoid duplicates and ensure consistent formatting
        
        return doc;
      },
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc;

        try {
          const { broadcastMessage } = await import('@/lib/wsServer');
          const { createBaseMessage, RealTimeEventType } = await import('@/lib/realtimeEvents');
          
          // Handle user profile updates
          if (operation === 'update' && previousDoc) {
            // Check if profile data changed
            const profileChanged = 
              doc.name !== previousDoc.name ||
              doc.avatar !== previousDoc.avatar ||
              doc.bio !== previousDoc.bio ||
              doc.location !== previousDoc.location ||
              doc.isVerified !== previousDoc.isVerified ||
              doc.isBusinessOwner !== previousDoc.isBusinessOwner;

            if (profileChanged) {
              const profileUpdateMessage: any = {
                messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                timestamp: new Date().toISOString(),
                eventType: RealTimeEventType.USER_PROFILE_UPDATED,
                actorId: doc.id,
                data: {
                  userId: doc.id,
                  updates: {
                    name: doc.name,
                    avatar: doc.avatar?.url,
                    bio: doc.bio,
                    location: doc.location,
                    isVerified: doc.isVerified,
                    isBusinessOwner: doc.isBusinessOwner
                  },
                  previousData: {
                    name: previousDoc.name,
                    avatar: previousDoc.avatar?.url,
                    bio: previousDoc.bio,
                    location: previousDoc.location,
                    isVerified: previousDoc.isVerified,
                    isBusinessOwner: previousDoc.isBusinessOwner
                  }
                }
              };

              broadcastMessage(profileUpdateMessage, {
                targetUserIds: [doc.id],
                queueForOffline: true
              });

              console.log(`📡 [Users] Real-time event broadcasted: USER_PROFILE_UPDATED for user ${doc.id}`);
            }

            // Check if user status changed
            const statusChanged = 
              doc.isOnline !== previousDoc.isOnline ||
              doc.lastSeen !== previousDoc.lastSeen ||
              doc.status !== previousDoc.status;

            if (statusChanged) {
              const statusUpdateMessage: any = {
                messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                timestamp: new Date().toISOString(),
                eventType: RealTimeEventType.USER_STATUS_CHANGED,
                actorId: doc.id,
                data: {
                  userId: doc.id,
                  status: {
                    isOnline: doc.isOnline,
                    lastSeen: doc.lastSeen,
                    status: doc.status
                  },
                  previousStatus: {
                    isOnline: previousDoc.isOnline,
                    lastSeen: previousDoc.lastSeen,
                    status: previousDoc.status
                  }
                }
              };

              broadcastMessage(statusUpdateMessage, {
                excludeUserIds: [doc.id],
                queueForOffline: true
              });

              console.log(`📡 [Users] Real-time event broadcasted: USER_STATUS_CHANGED for user ${doc.id}`);
            }

            // Check if user preferences changed
            const preferencesChanged = 
              JSON.stringify(doc.preferences) !== JSON.stringify(previousDoc.preferences) ||
              doc.notificationSettings !== previousDoc.notificationSettings ||
              doc.privacySettings !== previousDoc.privacySettings;

            if (preferencesChanged) {
              const preferencesUpdateMessage: any = {
                messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                timestamp: new Date().toISOString(),
                eventType: RealTimeEventType.USER_PREFERENCES_CHANGED,
                actorId: doc.id,
                data: {
                  userId: doc.id,
                  preferences: doc.preferences,
                  notificationSettings: doc.notificationSettings,
                  privacySettings: doc.privacySettings,
                  previousPreferences: previousDoc.preferences,
                  previousNotificationSettings: previousDoc.notificationSettings,
                  previousPrivacySettings: previousDoc.privacySettings
                }
              };

              broadcastMessage(preferencesUpdateMessage, {
                targetUserIds: [doc.id],
                queueForOffline: true
              });

              console.log(`📡 [Users] Real-time event broadcasted: USER_PREFERENCES_CHANGED for user ${doc.id}`);
            }
          }

          // Handle new user creation
          if (operation === 'create') {
            const newUserMessage: any = {
              messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              timestamp: new Date().toISOString(),
              eventType: RealTimeEventType.USER_CREATED,
              actorId: doc.id,
              data: {
                user: {
                  id: doc.id,
                  name: doc.name,
                  email: doc.email,
                  avatar: doc.avatar?.url,
                  isVerified: doc.isVerified,
                  isBusinessOwner: doc.isBusinessOwner,
                  createdAt: doc.createdAt
                }
              }
            };

            broadcastMessage(newUserMessage, {
              excludeUserIds: [doc.id],
              queueForOffline: true
            });

            console.log(`📡 [Users] Real-time event broadcasted: USER_CREATED for user ${doc.id}`);
          }

        } catch (realtimeError) {
          console.warn('Failed to broadcast real-time events for user:', realtimeError);
        }

        return doc;
      }
    ],
    afterDelete: [
      async ({ req, doc, id }) => {
        if (!req.payload) return;

        try {
          const { broadcastMessage } = await import('@/lib/wsServer');
          const { createBaseMessage, RealTimeEventType } = await import('@/lib/realtimeEvents');
          
          const userDeletedMessage: any = {
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            eventType: RealTimeEventType.USER_DELETED,
            data: {
              userId: id,
              removeFromFeeds: true,
              cleanupRequired: true
            }
          };

          broadcastMessage(userDeletedMessage, {
            queueForOffline: true
          });

          console.log(`📡 [Users] Real-time event broadcasted: USER_DELETED for user ${id}`);
        } catch (realtimeError) {
          console.warn('Failed to broadcast real-time event for user deletion:', realtimeError);
        }
      }
    ]
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { 
      name: 'username', 
      type: 'text', 
      unique: true,
      required: false, // Not required for updates, only for new accounts if desired
      admin: {
        description: 'Unique username for the user (no spaces, lowercase)'
      },
      validate: (value: any, { operation, data, originalDoc }: any) => {
        // For update operations, allow empty username if it's not being changed
        if (operation === 'update' && (!value || value === '')) {
          return true
        }
        
        // For update operations, check if username is actually being changed
        if (operation === 'update' && originalDoc?.username && value === originalDoc.username) {
          return true // Username hasn't changed, allow it
        }
        
        // For create operations or when username is being set/changed, validate
        if (value) {
          if (!/^[a-z0-9_-]+$/.test(value)) {
            return 'Username can only contain lowercase letters, numbers, hyphens, and underscores'
          }
          if (value.length < 3) return 'Username must be at least 3 characters long'
          if (value.length > 30) return 'Username must be less than 30 characters'
          
          // Check 7-day cooldown ONLY when username is actually being changed
          if (operation === 'update' && originalDoc?.username && value !== originalDoc.username && originalDoc?.lastUsernameChange) {
            const lastChange = new Date(originalDoc.lastUsernameChange)
            const now = new Date()
            const daysSinceLastChange = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
            
            if (daysSinceLastChange < 7) {
              return `You can only change your username once every 7 days. Please wait ${Math.ceil(7 - daysSinceLastChange)} more days.`
            }
          }
        }
        
        return true
      }
    },
    { 
      name: 'lastUsernameChange', 
      type: 'date',
      admin: {
        description: 'When the user last changed their username (7-day cooldown)',
        readOnly: true
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
      type: 'text', 
      hasMany: true,
      admin: {
        description: 'User interests for personalized recommendations (stored as category slugs)'
      },
      validate: (value: string[] | null | undefined) => {
        // Allow any valid string values for flexibility
        if (value === null || value === undefined) return true
        if (!Array.isArray(value)) return 'Interests must be an array'
        for (const interest of value) {
          if (typeof interest !== 'string' || interest.trim().length === 0) {
            return 'Each interest must be a non-empty string'
          }
        }
        return true
      }
    },
    { 
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Creator', value: 'creator' },
        { label: 'Admin', value: 'admin' },
      ],
      admin: {
        description: 'User role - determines permissions and features'
      }
    },
    { name: 'isCreator', type: 'checkbox', defaultValue: false },
    {
      name: 'creatorProfile',
      type: 'group',
      admin: {
        condition: data => Boolean(data?.isCreator) || data?.role === 'creator',
        description: 'Creator-specific profile information'
      },
      defaultValue: {
        creatorLevel: 'explorer',
        specialty: [],
        experienceAreas: [],
        verification: {
          isVerified: false,
          verifiedAt: null,
          verificationMethod: null
        },
        stats: {
          totalGuides: 0,
          publishedGuides: 0,
          totalViews: 0,
          totalSales: 0,
          totalEarnings: 0,
          averageRating: null,
          followerCount: 0
        },
        earnings: {
          totalEarnings: 0,
          withdrawalSettings: {
            payoutMethod: null,
            payoutEmail: null,
            stripeAccountId: null
          }
        },
        joinedCreatorProgram: null,
        creatorBio: '',
        website: ''
      },
      fields: [
        {
          name: 'creatorLevel',
          type: 'select',
          options: [
            { label: 'Local Explorer', value: 'explorer' },
            { label: 'Hidden Gem Hunter', value: 'hunter' },
            { label: 'Local Authority', value: 'authority' },
            { label: 'Destination Expert', value: 'expert' },
          ],
          defaultValue: 'explorer',
        },
        {
          name: 'specialty',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Food & Dining', value: 'food' },
            { label: 'Nightlife & Entertainment', value: 'nightlife' },
            { label: 'Culture & Arts', value: 'culture' },
            { label: 'Outdoor & Adventure', value: 'outdoor' },
            { label: 'Shopping', value: 'shopping' },
            { label: 'Historical', value: 'historical' },
            { label: 'Family-Friendly', value: 'family' },
            { label: 'Hidden Gems', value: 'hidden' },
            { label: 'Photography', value: 'photography' },
            { label: 'Local Lifestyle', value: 'lifestyle' },
          ],
          admin: {
            description: 'Areas of expertise for creating guides'
          }
        },
        {
          name: 'experienceAreas',
          type: 'relationship',
          relationTo: 'locations',
          hasMany: true,
          admin: {
            description: 'Locations this creator has expertise in'
          }
        },
        {
          name: 'applicationStatus',
          type: 'select',
          defaultValue: 'not_applied',
          options: [
            { label: 'Not Applied', value: 'not_applied' },
            { label: 'Application Pending', value: 'pending' },
            { label: 'Application Approved', value: 'approved' },
            { label: 'Application Rejected', value: 'rejected' },
          ],
          admin: {
            description: 'Status of creator application process'
          }
        },
        {
          name: 'verification',
          type: 'group',
          admin: {
            description: 'Creator verification status and details'
          },
          defaultValue: {
            isVerified: false,
            verifiedAt: null,
            verificationMethod: null
          },
          fields: [
            {
              name: 'isVerified',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Whether this creator is verified'
              }
            },
            {
              name: 'verifiedAt',
              type: 'date',
              admin: {
                readOnly: true,
              }
            },
            {
              name: 'verificationMethod',
              type: 'select',
              options: [
                { label: 'Local Knowledge Test', value: 'knowledge_test' },
                { label: 'Community Vouching', value: 'community' },
                { label: 'Content Quality Review', value: 'content_review' },
                { label: 'Manual Verification', value: 'manual' },
              ],
              admin: {
                description: 'Method used for verification (only shown for verified creators)'
              }
            },
          ]
        },
        {
          name: 'stats',
          type: 'group',
          admin: {
            readOnly: true,
            description: 'Creator statistics (automatically calculated)'
          },
          fields: [
            {
              name: 'totalGuides',
              type: 'number',
              defaultValue: 0,
              admin: { readOnly: true }
            },
            {
              name: 'publishedGuides',
              type: 'number',
              defaultValue: 0,
              admin: { readOnly: true }
            },
            {
              name: 'totalViews',
              type: 'number',
              defaultValue: 0,
              admin: { readOnly: true }
            },
            {
              name: 'totalSales',
              type: 'number',
              defaultValue: 0,
              admin: { readOnly: true }
            },
            {
              name: 'totalEarnings',
              type: 'number',
              defaultValue: 0,
              admin: { readOnly: true }
            },
            {
              name: 'averageRating',
              type: 'number',
              admin: { readOnly: true }
            },
            {
              name: 'followerCount',
              type: 'number',
              defaultValue: 0,
              admin: { readOnly: true }
            },
          ]
        },
        {
          name: 'earnings',
          type: 'group',
          fields: [
            {
              name: 'totalEarnings',
              type: 'number',
              defaultValue: 0,
              admin: {
                readOnly: true,
                description: 'Total earnings from guide sales'
              }
            },
            {
              name: 'availableBalance',
              type: 'number',
              defaultValue: 0,
              admin: {
                readOnly: true,
                description: 'Available balance for withdrawal'
              }
            },
            {
              name: 'pendingBalance',
              type: 'number',
              defaultValue: 0,
              admin: {
                readOnly: true,
                description: 'Pending balance (processing payouts)'
              }
            },
            {
              name: 'totalPayouts',
              type: 'number',
              defaultValue: 0,
              admin: {
                readOnly: true,
                description: 'Total amount paid out to creator'
              }
            },
            {
              name: 'lastPayoutDate',
              type: 'date',
              admin: {
                readOnly: true,
                description: 'Date of last payout'
              }
            },
            {
              name: 'stripeAccountId',
              type: 'text',
              admin: {
                description: 'Stripe Connect account ID for payouts'
              }
            },
            {
              name: 'stripeAccountStatus',
              type: 'select',
              defaultValue: 'not_connected',
              options: [
                { label: 'Not Connected', value: 'not_connected' },
                { label: 'Pending Setup', value: 'pending' },
                { label: 'Active', value: 'active' },
                { label: 'Restricted', value: 'restricted' },
              ],
              admin: {
                description: 'Status of Stripe Connect account'
              }
            },
            {
              name: 'withdrawalSettings',
              type: 'group',
              fields: [
                {
                  name: 'payoutMethod',
                  type: 'select',
                  options: [
                    { label: 'PayPal', value: 'paypal' },
                    { label: 'Stripe', value: 'stripe' },
                    { label: 'Bank Transfer', value: 'bank' },
                  ]
                },
                {
                  name: 'payoutEmail',
                  type: 'email',
                  admin: {
                    description: 'PayPal email for payouts'
                  }
                },
              ]
            }
          ]
        },
        {
          name: 'joinedCreatorProgram',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'When the user became a creator'
          }
        },
        {
          name: 'creatorBio',
          type: 'textarea',
          maxLength: 500,
          admin: {
            description: 'Extended bio for creator profile (different from regular bio)'
          }
        },
        {
          name: 'website',
          type: 'text',
          admin: {
            description: 'Creator website or portfolio'
          }
        },
      ]
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
    { 
      name: 'joinedChallenges', 
      type: 'text', 
      hasMany: true,
      admin: { 
        description: 'Challenges the user has joined (stored as weeklyFeatureId-challengeTitle)'
      }
    },
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
    // Reset password token fields
    { 
      name: 'resetPasswordToken', 
      type: 'text',
      admin: {
        hidden: true,
        description: 'Token for password reset'
      }
    },
    { 
      name: 'resetPasswordExpiration', 
      type: 'date',
      admin: {
        hidden: true,
        description: 'Expiration time for password reset token'
      }
    },
    { 
      name: 'lastResendVerificationTime', 
      type: 'date',
      admin: {
        hidden: true,
        description: 'Timestamp of last verification email resend (for rate limiting)'
      }
    },
    { 
      name: '_verificationTokenExpiry', 
      type: 'date',
      admin: {
        hidden: true,
        description: 'Expiration time for verification token'
      }
    },

    { 
      name: 'lastLogin', 
      type: 'date',
      admin: {
        hidden: true,
        description: 'Timestamp of last successful login'
      }
    },
    { 
      name: 'rememberMeEnabled', 
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true,
        description: 'Whether user has enabled remember me functionality'
      }
    },
    { 
      name: 'lastRememberMeDate', 
      type: 'date',
      admin: {
        hidden: true,
        description: 'When remember me was last enabled'
      }
    },
    { 
      name: 'deviceInfo', 
      type: 'group',
      admin: {
        hidden: true,
        description: 'Device information for mobile authentication'
      },
      fields: [
        { 
          name: 'deviceId', 
          type: 'text',
          admin: {
            description: 'Unique device identifier'
          }
        },
        { 
          name: 'platform', 
          type: 'select',
          options: [
            { label: 'iOS', value: 'ios' },
            { label: 'Android', value: 'android' },
            { label: 'Web', value: 'web' }
          ],
          admin: {
            description: 'Platform the user is using'
          }
        },
        { 
          name: 'appVersion', 
          type: 'text',
          admin: {
            description: 'App version (for mobile)'
          }
        },
        { 
          name: 'lastSeen', 
          type: 'date',
          admin: {
            description: 'When the device was last active'
          }
        }
      ]
    },
    // Business Owner fields
    { 
      name: 'isBusinessOwner', 
      type: 'checkbox', 
      defaultValue: false,
      admin: {
        description: 'Whether the user is a business owner'
      }
    },
    {
      name: 'businessOwnerProfile',
      type: 'group',
      admin: {
        condition: data => Boolean(data?.isBusinessOwner),
        description: 'Business owner profile information'
      },
      fields: [
        {
          name: 'businessName',
          type: 'text',
          admin: {
            description: 'Primary business name (for multi-location businesses)'
          }
        },
        {
          name: 'contactEmail',
          type: 'email',
          required: true,
          admin: {
            description: 'Business contact email'
          }
        },
        {
          name: 'phoneNumber',
          type: 'text',
          admin: {
            description: 'Business phone number'
          }
        },
        {
          name: 'website',
          type: 'text',
          admin: {
            description: 'Business website'
          }
        },
        {
          name: 'businessType',
          type: 'select',
          options: [
            { label: 'Restaurant', value: 'restaurant' },
            { label: 'Retail', value: 'retail' },
            { label: 'Service', value: 'service' },
            { label: 'Entertainment', value: 'entertainment' },
            { label: 'Other', value: 'other' }
          ],
          admin: {
            description: 'Type of business'
          }
        },
        {
          name: 'verificationStatus',
          type: 'select',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Verified', value: 'verified' },
            { label: 'Rejected', value: 'rejected' }
          ],
          defaultValue: 'pending',
          admin: {
            description: 'Business verification status'
          }
        },
        {
          name: 'verificationDocuments',
          type: 'upload',
          relationTo: 'media',
          hasMany: true,
          admin: {
            description: 'Business verification documents (license, tax documents, etc.)'
          }
        },
        {
          name: 'approvedAt',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'When the business owner was approved'
          }
        },
        {
          name: 'approvedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            readOnly: true,
            description: 'Admin who approved the business owner'
          }
        },
        {
          name: 'rejectionReason',
          type: 'textarea',
          admin: {
            description: 'Reason for rejection (if applicable)'
          }
        }
      ]
    },
    {
      name: 'ownedLocations',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: true,
      admin: {
        description: 'Locations owned by this business owner'
      }
    },
    {
      name: 'businessApiKey',
      type: 'text',
      admin: {
        hidden: true,
        description: 'API key for business webhook access'
      }
    },
  ]
};
