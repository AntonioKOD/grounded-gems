# Foursquare API Setup Guide

This guide will help you set up the Foursquare Places API integration for Sacavia.

## Step 1: Get a Foursquare API Key

1. **Create a Foursquare Developer Account**:
   - Visit [Foursquare Developer Console](https://developer.foursquare.com/)
   - Sign in or create a new account

2. **Create a New Project**:
   - Go to "My Projects" in the developer console
   - Click "Create New Project"
   - Choose "Places API" as your product
   - Fill in your project details

3. **Get Your API Key**:
   - Once your project is created, you'll see your API key
   - Copy the API key (it should start with `fsq_`)

## Step 2: Configure Environment Variables

Add your Foursquare API key to your environment variables:

```bash
# In your .env.local file
FOURSQUARE_API_KEY=fsq_your_api_key_here
```

## Step 3: Test the Integration

1. **Test API Connectivity**:
   ```bash
   curl http://localhost:3000/api/foursquare/test
   ```
   
   You should see a response like:
   ```json
   {
     "success": true,
     "message": "Foursquare API is working correctly",
     "configured": true,
     "testResultsCount": 1,
     "sampleResult": "Starbucks"
   }
   ```

2. **Test Place Search**:
   ```bash
   curl "http://localhost:3000/api/foursquare/search?query=coffee&near=Boston,MA&limit=5"
   ```

## Step 4: Understanding the API

### Search Parameters

The Foursquare integration supports the following search parameters:

- `query` - Search term (e.g., "coffee", "pizza")
- `near` - Location (e.g., "Boston, MA", "New York, NY")
- `latitude` & `longitude` - Coordinates for location-based search
- `category` - Category filter (e.g., "RESTAURANT", "CAFE")
- `radius` - Search radius in meters (default: 1000)
- `limit` - Number of results (default: 50, max: 50)
- `sort` - Sort order: "DISTANCE", "POPULARITY", "RATING", "RELEVANCE"

### Category IDs

The integration includes predefined category constants:

```javascript
FOURSQUARE_CATEGORIES = {
  // Food & Drink
  RESTAURANT: '13065',
  CAFE: '13035',
  BAR: '13003',
  FAST_FOOD: '13145',
  
  // Arts & Entertainment  
  MUSEUM: '12026',
  THEATER: '12038',
  MOVIE_THEATER: '12017',
  
  // Outdoors & Recreation
  PARK: '16032',
  GYM: '18008',
  
  // Shopping
  SHOPPING_MALL: '17069',
  BOOKSTORE: '17014'
}
```

## Step 5: Using the Admin Interface

1. **Access the Foursquare Import Page**:
   - Go to `/admin/foursquare-import` in your app
   - You should see the Foursquare Places Import interface

2. **Search for Places**:
   - Use the "Search Places" tab to find places by query or location
   - Filter by category and adjust search radius as needed

3. **Discover Nearby Places**:
   - Use the "Discover Nearby" tab for location-based discovery
   - Allow location access or enter coordinates manually

4. **Import Places**:
   - Select places you want to import
   - Use the "Preview & Import" tab to review and import selected places
   - Check the "Import Results" tab for import status and any errors

## Troubleshooting

### Common Issues

1. **400 Bad Request Error**:
   - Check that your API key is valid and properly formatted
   - Ensure you're using the correct parameter names and values
   - Verify that location/coordinate parameters are properly formatted

2. **401 Unauthorized Error**:
   - Your API key is invalid or missing
   - Check that the `FOURSQUARE_API_KEY` environment variable is set correctly

3. **503 Service Unavailable**:
   - The Foursquare API configuration is missing
   - Restart your application after adding the API key

### Debug Information

The integration includes detailed logging. Check your server console for:
- API request URLs and parameters
- Full error responses from Foursquare API
- Import progress and results

### API Rate Limits

- Foursquare Places API has rate limits based on your plan
- Free tier typically includes several thousand requests per month
- Monitor your usage in the Foursquare Developer Console

## API Documentation

For detailed API documentation, visit:
- [Foursquare Places API Docs](https://docs.foursquare.com/developer/reference/place-search)
- [Foursquare Error Codes](https://docs.foursquare.com/developer/reference/errors)

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Test the API connectivity using `/api/foursquare/test`
3. Verify your API key in the Foursquare Developer Console
4. Check that all required environment variables are set 