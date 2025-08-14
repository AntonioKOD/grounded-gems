# 🚀 N8N Workflow Guide for Sacavia Specials Integration

This guide will help you set up N8N workflows to automatically send specials data to your Sacavia platform.

## 📋 Prerequisites

1. **N8N Instance** - Self-hosted or cloud version
2. **Sacavia Business Owner Account** - Approved business owner with API key
3. **Location ID** - The location ID from your Sacavia dashboard
4. **API Key** - Your business API key from Sacavia

## 🔑 Getting Your Credentials

### 1. Business Owner Application
First, apply to become a business owner:
```bash
POST https://your-sacavia-domain.com/api/business-owner/apply
{
  "businessName": "Your Restaurant Name",
  "businessType": "restaurant",
  "contactEmail": "your@email.com",
  "businessDescription": "Description of your business"
}
```

### 2. Claim Your Location
Once approved, claim your location:
```bash
POST https://your-sacavia-domain.com/api/locations/[LOCATION_ID]/claim
{
  "claimMethod": "document",
  "businessLicense": "YOUR_LICENSE_NUMBER",
  "contactEmail": "your@email.com"
}
```

### 3. Get Your API Key
After approval, your API key will be generated automatically. You can find it in your business owner dashboard or contact support.

## 🔧 N8N Workflow Setup

### Workflow 1: Daily Specials Update

**Trigger**: Cron (Daily at 9 AM)
**Purpose**: Send daily specials to Sacavia

#### Step 1: Cron Trigger
```json
{
  "name": "Daily Specials Trigger",
  "type": "n8n-nodes-base.cron",
  "parameters": {
    "rule": {
      "hour": 9,
      "minute": 0
    }
  }
}
```

#### Step 2: Get Specials Data
Add a **Code** node to prepare your specials data:
```javascript
// Example: Get specials from your POS system or database
const specials = [
  {
    title: "Happy Hour Special",
    description: "50% off all drinks from 4-7pm",
    shortDescription: "Half-price drinks during happy hour",
    specialType: "discount",
    discountValue: {
      amount: 50,
      type: "percentage"
    },
    startDate: "2024-01-15T16:00:00Z",
    endDate: "2024-01-15T19:00:00Z",
    daysAvailable: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    timeRestrictions: {
      startTime: "16:00",
      endTime: "19:00"
    },
    termsAndConditions: "Valid only during happy hour. Cannot be combined with other offers.",
    restrictions: ["Valid only during happy hour", "Cannot be combined with other offers"]
  },
  {
    title: "Weekend Brunch",
    description: "Bottomless mimosas with any entree purchase",
    shortDescription: "Unlimited mimosas with brunch",
    specialType: "bundle",
    startDate: "2024-01-20T10:00:00Z",
    endDate: "2024-01-21T15:00:00Z",
    daysAvailable: ["Saturday", "Sunday"],
    timeRestrictions: {
      startTime: "10:00",
      endTime: "15:00"
    },
    termsAndConditions: "Must purchase an entree to qualify for bottomless mimosas.",
    restrictions: ["Must purchase entree", "Weekends only"]
  }
];

return [{ json: { specials } }];
```

#### Step 3: HTTP Request to Sacavia
Add an **HTTP Request** node:
```json
{
  "name": "Send to Sacavia",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://your-sacavia-domain.com/api/external/specials/webhook",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "businessId": "{{ $('Get Specials Data').item.json.locationId }}",
      "apiKey": "{{ $('Get Specials Data').item.json.apiKey }}",
      "specials": "{{ $('Get Specials Data').item.json.specials }}"
    }
  }
}
```

### Workflow 2: Inventory-Based Flash Sales

**Trigger**: Webhook from your inventory system
**Purpose**: Create flash sales when inventory is low

#### Step 1: Webhook Trigger
```json
{
  "name": "Inventory Alert",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "httpMethod": "POST",
    "path": "inventory-alert"
  }
}
```

#### Step 2: Process Inventory Data
Add a **Code** node:
```javascript
const inventoryData = $input.first().json;

// Check if inventory is low
if (inventoryData.quantity < inventoryData.minThreshold) {
  const special = {
    title: `Flash Sale: ${inventoryData.itemName}`,
    description: `Limited time offer on ${inventoryData.itemName} - only ${inventoryData.quantity} left!`,
    shortDescription: `Flash sale on ${inventoryData.itemName}`,
    specialType: "discount",
    discountValue: {
      amount: 25,
      type: "percentage"
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    termsAndConditions: "Limited quantity available. First come, first served.",
    restrictions: ["Limited quantity", "While supplies last"]
  };
  
  return [{ json: { special, locationId: inventoryData.locationId, apiKey: inventoryData.apiKey } }];
} else {
  return [{ json: { skip: true } }];
}
```

#### Step 3: Conditional Send
Add an **IF** node to only send when there's a special:
```json
{
  "name": "Check if Special",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "{{ $json.skip }}",
          "operation": "notEqual",
          "value2": true
        }
      ]
    }
  }
}
```

#### Step 4: Send to Sacavia
Same HTTP Request node as above.

### Workflow 3: Weather-Based Specials

**Trigger**: Weather API (daily check)
**Purpose**: Create specials based on weather conditions

#### Step 1: Cron Trigger
```json
{
  "name": "Weather Check",
  "type": "n8n-nodes-base.cron",
  "parameters": {
    "rule": {
      "hour": 8,
      "minute": 0
    }
  }
}
```

#### Step 2: Get Weather Data
Add an **HTTP Request** node to weather API:
```json
{
  "name": "Get Weather",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=YOUR_CITY",
    "method": "GET"
  }
}
```

