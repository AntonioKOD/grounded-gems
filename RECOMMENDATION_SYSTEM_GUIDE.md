# 🎯 Smart Recommendation System Guide

## Overview

The Sacavia mobile app now features a sophisticated recommendation system that provides personalized location and content suggestions based on user preferences, behavioral data, and contextual factors. This system replaces the simple "show all locations" approach with intelligent, data-driven recommendations.

## 🚀 Key Features

### 1. **Multi-Factor Scoring Algorithm**
- **Category Matching** (30%): Matches user interests with location categories
- **Distance Scoring** (25%): Prioritizes locations within user's preferred radius
- **Popularity Scoring** (15%): Considers visit count, reviews, and engagement
- **Rating Scoring** (15%): Boosts highly-rated locations
- **Time Relevance** (10%): Considers current time and business hours
- **User Behavior** (5%): Learns from user interactions

### 2. **Contextual Intelligence**
- **Time-based Recommendations**: Shows breakfast places in the morning, dinner spots in the evening
- **Business Hours Awareness**: Prioritizes currently open locations
- **Seasonal Relevance**: Adapts to current season and weather
- **Location-based Suggestions**: Uses user's current location for proximity scoring

### 3. **Diversity & Discovery**
- **Category Diversity**: Prevents showing too many similar locations
- **Exploration Boost**: Occasionally suggests new categories to discover
- **Popularity Balance**: Mixes popular and hidden gems

## 📱 API Endpoints

### 1. **Enhanced Locations API**
```
GET /api/mobile/locations?type=recommended&limit=20
```

**Parameters:**
- `type`: `recommended` (default), `nearby`, `popular`, `saved`, `created`, `all`
- `limit`: Number of results (default: 20)
- `lat/lng`: User coordinates for distance calculation
- `radius`: Search radius in km (default: 25)

**Response includes:**
```json
{
  "success": true,
  "data": {
    "locations": [...],
    "meta": {
      "recommendationFactors": {
        "userPreferences": "applied",
        "timeRelevance": "applied",
        "diversity": "applied",
        "popularity": "applied"
      }
    }
  }
}
```

### 2. **Enhanced Feed API**
```
GET /api/mobile/feed/enhanced?type=recommended&limit=20
```

**Parameters:**
- `type`: `recommended` (default), `latest`, `popular`, `following`
- `limit`: Number of results (default: 20)

**Features:**
- Combines posts, locations, and events
- Applies same recommendation algorithm
- Maintains content diversity
- Time-based relevance scoring

### 3. **User Preferences API**
```
GET /api/mobile/users/preferences
PUT /api/mobile/users/preferences
POST /api/mobile/users/preferences
```

**GET**: Retrieve user preferences and available categories
**PUT**: Update user preferences
**POST**: Record user interactions for ML training

## 🧠 How the Algorithm Works

### 1. **Data Collection**
The system collects data from multiple sources:
- **User Preferences**: Categories, radius, interests
- **Interaction History**: Saves, likes, visits, skips
- **Location Data**: Categories, ratings, business hours, popularity
- **Contextual Data**: Time, location, season

### 2. **Scoring Process**
For each location, the system calculates:

```typescript
const totalScore = (
  categoryMatch * 0.3 +
  distanceScore * 0.25 +
  popularityScore * 0.15 +
  ratingScore * 0.15 +
  timeRelevance * 0.1 +
  userBehavior * 0.05
)
```

### 3. **Diversity Application**
After initial scoring, the system applies diversity factors:
- Reduces score for locations in over-represented categories
- Ensures mix of popular and niche locations
- Balances different content types

## 🎨 Implementation in iOS App

### 1. **Update LocationsMapTabView**
```swift
// Change the API call to use recommendations
let url = URL(string: "\(baseURL)/api/mobile/locations?type=recommended&limit=50")!
```

### 2. **Update LocalBuzzView**
```swift
// Use enhanced feed API
let url = URL(string: "\(baseURL)/api/mobile/feed/enhanced?type=recommended&limit=20")!
```

### 3. **Add Preference Management**
```swift
// Add preference management UI
struct PreferencesView: View {
    @State private var selectedCategories: [String] = []
    @State private var radius: Double = 25
    
    var body: some View {
        Form {
            Section("Interests") {
                // Category selection
            }
            Section("Location") {
                // Radius slider
            }
        }
    }
}
```

