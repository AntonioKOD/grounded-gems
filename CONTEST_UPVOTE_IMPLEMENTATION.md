# Contest Upvote Implementation

## Overview
Successfully implemented a complete upvoting system for contest entries in the main Sacavia app, with the contest app acting as a frontend client that communicates with the main app's API.

## Implementation Details

### **Main App - Upvote API Route (`/app/api/contest/upvote/route.ts`)**

#### **POST Method - Handle Upvotes**
- **Input Validation**: Uses Zod schema to validate `experienceId` and `userId`
- **Business Logic**: 
  - Checks if experience exists and is contest eligible
  - Verifies user exists
  - Implements toggle behavior (upvote/remove upvote)
  - Updates experience upvotes count
  - Creates notifications for experience owners
- **Response**: Returns success status, upvoted state, and updated count

#### **GET Method - Check Upvote Status**
- **Query Parameters**: `experienceId` (required), `userId` (optional)
- **Functionality**: 
  - Returns total upvotes count for an experience
  - Checks if specific user has upvoted (when userId provided)
- **Use Cases**: Display current counts and user's voting status

#### **Security Features**
- **Authentication Required**: Only authenticated users can upvote
- **Ownership Validation**: Users can only manage their own upvotes
- **Admin Access**: Admins have full access to all upvotes

### **Main App - ContestUpvotes Collection (`/collections/ContestUpvotes.ts`)**

#### **Collection Structure**
- **Core Fields**: `experience`, `user`, `createdAt`
- **Metadata**: `ipAddress`, `userAgent`, `source`, `sessionId`
- **Relationships**: Links to experiences and users collections

#### **Access Control**
- **Read**: Public access for upvote counts
- **Create**: Authenticated users only
- **Update/Delete**: Users can only manage their own upvotes

#### **Hooks & Automation**
- **Before Change**: Sets timestamps and captures IP/user agent
- **After Change**: Updates experience upvotes count automatically
- **After Delete**: Maintains count consistency

#### **Database Indexes**
- **Unique Constraint**: One upvote per user per experience
- **Performance**: Indexed on experience, user, and creation date

### **Main App - Experiences Collection Updates**

#### **New Field Added**
- **`upvotesCount`**: Number field to track total upvotes
- **Admin Interface**: Read-only field in sidebar
- **Validation**: Non-negative integer values
- **Default Value**: 0 for new experiences

### **Main App - Payload Config Updates**

#### **Collection Registration**
- **ContestUpvotes**: Added to main payload configuration
- **Integration**: Seamlessly integrated with existing admin interface

### **Contest App - Core API Client Updates (`/lib/core.ts`)**

#### **New Functions**
- **`upvoteExperience()`**: POST request to main app's upvote API
- **`checkUpvoteStatus()`**: GET request to check current voting status
- **Error Handling**: Comprehensive error handling with status codes

#### **API Integration**
- **Base URL**: Configurable via environment variables
- **Timeout**: Appropriate timeouts for voting operations
- **Response Types**: Type-safe interfaces matching main app responses

### **Contest App - Leaderboard Component Updates**

#### **State Management**
- **`upvoteStates`**: Tracks upvoted status and counts per entry
- **`votingStates`**: Manages loading states during voting operations
- **Real-time Updates**: Immediate UI updates after successful votes

#### **Voting Logic**
- **Authentication Check**: Redirects to login if not authenticated
- **Toggle Behavior**: Users can upvote or remove upvotes
- **Optimistic Updates**: UI updates immediately, then syncs with server
- **Error Handling**: Graceful fallback for failed operations

#### **User Experience**
- **Visual Feedback**: Different button states (Vote, Upvoted, Voting...)
- **Loading States**: Disabled buttons during API calls
- **Success Indicators**: Filled heart icon for upvoted entries
- **Real-time Counts**: Live upvote counts displayed

## Data Flow

### **Upvote Process**
```
1. User clicks vote button
2. Contest app checks authentication
3. If authenticated: POST to main app /api/contest/upvote
4. Main app validates and processes upvote
5. Main app updates ContestUpvotes collection
6. Main app updates experience upvotesCount
7. Main app creates notification (if applicable)
8. Contest app receives response and updates UI
9. Contest app refreshes upvote status
```

### **Status Check Process**
```
1. Contest app loads entries
2. For each entry: GET /api/contest/upvote?experienceId=X&userId=Y
3. Main app queries ContestUpvotes collection
4. Main app returns count and user status
5. Contest app updates local state
6. UI reflects current voting status
```

## API Endpoints

### **Main App - `/api/contest/upvote`**

#### **POST - Create/Remove Upvote**
```typescript
// Request
{
  "experienceId": "string",
  "userId": "string"
}

// Response
{
  "success": boolean,
  "upvoted": boolean,
  "upvotesCount": number,
  "message": string
}
```

