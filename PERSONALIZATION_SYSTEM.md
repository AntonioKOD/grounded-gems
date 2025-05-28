# Personalization System: Connecting Signup Preferences to Location Discovery

## Overview

This system connects user preferences collected during the enhanced signup flow to personalized location recommendations throughout the app, particularly on the Explorer page. It follows **Zipf's Law principles** to prioritize the most important preferences while providing a sophisticated scoring algorithm.

## 🏗️ System Architecture

### 1. Data Collection (Signup Flow)
The simplified signup form collects only essential user preferences:

#### **Step 1: Essential Entry**
- Email, password, name
- Username
- Location (coordinates)

#### **Step 2: Interest Categories**
- Core interests selection from predefined categories:
  - Coffee Shops
  - Restaurants  
  - Nature & Parks
  - Photography Spots
  - Nightlife
  - Shopping
  - Arts & Culture
  - Sports & Recreation
  - Markets & Local Business
  - Events & Entertainment

#### **Step 3: Basic Preferences**
- Primary use case (explore, plan, share, connect)
- Travel radius (0.5mi - unlimited)
- Budget preference (free - luxury)

### 2. Data Storage (Users Collection)
User preferences are stored in the `onboardingData` field and `interests` array of the Users collection:

```typescript
interface OnboardingData {
  primaryUseCase: 'explore' | 'plan' | 'share' | 'connect'
  travelRadius: '0.5' | '2' | '5' | '15' | 'unlimited'
  budgetPreference: 'free' | 'budget' | 'moderate' | 'premium' | 'luxury'
  onboardingCompleted: boolean
  signupStep: number // 1-3
}

interface UserPreferences {
  interests: string[] // Stored in separate interests field
  primaryUseCase: string
  travelRadius: string
  budgetPreference: string
  location?: { coordinates: { latitude: number; longitude: number } }
}
```

## 🧠 Personalization Algorithm

### Core Scoring Formula
Each location receives a personalized score based on weighted factors:

```
PersonalizedScore = (PopularityScore × 0.3) + 
                   (InterestMatchScore × 0.4) + 
                   (DistanceScore × 0.15) + 
                   (BudgetScore × 0.1) + 
                   (TimeScore × 0.05) + 
                   UseCaseBonus
```

### 1. **Popularity Score (30% weight)**
Following Zipf's Law, popular locations get higher base scores:
- Likes × 1.0
- Reviews × 3.0 (more valuable)
- Saves × 2.0
- Visits × 0.5
- Verification bonus: +20
- Featured bonus: +30

### 2. **Interest Match Score (40% weight - highest priority)**
Maps user interests to location categories:

```typescript
const interestMapping = {
  coffee: ['cafe', 'coffee shop', 'bakery'],
  restaurants: ['restaurant', 'dining', 'food'],
  nature: ['park', 'garden', 'nature', 'outdoor'],
  photography: ['scenic', 'viewpoint', 'landmark', 'art'],
  nightlife: ['bar', 'club', 'nightlife', 'entertainment'],
  shopping: ['shop', 'market', 'retail', 'boutique']
}
```

### 3. **Distance Score (15% weight)**
Based on user's travel radius preference:
- Within radius: `100 - (distance/maxDistance) × 100`
- Outside radius: Score × 0.3 (heavily penalized)

### 4. **Budget Compatibility (10% weight)**
- Perfect match: 100 points
- One level off: 70 points  
- Two+ levels off: 20 points

### 5. **Primary Use Case Bonus**
Additional scoring based on how user wants to use the app:
- **Explore**: +15 for hidden gems, unique features
- **Plan**: +10 for places with good planning info (hours, contact)
- **Share**: +12 for photogenic/Instagram-worthy locations
- **Connect**: +10 for social venues (bars, cafes, restaurants)

### Simplified Scoring
Since we removed some complex preferences, the algorithm focuses on:
- **Interest matching (40%)**: Most important factor
- **Location popularity (30%)**: Proven quality indicator
- **Distance relevance (15%)**: Based on travel radius
- **Budget compatibility (10%)**: Price range matching
- **Use case bonus (5%)**: Activity-specific recommendations

## 🔄 Implementation Flow

### 1. User Completes Signup
```typescript
// During signup, preferences are saved to user.onboardingData
const userData = {
  // ... basic fields
  interests: ['coffee', 'nature', 'photography'],
  onboardingData: {
    primaryUseCase: 'explore',
    budgetPreference: 'moderate',
    travelRadius: '5',
    onboardingCompleted: true
  }
}
```

