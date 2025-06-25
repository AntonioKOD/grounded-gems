# Challenges System Design

## Overview

The challenges system is designed to gamify exploration and community engagement by providing weekly challenges that users can join, complete, and vote on for future weeks.

## How Challenges Work

### 1. Weekly Challenges Display

**Location**: Feed → Weekly Tab
- Shows 2 active weekly challenges
- Shows 4 voting options for next week
- Full-page experience within the feed

### 2. Challenge Types

#### Current Weekly Challenges
- **Active for 7 days** (Monday to Sunday)
- **2 challenges per week** displayed to all users
- **Join functionality** - users can join challenges
- **Progress tracking** - users can mark completion
- **Rewards** - points, badges, or recognition

#### Voting System
- **4 options** for next week's challenges
- **One vote per user** per suggestion
- **Community-driven** - top voted challenges become next week's challenges
- **Voting period** - typically ends Sunday night

### 3. Challenge Categories

#### Exploration Challenges
- **Urban Explorer**: Visit 5 different neighborhoods
- **Hidden Gems Hunter**: Find 3 low-review spots
- **Coffee Shop Crawl**: Visit 5 coffee shops
- **Local Market Explorer**: Visit 2 farmers markets

#### Photography Challenges
- **Sunrise Photography**: Capture 3 sunrise photos
- **Street Art Hunter**: Find 5 street art pieces
- **Architecture Walk**: Photograph 10 buildings

#### Social Challenges
- **Meet New People**: Connect with 3 new users
- **Group Adventure**: Organize a meetup
- **Community Helper**: Help 5 other users

#### Seasonal Challenges
- **Holiday Spirit**: Visit 3 holiday-themed locations
- **Summer Explorer**: Visit 5 outdoor spots
- **Winter Wonderland**: Find cozy indoor spots

### 4. Challenge Structure

```typescript
interface Challenge {
  id: string
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  category: string
  tags: string[]
  reward: string // e.g., "50 points", "Explorer Badge"
  participants: number
  isWeekly: boolean
  weekNumber: number
  expiresAt: string
  status: 'active' | 'completed' | 'expired'
  requirements: {
    minLocations?: number
    minPhotos?: number
    minReviews?: number
    specificCategories?: string[]
  }
  createdAt: string
  updatedAt: string
}
```

### 5. User Interaction Flow

#### Joining a Challenge
1. User sees challenge in Weekly tab
2. Clicks "Join Challenge" button
3. Challenge added to user's active challenges
4. User can track progress

#### Completing a Challenge
1. User visits required locations
2. Takes photos or writes reviews
3. Marks challenge as complete
4. Receives rewards (points, badges)

#### Voting on Suggestions
1. User sees 4 voting options
2. Clicks vote button on preferred challenge
3. Vote is recorded
4. Can change vote until voting period ends

### 6. Challenge Display Components

#### ChallengeCard Component
```tsx
interface ChallengeCardProps {
  challenge: Challenge
  onJoin: (challengeId: string) => void
  onComplete: (challengeId: string) => void
  isJoined: boolean
  isCompleted: boolean
  progress?: number // 0-100
}
```

#### ChallengeSuggestionCard Component
```tsx
interface ChallengeSuggestionCardProps {
  suggestion: ChallengeSuggestion
  onVote: (suggestionId: string) => void
  hasVoted: boolean
  canVote: boolean
}
```

### 7. Database Collections

#### Challenges Collection
- Stores active and completed challenges
- Tracks challenge metadata and requirements
- Links to participants and completions

#### ChallengeSuggestions Collection
- Stores user-submitted challenge ideas
- Tracks votes and community feedback
- Used to select next week's challenges

#### ChallengeVotes Collection
- Tracks user votes on suggestions
- Prevents duplicate voting
- Used for vote counting

#### UserChallenges Collection (Future)
- Tracks user participation in challenges
- Stores progress and completion status
- Links users to their joined challenges

### 8. API Endpoints

#### GET /api/challenges/weekly
- Returns current weekly challenges
- Returns voting options
- Includes user interaction states

#### POST /api/challenges/join
- Allows users to join challenges
- Updates user's active challenges

#### POST /api/challenges/complete
- Marks challenge as completed
- Awards points/badges
- Updates user progress

#### POST /api/challenges/vote
- Records user vote on suggestion
- Updates vote count
- Prevents duplicate voting

#### POST /api/challenges/suggest
- Allows users to submit new challenge ideas
- Goes through moderation process

### 9. Challenge Selection Process

#### Weekly Challenge Selection
1. **Voting Period**: Users vote on 4 suggestions (Mon-Sun)
2. **Selection**: Top 2 voted challenges become next week's challenges
3. **Announcement**: New challenges announced Monday morning
4. **Active Period**: Challenges run for 7 days

#### Challenge Moderation
- All user suggestions go through moderation
- Approved suggestions enter voting pool
- Inappropriate content is filtered out
- Quality standards maintained

### 10. Rewards System

#### Points System
- **Easy Challenges**: 25-50 points
- **Medium Challenges**: 50-75 points
- **Hard Challenges**: 75-100 points
- **Bonus Points**: Early completion, quality submissions

#### Badges System
- **Explorer Badge**: Complete 5 challenges
- **Photographer Badge**: Complete 3 photo challenges
- **Social Butterfly**: Complete 3 social challenges
- **Seasonal Badges**: Complete seasonal challenges

#### Leaderboards
- **Weekly Leaderboard**: Points earned this week
- **Monthly Leaderboard**: Total points for month
- **All-Time Leaderboard**: Lifetime achievement

### 11. Future Enhancements

#### Team Challenges
- Group challenges for multiple users
- Collaborative exploration goals
- Team leaderboards

#### Location-Based Challenges
- Challenges specific to user's city
- Travel challenges for visitors
- Local business partnerships

#### AI-Generated Challenges
- Personalized challenges based on user interests
- Dynamic difficulty adjustment
- Smart challenge recommendations

#### Challenge Marketplace
- Premium challenges with better rewards
- Sponsored challenges from businesses
- Custom challenge creation tools

## Implementation Status

### ✅ Completed
- Basic challenge structure
- Weekly challenges API
- Voting system
- Challenge display components
- Database collections

### 🔄 In Progress
- User join/complete functionality
- Progress tracking
- Rewards system

### 📋 Planned
- Challenge moderation
- Team challenges
- Location-based challenges
- AI recommendations
- Premium challenges

## Testing the System

### Current State
- Challenges API returns real data from database
- No fallback data (empty arrays when no data exists)
- User interaction states properly tracked
- Voting system functional

### Next Steps
1. Create sample challenges in database
2. Test join/complete functionality
3. Implement progress tracking
4. Add rewards system
5. Create challenge moderation tools 