## 🔧 Configuration Options

### 1. **Scoring Weights**
You can adjust the scoring weights in the algorithm:

```typescript
// In getRecommendedLocations function
const totalScore = (
  categoryMatch * 0.3 +        // Increase for more category-focused
  distanceScore * 0.25 +       // Increase for more local focus
  popularityScore * 0.15 +     // Increase for more popular places
  ratingScore * 0.15 +         // Increase for higher-rated places
  timeRelevance * 0.1 +        // Increase for more time-sensitive
  userBehavior * 0.05          // Increase for more personalized
)
```

### 2. **Time Relevance Rules**
Customize time-based recommendations:

```typescript
// In getTimeRelevanceScore function
if (hour >= 6 && hour <= 11 && category.includes('coffee')) {
  return 1.1  // Boost coffee places in morning
}
```

### 3. **Diversity Settings**
Adjust diversity parameters:

```typescript
// In calculateDiversityScore function
return Math.max(0.5, 1.0 - (similarCount * 0.1))  // Adjust 0.1 for more/less diversity
```

## 📊 Analytics & Monitoring

### 1. **Recommendation Metrics**
Track recommendation performance:
- Click-through rates on recommended items
- User engagement with recommended content
- Diversity scores in recommendations
- User feedback on recommendations

### 2. **User Interaction Tracking**
Record user interactions for ML training:
```typescript
// POST to /api/mobile/users/preferences
{
  "action": "like",
  "itemId": "location_id",
  "itemType": "location",
  "category": "restaurant",
  "feedback": "positive"
}
```

## 🚀 Future Enhancements

### 1. **Machine Learning Integration**
- **Collaborative Filtering**: "Users like you also liked..."
- **Content-Based Filtering**: Enhanced category matching
- **Deep Learning**: Neural networks for complex pattern recognition

### 2. **Advanced Features**
- **Weather Integration**: Suggest indoor activities on rainy days
- **Event-Based Recommendations**: Suggest locations near events
- **Social Recommendations**: Friends' favorite places
- **Seasonal Adjustments**: Different recommendations per season

### 3. **A/B Testing Framework**
- Test different scoring weights
- Compare recommendation algorithms
- Measure user satisfaction
- Optimize for engagement metrics

## 🔍 Debugging & Testing

### 1. **Enable Debug Logging**
```typescript
// Add to recommendation functions
console.log('Recommendation factors:', {
  categoryMatch,
  distanceScore,
  popularityScore,
  ratingScore,
  timeRelevance,
  userBehavior,
  totalScore
})
```

### 2. **Test Different Scenarios**
- New users with no preferences
- Users with specific category interests
- Users in different locations
- Different times of day

### 3. **Monitor Performance**
- API response times
- Recommendation quality scores
- User engagement metrics
- System resource usage

## 📝 Best Practices

### 1. **User Experience**
- Always provide fallback recommendations for new users
- Show loading states during recommendation generation
- Allow users to refresh recommendations
- Provide feedback mechanisms for recommendations

### 2. **Performance**
- Cache recommendations for short periods
- Use pagination for large result sets
- Optimize database queries
- Consider CDN for static data

### 3. **Privacy**
- Respect user privacy settings
- Anonymize interaction data for ML training
- Allow users to opt out of tracking
- Comply with data protection regulations

## 🎯 Success Metrics

Track these metrics to measure recommendation success:

1. **Engagement Rate**: How often users interact with recommended content
2. **Discovery Rate**: How often users find new places through recommendations
3. **Retention Rate**: How recommendations affect user retention
4. **Satisfaction Score**: User feedback on recommendation quality
5. **Diversity Score**: Variety of content types and categories shown

## 🔄 Continuous Improvement

1. **Regular Algorithm Updates**: Adjust weights based on performance data
2. **User Feedback Integration**: Incorporate user suggestions
3. **A/B Testing**: Test new features and algorithms
4. **Performance Monitoring**: Track and optimize system performance
5. **Data Quality**: Ensure accurate and up-to-date location data

---

This recommendation system transforms the Sacavia app from a simple location directory into an intelligent, personalized discovery platform that learns from user behavior and provides increasingly relevant suggestions over time. 