### 2. Explorer Page Loads Personalized Results
```typescript
// 1. Get user preferences
const preferences = await getUserPreferences(userId)

// 2. Fetch relevant locations based on interests/budget
const locations = await fetchRelevantLocations(preferences)

// 3. Score each location using the algorithm
const scoredLocations = await scoreLocations(locations, preferences)

// 4. Return top-scored results
return scoredLocations.sort((a, b) => b.personalizedScore - a.personalizedScore)
```

### 3. Results Include Match Reasons
Each location includes `matchReasons` explaining why it was recommended:
- "Matches your interests: Coffee & Cafes, Nature & Parks"
- "Matches your moderate budget preference"
- "Perfect for exploration"
- "Very close to you"

## 📱 User Interface Integration

### 1. **Explorer Page**
- **Personalized tab**: Default for users with completed onboarding
- **Filter integration**: Respects user preferences as defaults
- **Match indicators**: Shows "Perfect Match" badges for high-scoring locations
- **Explanation cards**: Shows why each location was recommended

### 2. **Preferences Banner Component**
Reusable component that shows:
- Current preferences summary
- Encouragement to complete setup (if incomplete)
- Quick edit access
- Visual preference indicators

### 3. **Progressive Enhancement**
- **No preferences**: Shows general recommendations
- **Partial preferences**: Uses available data with neutral scoring for missing data
- **Complete preferences**: Full personalization algorithm

## 🎯 Benefits & Features

### For Users:
1. **Immediate Value**: Recommendations improve right after signup
2. **Continuous Learning**: Algorithm adapts as more data is collected
3. **Transparency**: Clear explanations for why locations are recommended
4. **Control**: Easy to modify preferences as needs change

### For Business:
1. **Higher Engagement**: Personalized results = more location visits
2. **Better Retention**: Users find value quickly
3. **Data Insights**: Understanding user preference patterns
4. **Conversion**: Better matching = more interactions/saves

## 🔧 Technical Components

### Files Created/Modified:

1. **`lib/features/locations/personalization-service.ts`**
   - Core personalization logic
   - Scoring algorithms
   - Location filtering and ranking

2. **`app/actions.ts`** (additions)
   - `getPersonalizedLocations()`
   - `getFilteredLocationsAction()`  
   - `getUserPersonalizationData()`

3. **`app/(frontend)/explorer/page.tsx`**
   - Enhanced explorer page with personalization
   - Smart filtering based on preferences
   - Preference-aware UI

4. **`components/personalization/preferences-banner.tsx`**
   - Reusable preferences display component
   - Onboarding encouragement
   - Quick edit access

5. **`collections/Users.ts`** (enhanced)
   - Extended onboarding data fields
   - Progressive signup support
   - Interest and preference tracking

## 🚀 Usage Examples

### Basic Usage (Explorer Page):
```typescript
// Load personalized locations for user
const locations = await getPersonalizedLocations(userId, 20, 0)

// Each location includes:
// - personalizedScore: 0-100+ scoring
// - matchReasons: ["Matches your interests: Coffee", "Nearby location"]
// - distance, rating, categories, etc.
```

### With Filters:
```typescript
// Apply filters while maintaining personalization
const filteredLocations = await getFilteredLocationsAction(userId, {
  category: 'cafe',
  priceRange: 'moderate', 
  radius: 5,
  isOpen: true,
  rating: 4
}, 20, 0)
```

### Preference Display:
```tsx
// Show user's current preferences
const personalizationData = await getUserPersonalizationData(userId)

<PreferencesBanner 
  userPersonalization={personalizationData}
  showFullDetails={true}
/>
```

## 🎨 Design Principles

### 1. **Zipf's Law Application**
- Most important preferences (interests) get highest weight (40%)
- Popular/proven locations get base score advantage
- Progressive disclosure in signup mirrors usage patterns

### 2. **Progressive Enhancement**
- Works with minimal data
- Improves as more preferences are added
- Graceful degradation for new users

### 3. **Transparent Algorithm**
- Users understand why locations are recommended
- Match reasons build trust
- Clear preference management

### 4. **Performance Optimized**
- Efficient database queries
- Smart caching of user preferences
- Minimal API calls for real-time filtering

This personalization system creates a highly engaging, user-centric experience that connects signup preferences directly to location discovery, driving higher user satisfaction and platform engagement. 