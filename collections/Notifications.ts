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
        { label: "Event Invitation", value: "event_invitation" },
        // Journey invite notifications
        { label: "Journey Invite", value: "journey_invite" },
        { label: "Journey Invite Accepted", value: "journey_invite_accepted" },
        { label: "Journey Invite Declined", value: "journey_invite_declined" },
        // Location-based notifications
        { label: "Location Liked", value: "location_liked" },
        { label: "Location Shared", value: "location_shared" },
        { label: "Location Visited", value: "location_visited" },
        { label: "Location Saved", value: "location_saved" },
        { label: "Location Reviewed", value: "location_reviewed" },
        { label: "Location Verified", value: "location_verified" },
        { label: "Location Featured", value: "location_featured" },
        { label: "Location Published", value: "location_published" },
        { label: "Location Milestone", value: "location_milestone" },
        { label: "Location Interaction", value: "location_interaction" },
        // Event request notifications
        { label: "Event Request Received", value: "event_request_received" },
        { label: "Event Request Approved", value: "event_request_approved" },
        { label: "Event Request Denied", value: "event_request_denied" },
        // Other notifications
        { label: "New Review", value: "new_review" },
        { label: "Location Visit", value: "location_visit" },
        { label: "Business Hours Update", value: "business_hours_update" },
        { label: "Special Offer", value: "special_offer" },
        { label: "Proximity Alert", value: "proximity_alert" },
        { label: "Check-in", value: "check_in" },
        { label: "Location Trending", value: "location_trending" },
        { label: "Location Followed", value: "location_followed" },
        // Guide-related notifications
        { label: "Guide Purchased", value: "guide_purchased" },
        { label: "Guide Reviewed", value: "guide_reviewed" },
        { label: "Guide Published", value: "guide_published" },
        { label: "Guide Featured", value: "guide_featured" },
        // Challenge-related notifications
        { label: "Challenge Completed", value: "challenge_completed" },
        { label: "Challenge Joined", value: "challenge_joined" },
        { label: "Challenge Milestone", value: "challenge_milestone" },
        // Creator-related notifications
        { label: "Creator Milestone", value: "creator_milestone" },
        { label: "Creator Payout", value: "creator_payout" },
        { label: "Creator Badge Earned", value: "creator_badge" },
        // Subscription-related notifications
        { label: "Subscription Updated", value: "subscription_updated" },
        { label: "Subscription Expired", value: "subscription_expired" },
        { label: "Subscription Renewed", value: "subscription_renewed" },
        // Payout-related notifications
        { label: "Payout Processed", value: "payout_processed" },
        { label: "Payout Failed", value: "payout_failed" },
        // Photo submission notifications
        { label: "Photo Approved", value: "photo_approved" },
        { label: "Photo Rejected", value: "photo_rejected" },
        // Event notifications
        { label: "Event Created", value: "event_created" },
        { label: "Event Cancelled", value: "event_cancelled" },
        { label: "Event Reminder", value: "event_reminder" },
        // Journey notifications (add missing ones)
        { label: "Journey Invite", value: "journey_invite" },
        { label: "Journey Invite Accepted", value: "journey_invite_accepted" },
        { label: "Journey Invite Declined", value: "journey_invite_declined" },
        // System notifications
        { label: "System Maintenance", value: "system_maintenance" },
        { label: "Feature Update", value: "feature_update" },
        { label: "Welcome", value: "welcome" },
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
      relationTo: [
        "posts", 
        "users", 
        "locations", 
        "events", 
        "specials", 
        "eventRequests", 
        "journeys",
        "guides",
        "challenges",
        "challengeParticipation",
        "locationFollowers",
        "reviews",
        "guide-purchases",
        "payouts"
      ],
      hasMany: false,
    },
    {
      name: "actionBy",
      type: "relationship",
      relationTo: "users",
      label: "Action performed by",
      admin: {
        description: "User who performed the action that triggered this notification",
      },
    },
    {
      name: "metadata",
      type: "json",
      label: "Additional Data",
      admin: {
        description: "Additional context data for the notification",
      },
    },
    {
      name: "actionRequired",
      type: "checkbox",
      label: "Requires Action",
      defaultValue: false,
      admin: {
        description: "Whether this notification requires user action (e.g., approval)",
      },
    },
    {
      name: "actionStatus",
      type: "select",
      label: "Action Status",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Denied", value: "denied" },
        { label: "Expired", value: "expired" },
      ],
      admin: {
        condition: (data) => data.actionRequired,
        description: "Status of the action if this notification requires one",
      },
    },
    {
      name: "expiresAt",
      type: "date",
      label: "Expires At",
      admin: {
        description: "When this notification expires (for time-sensitive notifications)",
      },
    },
    {
      name: "priority",
      type: "select",
      label: "Priority",
      defaultValue: "normal",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
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
