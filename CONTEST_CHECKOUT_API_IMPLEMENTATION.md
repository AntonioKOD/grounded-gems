# Contest Checkout API Implementation

## Overview
Successfully created the Next.js App Router endpoint for Stripe Checkout to enter experiences into contests.

## Endpoint Details

### Route
- **File**: `/app/api/contest/checkout/route.ts`
- **Method**: POST
- **Purpose**: Create Stripe Checkout Session for contest entry

### Request Body
```typescript
{
  experienceId: string;  // Required: ID of the experience to enter
  attested18: boolean;   // Required: Age verification (must be true)
}
```

### Response
```typescript
{
  success: boolean;
  url?: string;          // Stripe checkout URL on success
  error?: string;        // Error message on failure
  code?: string;         // Error code for debugging
}
```

## Authentication & Authorization

### ✅ **Authentication Required**
- Uses PayloadCMS server API with `req.user`
- Extracts authentication from request headers
- Returns 401 for unauthenticated requests

### 🔐 **Authorization Guards**
1. **User Ownership**: Experience must belong to the authenticated user
2. **Experience Status**: Must be PUBLISHED
3. **Contest Eligibility**: Must not already be contestEligible
4. **Age Verification**: attested18 must be true

## Validation & Security

### **Input Validation**
- **Zod Schema**: Validates request body structure
- **Experience ID**: Must be non-empty string
- **Age Gate**: attested18 must be true

### **Business Logic Validation**
- **Experience Exists**: Fetches and validates experience from database
- **Ownership Check**: Verifies user owns the experience
- **Status Check**: Ensures experience is published
- **Contest Status**: Prevents duplicate contest entries

### **Error Handling**
- **400**: Invalid request data, age verification failed, already contest eligible
- **401**: Authentication required
- **403**: User doesn't own experience
- **404**: Experience not found
- **500**: Internal server error, Stripe errors
- **503**: Stripe not configured

## Stripe Integration

### **Checkout Session Configuration**
```typescript
{
  mode: 'payment',
  line_items: [{ price: process.env.STRIPE_PRICE_ID_CONTEST, quantity: 1 }],
  success_url: `${APP_URL}/experience/${experienceId}?entered=1`,
  cancel_url: `${APP_URL}/experience/${experienceId}?canceled=1`,
  metadata: { experienceId, userId, type: 'contest_entry' },
  customer_email: currentUser.email,
  allow_promotion_codes: true,
  billing_address_collection: 'auto',
  payment_method_types: ['card'],
  submit_type: 'pay',
  locale: 'auto'
}
```

### **Environment Variables Required**
- `STRIPE_SECRET_KEY`: Stripe secret key for API access
- `STRIPE_PRICE_ID_CONTEST`: Stripe price ID for contest entry fee
- `NEXT_PUBLIC_APP_URL` or `APP_URL`: App URL for redirects

### **Redirect URLs**
- **Success**: `/experience/{experienceId}?entered=1`
- **Cancel**: `/experience/{experienceId}?canceled=1`

## API Features

### **POST /api/contest/checkout**
- Main endpoint for creating checkout sessions
- Full validation and authentication
- Returns Stripe checkout URL

### **GET /api/contest/checkout**
- Health check endpoint
- Returns configuration status
- Useful for monitoring and debugging

## Usage Examples

### **Frontend Integration**
```typescript
const enterContest = async (experienceId: string) => {
  try {
    const response = await fetch('/api/contest/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        experienceId,
        attested18: true,
      }),
    });

    const data = await response.json();
    
    if (data.success && data.url) {
      // Redirect to Stripe checkout
      window.location.href = data.url;
    } else {
      console.error('Checkout failed:', data.error);
    }
  } catch (error) {
    console.error('API error:', error);
  }
};
```

### **Error Handling**
```typescript
if (response.status === 401) {
  // Redirect to login
  window.location.href = '/login';
} else if (response.status === 403) {
  // Show ownership error
  alert('You can only enter your own experiences into contests');
} else if (response.status === 400) {
  // Show validation error
  alert(data.error);
}
```

## Security Features

### **Authentication**
- JWT token validation via PayloadCMS
- Secure user identification

### **Authorization**
- Strict ownership verification
- Business rule enforcement
- Age verification requirement

### **Input Validation**
- Schema-based validation
- Type safety with TypeScript
- Sanitized inputs

### **Error Handling**
- Secure error messages
- No sensitive data exposure
- Proper HTTP status codes

## Monitoring & Logging

### **Success Logs**
- User authentication
- Experience validation
- Stripe session creation

### **Error Logs**
- Authentication failures
- Validation errors
- Stripe API errors
- Business rule violations

### **Audit Trail**
- All requests logged with user context
- Experience ID tracking
- Payment session correlation

## Testing

### **Manual Testing**
1. **Authentication Test**: Verify 401 for unauthenticated requests
2. **Ownership Test**: Verify 403 for non-owner requests
3. **Validation Test**: Verify 400 for invalid data
4. **Success Test**: Verify Stripe URL generation
5. **Error Test**: Verify proper error handling

### **Integration Testing**
1. **PayloadCMS Integration**: Verify user authentication
2. **Stripe Integration**: Verify session creation
3. **Database Integration**: Verify experience validation
4. **Redirect Testing**: Verify success/cancel URLs

## Next Steps

### **Immediate**
1. **Environment Setup**: Configure `STRIPE_PRICE_ID_CONTEST`
2. **Testing**: Test endpoint with real Stripe account
3. **Frontend Integration**: Implement checkout flow in UI

### **Future Enhancements**
1. **Webhook Integration**: Handle successful payments
2. **Contest Status Update**: Mark experience as contest eligible
3. **Payment Analytics**: Track contest entry metrics
4. **Refund Handling**: Support for contest withdrawals

## Files Created
- `app/api/contest/checkout/route.ts` - Main API endpoint
- `CONTEST_CHECKOUT_API_IMPLEMENTATION.md` - This documentation

## Dependencies
- **Next.js**: App Router API routes
- **PayloadCMS**: User authentication and database access
- **Stripe**: Payment processing
- **Zod**: Input validation
- **TypeScript**: Type safety

## Compliance
- **Age Verification**: Enforces 18+ requirement
- **Data Privacy**: Minimal data collection
- **Security**: Secure authentication and authorization
- **Audit**: Comprehensive logging for compliance