#### **GET - Check Status**
```typescript
// Query Parameters
?experienceId=string&userId=string

// Response
{
  "success": boolean,
  "experienceId": string,
  "upvotesCount": number,
  "userUpvoted": boolean,
  "message": string
}
```

### **Contest App - Core API Functions**
```typescript
// Upvote an experience
upvoteExperience(experienceId: string, userId: string)

// Check upvote status
checkUpvoteStatus(experienceId: string, userId?: string)
```

## Security Features

### **Authentication & Authorization**
- **User Verification**: Validates user exists before processing votes
- **Ownership Control**: Users can only manage their own upvotes
- **Admin Privileges**: Admins have full access to all upvotes

### **Data Validation**
- **Input Sanitization**: Zod schema validation for all inputs
- **Business Rules**: Ensures experiences are contest eligible
- **Rate Limiting**: IP address tracking for potential abuse prevention

### **CORS & CSRF**
- **Origin Control**: Restricted to contest app domain
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Secure Headers**: Proper security headers implementation

## Performance Optimizations

### **Database Efficiency**
- **Indexed Queries**: Optimized database indexes for fast lookups
- **Batch Operations**: Efficient bulk status checking
- **Caching Strategy**: Browser-level caching for static data

### **API Optimization**
- **Pagination**: Cursor-based pagination for large datasets
- **Selective Loading**: Only loads necessary upvote data
- **Real-time Updates**: Immediate UI feedback without full reloads

## User Experience Features

### **Visual Feedback**
- **Button States**: Clear indication of current voting status
- **Loading Indicators**: Shows when operations are in progress
- **Success Messages**: Confirms successful voting actions

### **Responsive Design**
- **Mobile Optimized**: Touch-friendly voting buttons
- **Accessibility**: Screen reader support and keyboard navigation
- **Dark Mode**: Consistent with app's theme system

### **Real-time Updates**
- **Live Counts**: Upvote counts update immediately
- **Status Sync**: User's voting status stays current
- **Optimistic UI**: Immediate feedback with server validation

## Error Handling

### **Client-side Errors**
- **Network Failures**: Graceful fallback for API failures
- **Validation Errors**: Clear error messages for invalid inputs
- **Authentication Errors**: Automatic redirect to login

### **Server-side Errors**
- **Database Errors**: Logged and handled gracefully
- **Validation Failures**: Detailed error responses with suggestions
- **Rate Limiting**: Prevents abuse and maintains performance

## Monitoring & Analytics

### **Logging**
- **Vote Activity**: Comprehensive logging of all voting actions
- **Error Tracking**: Detailed error logging for debugging
- **Performance Metrics**: Response time and success rate tracking

### **Admin Interface**
- **Upvote Management**: Full CRUD operations for administrators
- **User Activity**: Track voting patterns and user engagement
- **System Health**: Monitor collection performance and usage

## Future Enhancements

### **Immediate**
1. **Real-time Notifications**: WebSocket integration for live updates
2. **Vote Analytics**: Detailed voting statistics and trends
3. **Social Features**: Share upvoted experiences

### **Long-term**
1. **Advanced Filtering**: Sort by upvotes, popularity, etc.
2. **Vote History**: User's voting history and patterns
3. **Contest Rankings**: Leaderboards based on upvote counts
4. **Anti-gaming**: Advanced fraud detection and prevention

## Testing & Validation

### **API Testing**
- **Endpoint Validation**: Verify all endpoints work correctly
- **Error Scenarios**: Test various failure conditions
- **Performance Testing**: Load testing for high-traffic scenarios

### **Integration Testing**
- **End-to-end Flows**: Complete voting workflows
- **Cross-app Communication**: Verify contest app ↔ main app integration
- **Authentication Flow**: Test SSO and session management

### **User Experience Testing**
- **Responsiveness**: Test on various devices and screen sizes
- **Accessibility**: Verify screen reader and keyboard navigation
- **Performance**: Ensure smooth interactions and fast responses

## Deployment Considerations

### **Environment Variables**
```bash
# Main App
PAYLOAD_SECRET=your-secret-here
DATABASE_URI=your-mongodb-uri

# Contest App
NEXT_PUBLIC_MAIN_APP_URL=https://sacavia.com
NEXT_PUBLIC_CONTEST_APP_URL=https://vote.sacavia.com
```

### **Database Migration**
- **New Collections**: ContestUpvotes collection will be created
- **Field Addition**: upvotesCount field added to Experiences
- **Index Creation**: Database indexes for performance

### **Monitoring Setup**
- **Health Checks**: API endpoint availability monitoring
- **Error Alerts**: Notification for critical failures
- **Performance Metrics**: Response time and throughput tracking

## Compliance & Standards

- **Data Privacy**: User voting data handled securely
- **Rate Limiting**: Prevents abuse and maintains fair voting
- **Audit Trail**: Complete logging of all voting activities
- **Accessibility**: WCAG compliance for inclusive design

---

**Ready for secure and scalable contest voting! 🎯**
