# Collections Analysis Report

## Overview
This report analyzes all collections in the Sacavia app to identify relationship issues, missing connections, and opportunities for improvement to create a more cohesive and robust system.

## Critical Issues Found

### 1. **Missing Core Collections**
- **LocationFollowers**: Referenced in `Specials.ts` but doesn't exist
- **Challenge Participation**: No way to track user participation in challenges
- **Creator Earnings**: No dedicated collection for tracking creator revenue

### 2. **Inconsistent Relationship Patterns**

#### User Profile Management
- **Issue**: User profiles scattered across multiple collections
- **Current**: Users, UserSubscriptions, separate creator fields
- **Problem**: No unified user profile management

#### Location Engagement
- **Issue**: Multiple overlapping collections for location interaction
- **Current**: LocationInteractions, SavedLocations, LocationSubscriptions
- **Problem**: Redundant functionality, potential data inconsistency

### 3. **Missing Critical Relationships**

#### Posts Collection
- **Missing**: Direct relationship to Reviews
- **Missing**: Connection to Guides for guide-related posts
- **Missing**: Link to Events for event posts

#### Reviews Collection
- **Missing**: Connection to Posts (review posts)
- **Missing**: Link to GuidePurchases (verified purchase reviews)
- **Missing**: Relationship to LocationInteractions

#### Guides Collection
- **Missing**: Connection to Reviews for guide reviews
- **Missing**: Link to Posts for guide-related content
- **Missing**: Relationship to Events (guide-based events)

### 4. **Notification System Issues**

#### Incomplete Coverage
- **Missing**: Guide-related notifications (purchases, reviews)
- **Missing**: Challenge participation notifications
- **Missing**: Creator milestone notifications
- **Missing**: Subscription status changes

#### Inconsistent Types
- **Issue**: Some notification types referenced but not defined
- **Example**: "journey_invite" used but not in options list

### 5. **Business Logic Gaps**

#### Revenue Tracking
- **Issue**: Fragmented across multiple collections
- **Current**: GuidePurchases, Payouts, UserSubscriptions
- **Missing**: Unified revenue dashboard data

#### Content Moderation
- **Issue**: Inconsistent moderation fields
- **Some have**: status, moderationNotes
- **Others missing**: moderation workflow

## Recommended Fixes

### 1. **Create Missing Collections**

#### LocationFollowers Collection
```typescript
export const LocationFollowers: CollectionConfig = {
  slug: 'locationFollowers',
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'location', type: 'relationship', relationTo: 'locations', required: true },
    { name: 'followedAt', type: 'date', defaultValue: () => new Date() },
    { name: 'notificationPreferences', type: 'select', options: [
      { label: 'All Updates', value: 'all' },
      { label: 'Events Only', value: 'events' },
      { label: 'Specials Only', value: 'specials' },
    ]},
  ],
  indexes: [{ fields: ['user', 'location'], unique: true }],
}
```

#### ChallengeParticipation Collection
```typescript
export const ChallengeParticipation: CollectionConfig = {
  slug: 'challengeParticipation',
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'challenge', type: 'relationship', relationTo: 'challenges', required: true },
    { name: 'status', type: 'select', options: [
      { label: 'Joined', value: 'joined' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Completed', value: 'completed' },
      { label: 'Abandoned', value: 'abandoned' },
    ]},
    { name: 'progress', type: 'json' },
    { name: 'completedAt', type: 'date' },
    { name: 'evidence', type: 'array', fields: [
      { name: 'type', type: 'select', options: [
        { label: 'Photo', value: 'photo' },
        { label: 'Check-in', value: 'checkin' },
        { label: 'Review', value: 'review' },
      ]},
      { name: 'data', type: 'json' },
    ]},
  ],
}
```

### 2. **Fix Relationship Issues**

#### Add Missing Relationships to Posts
```typescript
// Add to Posts collection fields:
{ name: 'relatedGuide', type: 'relationship', relationTo: 'guides' },
{ name: 'relatedEvent', type: 'relationship', relationTo: 'events' },
{ name: 'relatedReview', type: 'relationship', relationTo: 'reviews' },
```

#### Add Missing Relationships to Reviews
```typescript
// Add to Reviews collection fields:
{ name: 'relatedPost', type: 'relationship', relationTo: 'posts' },
{ name: 'verifiedPurchase', type: 'relationship', relationTo: 'guide-purchases' },
{ name: 'locationInteraction', type: 'relationship', relationTo: 'locationInteractions' },
```