#### Step 3: Process Weather Data
Add a **Code** node:
```javascript
const weather = $input.first().json.current;

let special = null;

if (weather.condition.text.toLowerCase().includes('rain')) {
  special = {
    title: "Rainy Day Comfort Food",
    description: "Stay dry and warm with our comfort food specials",
    shortDescription: "Comfort food for rainy days",
    specialType: "discount",
    discountValue: {
      amount: 15,
      type: "percentage"
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    termsAndConditions: "Valid on comfort food items only.",
    restrictions: ["Comfort food items only", "Valid today only"]
  };
} else if (weather.temp_c > 30) {
  special = {
    title: "Beat the Heat",
    description: "Cool down with our refreshing drink specials",
    shortDescription: "Refreshing drinks for hot days",
    specialType: "discount",
    discountValue: {
      amount: 20,
      type: "percentage"
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    termsAndConditions: "Valid on cold drinks only.",
    restrictions: ["Cold drinks only", "Valid today only"]
  };
}

return [{ json: { special, locationId: "YOUR_LOCATION_ID", apiKey: "YOUR_API_KEY" } }];
```

### Workflow 4: Customer Behavior Specials

**Trigger**: Customer database event
**Purpose**: Personalized specials based on customer behavior

#### Step 1: Webhook Trigger
```json
{
  "name": "Customer Event",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "httpMethod": "POST",
    "path": "customer-event"
  }
}
```

#### Step 2: Analyze Customer Data
Add a **Code** node:
```javascript
const customerData = $input.first().json;

let special = null;

// Birthday special
if (customerData.eventType === 'birthday') {
  special = {
    title: `Happy Birthday ${customerData.name}!`,
    description: "Celebrate your special day with a free dessert on us!",
    shortDescription: "Free dessert for your birthday",
    specialType: "other",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    termsAndConditions: "Valid with any purchase. Must show ID.",
    restrictions: ["With purchase", "Show ID required", "Valid for 7 days"]
  };
}

// Loyalty special
if (customerData.eventType === 'loyalty_milestone') {
  special = {
    title: `Congratulations! You've earned ${customerData.points} points`,
    description: `Redeem your ${customerData.points} loyalty points for special rewards`,
    shortDescription: "Loyalty points redemption special",
    specialType: "other",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    termsAndConditions: "Points must be redeemed in full. Cannot be combined with other offers.",
    restrictions: ["Full redemption required", "Cannot combine offers", "Valid for 30 days"]
  };
}

return [{ json: { special, locationId: customerData.locationId, apiKey: customerData.apiKey } }];
```

## 📊 Response Handling

### Success Response
```json
{
  "success": true,
  "message": "Processed 2 specials",
  "data": {
    "processed": 2,
    "created": 2,
    "errors": []
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Invalid API key",
  "error": "Authentication failed"
}
```

## 🔧 Configuration Variables

Set these in your N8N environment variables:

```bash
SACAVIA_API_KEY=your_api_key_here
SACAVIA_LOCATION_ID=your_location_id_here
SACAVIA_BASE_URL=https://your-sacavia-domain.com
WEATHER_API_KEY=your_weather_api_key
```

## 📝 Special Data Schema

### Required Fields
- `title` (string) - Special title
- `description` (string) - Full description
- `startDate` (string) - ISO 8601 date format

### Optional Fields
- `shortDescription` (string) - Brief description
- `specialType` (string) - "discount", "happy_hour", "bundle", "other"
- `discountValue` (object) - `{ amount: number, type: "percentage" | "fixed" }`
- `endDate` (string) - ISO 8601 date format
- `isOngoing` (boolean) - No end date
- `daysAvailable` (array) - ["Monday", "Tuesday", etc.]
- `timeRestrictions` (object) - `{ startTime: "16:00", endTime: "19:00" }`
- `termsAndConditions` (string) - Terms and conditions
- `restrictions` (array) - Array of restriction strings

## 🚨 Error Handling

### Common Errors
1. **401 Unauthorized** - Invalid API key
2. **403 Forbidden** - Location not owned or specials not allowed
3. **404 Not Found** - Location not found
4. **400 Bad Request** - Missing required fields

### Retry Logic
Add retry nodes for failed requests:
```json
{
  "name": "Retry on Failure",
  "type": "n8n-nodes-base.retry",
  "parameters": {
    "maxTries": 3,
    "waitBetweenTries": 5000
  }
}
```

## 📱 Testing Your Workflow

### Test Endpoint
```bash
GET https://your-sacavia-domain.com/api/external/specials/webhook
```

### Test Data
```json
{
  "businessId": "your_location_id",
  "apiKey": "your_api_key",
  "specials": [
    {
      "title": "Test Special",
      "description": "This is a test special",
      "startDate": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## 🔄 Workflow Export

You can export your N8N workflows as JSON files and import them into other N8N instances. Each workflow should include:

1. **Trigger node** (Cron, Webhook, etc.)
2. **Data processing nodes** (Code, HTTP Request, etc.)
3. **Conditional logic** (IF, Switch, etc.)
4. **HTTP Request to Sacavia**
5. **Error handling** (Retry, Error Trigger, etc.)

## 📞 Support

If you encounter issues:
1. Check the N8N execution logs
2. Verify your API key and location ID
3. Ensure your business owner account is approved
4. Contact Sacavia support with error details

---

**Happy automating! 🎉**

Your N8N workflows will now automatically send specials to your Sacavia platform, keeping your customers engaged with timely, relevant offers.
