# Following/Followers Relationships Fix Guide

## 🚨 Problem Identified

The mobile app is unable to properly follow/unfollow users because of a **data format mismatch** between the backend and frontend.

### Root Cause

1. **Backend Storage**: The `Users` collection stores `following` and `followers` as **relationship fields** in Payload CMS
2. **Frontend Expectation**: The mobile app expects these as **simple string arrays** of user IDs
3. **Data Corruption**: Existing relationships may be stored as object references instead of string IDs
4. **API Mismatch**: The API endpoints work correctly, but the data format is incompatible

### Technical Details

```typescript
// Backend Users collection definition
{ name: 'followers', type: 'relationship', relationTo: 'users', hasMany: true }
{ name: 'following', type: 'relationship', relationTo: 'users', hasMany: true }

// Mobile app expects
following: string[] // Array of user IDs
followers: string[] // Array of user IDs
```

## 🔧 Solution

### Step 1: Clean Up Existing Relationships

Run the cleanup script to clear all existing following/followers relationships:

```bash
# Make sure you have the MongoDB connection string set
export MONGODB_URI="your_mongodb_connection_string"

# Run the cleanup script
node scripts/cleanup-following-relationships.mjs
```

### Step 2: Verify Cleanup

Run the verification script to confirm all relationships have been cleared:

```bash
node scripts/verify-cleanup.mjs
```

### Step 3: Test Mobile App

After cleanup, test the mobile app's follow/unfollow functionality:

1. Try following a user
2. Check if the following list updates
3. Try unfollowing a user
4. Verify the lists are updated correctly

## 📋 What the Scripts Do

### `cleanup-following-relationships.mjs`

- Connects to MongoDB directly
- Finds all users in the database
- Clears both `following` and `followers` arrays for each user
- Sets them to empty arrays `[]`
- Provides detailed logging of the process

### `verify-cleanup.mjs`

- Checks if any users still have non-empty following/followers arrays
- Reports the current state
- Confirms cleanup was successful

## 🎯 Expected Results

After running the cleanup:

1. **Database**: All `following` and `followers` arrays will be empty
2. **Mobile App**: Follow/unfollow functionality should work properly
3. **API**: New relationships will be created correctly through the API endpoints
4. **Frontend**: Profile stats and lists should update correctly

## 🔍 Why This Fixes the Issue

1. **Clean Slate**: Removes all corrupted relationship data
2. **Proper Format**: New relationships will be created as string arrays
3. **API Compatibility**: The existing API endpoints work correctly with string arrays
4. **Mobile App Compatibility**: The mobile app expects and handles string arrays properly

## 🚀 API Endpoints That Work

The following API endpoints are already working correctly and will create proper relationships:

- `POST /api/mobile/users/{userId}/follow` - Follow a user
- `DELETE /api/mobile/users/{userId}/follow` - Unfollow a user
- `GET /api/mobile/users/{userId}/followers` - Get user's followers
- `GET /api/mobile/users/{userId}/following` - Get user's following list

## ⚠️ Important Notes

1. **Data Loss**: This will clear ALL existing following/followers relationships
2. **User Impact**: Users will need to re-follow people they were following before
3. **Backup**: Consider backing up the database before running the cleanup
4. **Testing**: Test thoroughly after cleanup to ensure functionality works

## 🔄 Alternative Solutions (Not Recommended)

1. **Modify Backend**: Change relationship fields to text arrays (complex, requires migration)
2. **Modify Frontend**: Handle relationship objects (complex, requires extensive changes)
3. **Hybrid Approach**: Keep both formats (maintenance nightmare)

The cleanup approach is the simplest and most reliable solution.

## 📞 Support

If you encounter issues:

1. Check the MongoDB connection string
2. Ensure you have proper database access
3. Verify the scripts run without errors
4. Test the mobile app functionality after cleanup

---

**Status**: ✅ Solution identified and scripts created
**Next Action**: Run cleanup script and test mobile app functionality