#### Add Missing Relationships to Guides
```typescript
// Add to Guides collection fields:
{ name: 'relatedPosts', type: 'relationship', relationTo: 'posts', hasMany: true },
{ name: 'relatedEvents', type: 'relationship', relationTo: 'events', hasMany: true },
```

### 3. **Consolidate User Profile Data**

#### Enhanced Users Collection
```typescript
// Add to Users collection:
{
  name: 'profile',
  type: 'group',
  fields: [
    // Move relevant fields from UserSubscriptions here
    { name: 'subscriptionTier', type: 'select', /* options */ },
    { name: 'creatorLevel', type: 'select', /* options */ },
    { name: 'totalEarnings', type: 'number', defaultValue: 0 },
    { name: 'preferences', type: 'group', fields: [
      { name: 'notifications', type: 'json' },
      { name: 'privacy', type: 'json' },
      { name: 'content', type: 'json' },
    ]},
  ],
},
```

### 4. **Standardize Moderation Fields**

#### Universal Moderation Schema
```typescript
const moderationFields = [
  {
    name: 'moderation',
    type: 'group',
    fields: [
      { name: 'status', type: 'select', options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Flagged', value: 'flagged' },
      ]},
      { name: 'moderatedBy', type: 'relationship', relationTo: 'users' },
      { name: 'moderatedAt', type: 'date' },
      { name: 'notes', type: 'textarea' },
      { name: 'autoModeration', type: 'json' },
    ],
  },
];
```

### 5. **Improve Notification System**

#### Complete Notification Types
```typescript
// Add missing notification types:
{ label: 'Guide Purchased', value: 'guide_purchased' },
{ label: 'Guide Reviewed', value: 'guide_reviewed' },
{ label: 'Challenge Completed', value: 'challenge_completed' },
{ label: 'Creator Milestone', value: 'creator_milestone' },
{ label: 'Subscription Updated', value: 'subscription_updated' },
{ label: 'Payout Processed', value: 'payout_processed' },
```

### 6. **Create Unified Analytics Collection**

#### Analytics Collection
```typescript
export const Analytics: CollectionConfig = {
  slug: 'analytics',
  fields: [
    { name: 'entity', type: 'relationship', relationTo: [
      'users', 'locations', 'posts', 'guides', 'events'
    ]},
    { name: 'metric', type: 'text', required: true },
    { name: 'value', type: 'number', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'metadata', type: 'json' },
  ],
  indexes: [
    { fields: ['entity', 'metric', 'date'] },
  ],
}
```

## Performance Improvements

### 1. **Add Missing Indexes**
```typescript
// Add to multiple collections:
indexes: [
  { fields: ['createdAt'] },
  { fields: ['status', 'createdAt'] },
  { fields: ['user', 'createdAt'] },
]
```

### 2. **Optimize Relationship Queries**
- Add `depth` control to all relationship fields
- Implement proper pagination
- Add search indexes for text fields

### 3. **Cache Strategy**
- Implement Redis caching for frequently accessed data
- Add cache invalidation hooks
- Create materialized views for complex queries

## Data Integrity Improvements

### 1. **Add Validation Hooks**
```typescript
// Example for ensuring data consistency:
hooks: {
  beforeChange: [
    async ({ data, req, operation }) => {
      // Validate relationships exist
      // Check business rules
      // Ensure data consistency
    }
  ]
}
```

### 2. **Cascade Delete Policies**
- Define what happens when parent records are deleted
- Implement soft deletes where appropriate
- Add orphan cleanup jobs

## Business Logic Enhancements

### 1. **Unified Engagement System**
- Consolidate likes, saves, follows into single system
- Create engagement score calculation
- Implement recommendation engine data

### 2. **Revenue Management**
- Create unified revenue tracking
- Implement automatic payout calculations
- Add tax reporting capabilities

### 3. **Content Lifecycle**
- Standardize content approval workflows
- Implement automatic archiving
- Add content quality scoring

## Implementation Priority

### High Priority (Fix Immediately)
1. Create LocationFollowers collection
2. Fix notification system types
3. Add missing relationships to core collections
4. Standardize moderation fields

### Medium Priority (Next Sprint)
1. Consolidate user profile data
2. Create analytics collection
3. Add missing indexes
4. Implement cache strategy

### Low Priority (Future Enhancement)
1. Advanced analytics
2. Machine learning features
3. Advanced recommendation engine
4. Multi-tenant support

## Conclusion

The current collection structure has a solid foundation but needs several critical fixes to improve data consistency, performance, and maintainability. The most important issues to address are the missing LocationFollowers collection and inconsistent relationship patterns. Implementing these changes will create a more robust and scalable system. 