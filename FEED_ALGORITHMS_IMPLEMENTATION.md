# Feed Algorithms Implementation

This document describes the implementation of sophisticated feed algorithms for the Discover, Popular, Latest, and Saved tabs in the Grounded Gems application.

## Overview

The feed system now includes four specialized algorithms that provide users with different content discovery experiences:

1. **Discover Feed** - Personalized content discovery
2. **Popular Feed** - Trending content based on engagement
3. **Latest Feed** - Chronological content with quality filtering
4. **Saved Posts** - User's bookmarked content

## Algorithm Details

### 🔍 Discover Algorithm (`getDiscoverFeed`)

**Purpose**: Provide personalized content discovery that balances multiple factors to surface interesting, relevant content.

**Scoring Components**:
- **Engagement Score (40%)**: `(likes × 3 + comments × 5 + shares × 7 + saves × 4) × 0.4`
- **Freshness Score (25%)**: Time-based scoring with sweet spot at 2-24 hours
- **Diversity Score (20%)**: Boosts posts from authors the user doesn't follow
- **Quality Indicators (15%)**: Bonuses for images, locations, high-rated reviews, substantial content

**Special Features**:
- Trending momentum detection (engagement rate > 5 interactions/hour)
- Location relevance (if user has location data)
- Fetches 3x requested posts to apply algorithm, then sorts and paginates

**Time Scoring Logic**:
```
< 2 hours: 20 points (avoid too recent)
2-24 hours: 100 points (sweet spot)
1-7 days: Declining score
> 7 days: 10 points (minimal)
```

### 🔥 Popular Algorithm (`getPopularFeed`)

**Purpose**: Surface content that's gaining significant engagement within a specified timeframe.

**Scoring Formula**:
```
popularityScore = (likes × 1.0 + comments × 3.0 + shares × 5.0 + saves × 2.5) × timeDecay
```

**Time Decay**: Exponential decay over 48 hours: `Math.exp(-hoursOld / 48)`

**Viral Bonus**: Posts with engagement rate > 10 interactions/hour get `engagementRate × 2` bonus

**Timeframe Options**:
- `24h`: Last 24 hours
- `7d`: Last 7 days (default)
- `30d`: Last 30 days

### ⏰ Latest Algorithm (`getLatestFeed`)

**Purpose**: Provide chronological content feed with basic quality assurance.

**Features**:
- Simple chronological sort (newest first)
- Quality filtering:
  - Content length > 10 characters
  - Has engagement OR is less than 24 hours old
- Optional category filtering
- Minimal processing for fast performance

### 🔖 Saved Posts Algorithm (`getSavedPostsFeed`)

**Purpose**: Display user's saved posts in order of when they were saved.

**Features**:
- Fetches user's `savedPosts` array from profile
- Sorts by save order (most recently saved first)
- Filters out unpublished posts
- Supports pagination for large collections
- Returns empty array if user not provided

## Implementation Architecture

### File Structure

```
app/actions.ts
├── getDiscoverFeed()
├── getPopularFeed()
├── getLatestFeed()
├── getSavedPostsFeed()
└── formatPostsForFrontend() (helper)

lib/features/feed/feedSlice.ts
├── fetchFeedPosts (updated with algorithm routing)
└── loadMorePosts (updated with algorithm routing)

components/feed/
├── mobile-feed-container.tsx (updated category handling)
└── feed-container.tsx (existing desktop implementation)
```

### Algorithm Routing

The feed slice automatically routes to the appropriate algorithm based on the category:

```typescript
switch (category) {
  case 'discover':
    posts = await getDiscoverFeed(currentUserId, page, 10)
    break
  case 'trending':
    posts = await getPopularFeed(currentUserId, page, 10, '7d')
    break
  case 'recent':
    posts = await getLatestFeed(currentUserId, page, 10)
    break
  case 'bookmarks':
    posts = await getSavedPostsFeed(currentUserId, page, 10)
    break
  default:
    posts = await getFeedPosts(feedType, sortBy, page, category, currentUserId)
}
```

## Mobile Feed Categories

The mobile feed container includes four main categories:

```typescript
const categories = [
  { id: "discover", name: "Discover", icon: Sparkles },
  { id: "trending", name: "Popular", icon: Flame },
  { id: "recent", name: "Latest", icon: Clock },
  { id: "bookmarks", name: "Saved", icon: BookmarkIcon },
]
```

## Performance Considerations

### Discover Algorithm
- Fetches 3x posts for better algorithm results
- Complex scoring but cached results
- User preference data cached per session

### Popular Algorithm
- Time-bounded queries for performance
- Exponential decay calculation is lightweight
- Configurable timeframes for different use cases

### Latest Algorithm
- Minimal processing for fastest performance
- Simple database sort with basic filtering
- Direct pagination support

### Saved Posts
- Direct ID-based lookup
- Client-side sorting for save order
- Efficient pagination

## Testing

A test page is available at `/test-feed-algorithms` that demonstrates all four algorithms with sample data and detailed explanations.

## Future Enhancements

### Potential Improvements

1. **Machine Learning Integration**
   - User behavior tracking
   - Content similarity scoring
   - Collaborative filtering

2. **Advanced Personalization**
   - Category preference learning
   - Time-of-day patterns
   - Social graph analysis

3. **Performance Optimizations**
   - Algorithm result caching
   - Pre-computed scores
   - Background score updates

4. **A/B Testing Framework**
   - Algorithm variant testing
   - Performance metrics
   - User engagement tracking

## Configuration

### Algorithm Parameters

Most algorithm parameters are configurable:

```typescript
// Discover algorithm weights
const ENGAGEMENT_WEIGHT = 0.4
const FRESHNESS_WEIGHT = 0.25
const DIVERSITY_WEIGHT = 0.2
const QUALITY_WEIGHT = 0.15

// Popular algorithm weights
const LIKE_WEIGHT = 1.0
const COMMENT_WEIGHT = 3.0
const SHARE_WEIGHT = 5.0
const SAVE_WEIGHT = 2.5

// Time decay parameters
const TIME_DECAY_HOURS = 48
const VIRAL_THRESHOLD = 10
```

## Error Handling

All algorithms include comprehensive error handling:
- Database connection failures
- Invalid user data
- Missing post data
- Graceful degradation to empty arrays

## Monitoring

Key metrics to monitor:
- Algorithm execution time
- Result set sizes
- User engagement with algorithmic results
- Cache hit rates
- Error rates per algorithm

This implementation provides a robust foundation for content discovery while maintaining flexibility for future enhancements and optimizations. 