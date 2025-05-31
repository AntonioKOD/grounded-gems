# AI Planner Real Location Data Enhancements

## Overview
Enhanced the AI planner system to work with real location data from the production database, providing users with specific, actionable hangout plans using verified locations within 20 miles of their location.

## Key Features Added

### 1. Real Location Data Integration
- **Smart Location Fetching**: Fetches nearby verified locations within 20 miles using Haversine distance calculation
- **Location Filtering**: Only considers published locations with valid coordinates
- **Context-Aware Selection**: Intelligently selects the best locations based on hangout type and user preferences

### 2. Enhanced AI Prompting
- **Rich Location Context**: Provides AI with detailed information about nearby venues including:
  - Business hours (current day status)
  - Price ranges
  - Ratings and review counts
  - Contact information and websites
  - Insider tips
  - Verification status
- **Smart Scoring Algorithm**: Ranks locations based on:
  - Context relevance (date, group, family, solo, etc.)
  - User interests matching
  - Rating quality and verification status
  - Proximity (closer locations get higher scores)

### 3. User Experience Improvements
- **Location-Enhanced Plans**: Plans clearly indicate when they use real verified locations
- **Detailed Metadata**: Shows users:
  - Number of nearby locations found
  - User's detected location
  - Whether real locations were used
  - Specific location references
- **Better Success Messaging**: Different toast messages based on location data availability

### 4. Journey Data Enhancement
- **Comprehensive Tracking**: Journeys now store:
  - User coordinates used for planning
  - Number of nearby locations found
  - Whether real locations were used
  - Referenced location IDs
  - AI metadata (model, generation time, location context)

## API Endpoints Enhanced

### `/api/ai-planner` (New Location: `app/api/ai-planner/route.ts`)
- **Moved from frontend group** to proper API location
- **Enhanced location fetching** with better error handling
- **Improved AI prompting** with structured location data
- **User preference integration** from profile data

### `/api/journeys/[id]`
- **Added depth: 2** to populate referenced locations
- **Better error handling** for location data

## Database Schema Utilization

### Locations Collection
- **Coordinates**: `latitude` and `longitude` for distance calculations
- **Business Hours**: Current day open/closed status
- **Categories**: For context matching
- **Ratings**: `averageRating` and `reviewCount`
- **Contact Info**: Phone and website for AI recommendations
- **Status**: Only `published` locations are considered
- **Verification**: `isVerified` status for quality scoring

### Journeys Collection
- **coordinates**: User location during plan generation
- **usedRealLocations**: Boolean flag for real location usage
- **referencedLocations**: Array of location IDs used in the plan
- **aiMetadata**: Structured metadata about the AI planning session

## User Interface Enhancements

### Planner Page (`app/(frontend)/planner/page.tsx`)
- **Enhanced success messages** with location-specific feedback
- **Location metadata display** showing nearby locations found
- **Real location usage indicators**

### Journey Details (`app/(frontend)/events/journey/[planId]/page.tsx`)
- **Location enhancement badges** showing real location usage
- **Plan context display** with AI metadata
- **Enhanced step headers** with verification indicators

### Saved Journeys (`components/event/SavedGemJourneysClient.tsx`)
- **Real location badges** on journey cards
- **Enhanced location information** display
- **Better visual hierarchy** for location-enhanced plans

## Distance and Location Logic

### Haversine Distance Calculation
- **20-mile radius** for nearby location search
- **Efficient filtering** before detailed processing
- **Miles-based calculation** for US users

### Location Selection Algorithm
```typescript
// Context keywords for different hangout types
const contextMap = {
  'date': ['romantic', 'dinner', 'restaurant', 'cafe', 'wine', 'intimate', 'cozy', 'view'],
  'group': ['bar', 'restaurant', 'activity', 'entertainment', 'game', 'music', 'social'],
  'family': ['family', 'kid', 'child', 'park', 'museum', 'outdoor', 'activity', 'fun'],
  'solo': ['cafe', 'book', 'quiet', 'park', 'museum', 'walk', 'peaceful', 'solo'],
  'friend_group': ['bar', 'game', 'activity', 'social', 'fun', 'entertainment', 'food']
}

// Scoring system (higher = better)
// +3 points: Context keyword match
// +2 points: User interest match  
// +2 points: Verified location
// +1 point: High rating (4.0+)
// +1 point: Featured location
// -0.1 * distance: Distance penalty
```

## Production Benefits

### For Users
- **Specific, actionable plans** with real venues and addresses
- **Local insider knowledge** from verified location data
- **Time-aware recommendations** based on business hours
- **Quality assurance** through verified and rated locations

### For the Platform
- **Higher engagement** with location-enhanced plans
- **Data-driven recommendations** using existing location database
- **Improved user retention** through better plan quality
- **Location discovery** driving traffic to verified venues

## Future Enhancements
- **Real-time availability** integration
- **User location history** for better personalization
- **Seasonal recommendations** based on location attributes
- **Integration with events** happening at recommended locations
- **Social proof** from user check-ins and reviews 