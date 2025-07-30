# Mobile Profile API Fix - ObjectId Casting Error ✅

## 🐛 **Issue Identified**

The mobile profile API was failing with a MongoDB ObjectId casting error when trying to fetch following users. The error occurred because the `following` array in the user document contained full user objects instead of just user IDs, causing `payload.findByID()` to fail when trying to cast the full object as an ObjectId.

### **Error Details:**
```
CastError: Cast to ObjectId failed for value "[object Object]" (type Object) at path "_id" for model "users"
```

## 🔍 **Root Cause Analysis**

The issue was in the mobile profile API (`/api/mobile/users/profile/route.ts`) where:

1. **Following Array Structure**: The `targetUser.following` array contained full user objects instead of just string IDs
2. **Direct ID Usage**: The code was directly using these objects as IDs in `payload.findByID()`
3. **Missing Validation**: No validation to check if the array items were strings or objects

### **Problematic Code:**
```typescript
const followingIds = targetUser.following.slice(0, 50)
const followingUsers = await Promise.all(
  followingIds.map(async (followingId: string) => {
    const user = await payload.findByID({
      collection: 'users',
      id: followingId, // ❌ This was a full object, not a string ID
      depth: 1
    })
  })
)
```

## ✅ **Solution Implemented**

### **1. Enhanced ID Extraction**
Added proper handling for both string IDs and full user objects:

```typescript
// Extract user IDs from the following array, handling both string IDs and full user objects
const followingIds = targetUser.following.slice(0, 50).map((item: any) => {
  if (typeof item === 'string') {
    return item
  } else if (item && typeof item === 'object' && item.id) {
    return item.id
  } else {
    console.warn('Invalid following item:', item)
    return null
  }
}).filter(Boolean) // Remove null values
```

### **2. Fixed Response Mapping**
Updated the response mapping to handle both data types:

```typescript
following: Array.isArray(targetUser.following) ? targetUser.following.map((item: any) => {
  if (typeof item === 'string') {
    return item
  } else if (item && typeof item === 'object' && item.id) {
    return item.id
  } else {
    console.warn('Invalid following item in response mapping:', item)
    return null
  }
}).filter(Boolean) : [],
```

### **3. Fixed Follow Relationship Check**
Updated the follow relationship logic to handle both data types:

```typescript
isFollowing = currentUser.following.some((item: any) => {
  if (typeof item === 'string') {
    return item === targetUserId
  } else if (item && typeof item === 'object' && item.id) {
    return item.id === targetUserId
  }
  return false
})
```

## 🎯 **Areas Fixed**

### **1. Following Users Fetch**
- ✅ Proper ID extraction from following array
- ✅ Handles both string IDs and full user objects
- ✅ Filters out invalid items
- ✅ Graceful error handling

### **2. Response Data Mapping**
- ✅ Consistent ID extraction for following/followers arrays
- ✅ Proper error logging for debugging
- ✅ Maintains API response structure

### **3. Follow Relationship Logic**
- ✅ Updated `some()` method to handle both data types
- ✅ Proper comparison logic for follow status
- ✅ Maintains existing functionality

## 🔧 **Technical Details**

### **Data Type Handling:**
```typescript
// Before: Assumed all items were strings
const followingIds = targetUser.following.slice(0, 50)

// After: Handles both strings and objects
const followingIds = targetUser.following.slice(0, 50).map((item: any) => {
  if (typeof item === 'string') return item
  if (item?.id) return item.id
  return null
}).filter(Boolean)
```

### **Error Prevention:**
- ✅ **Type Validation**: Checks item type before processing
- ✅ **Null Filtering**: Removes invalid items from processing
- ✅ **Error Logging**: Logs problematic items for debugging
- ✅ **Graceful Degradation**: Continues processing even with invalid items

## 🧪 **Testing Scenarios**

### **Scenario 1: String IDs Only**
```typescript
following: ['user1', 'user2', 'user3']
// ✅ Works correctly
```

### **Scenario 2: Mixed Data Types**
```typescript
following: ['user1', { id: 'user2', name: 'John' }, 'user3']
// ✅ Extracts IDs correctly: ['user1', 'user2', 'user3']
```

### **Scenario 3: Full Objects Only**
```typescript
following: [{ id: 'user1', name: 'John' }, { id: 'user2', name: 'Jane' }]
// ✅ Extracts IDs correctly: ['user1', 'user2']
```

### **Scenario 4: Invalid Data**
```typescript
following: ['user1', null, { name: 'John' }, 'user2']
// ✅ Handles gracefully, logs warnings, continues processing
```

## 🎉 **Result**

The mobile profile API now:

- ✅ **Handles Mixed Data**: Works with both string IDs and full user objects
- ✅ **Prevents Crashes**: No more ObjectId casting errors
- ✅ **Maintains Performance**: Efficient processing with proper filtering
- ✅ **Provides Debugging**: Logs problematic data for investigation
- ✅ **Backward Compatible**: Works with existing data structures

## 🔄 **Next Steps**

1. **Monitor Logs**: Watch for any remaining invalid data patterns
2. **Data Cleanup**: Consider cleaning up the database to standardize following/followers arrays
3. **API Consistency**: Ensure all related APIs handle data types consistently
4. **Documentation**: Update API documentation to reflect data type handling

The mobile profile should now load correctly without ObjectId casting errors! 🚀 