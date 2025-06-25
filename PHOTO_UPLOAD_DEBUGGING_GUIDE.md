# Photo Upload Debugging Guide

## Issue Description
The "Add Photo" functionality on location pages is not working properly. This guide provides debugging steps and fixes to identify and resolve the issue.

## Debugging Changes Made

### 1. Enhanced Error Logging in PhotoSubmissionModal
- Added comprehensive console logging throughout the submission process
- Added validation checks for location and user data
- Enhanced error handling with detailed error messages
- Added debugging for file upload and submission API calls

### 2. Enhanced UserPhotosSection Debugging
- Added logging for modal open/close events
- Added user authentication checks
- Added debug overlay in development mode
- Enhanced error handling for missing data

### 3. Modal Rendering Debugging
- Added checks to ensure modal is properly rendering
- Added portal mounting verification
- Added prop validation logging

## How to Debug the Issue

### Step 1: Check Browser Console
1. Open the location page in your browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Click the "Add Photo" button
5. Look for the following debug messages:

**Expected Success Flow:**
```
🚀 Opening photo submission modal...
👤 User: {id: "user_id", name: "User Name"}
📍 Location: {id: "location_id", name: "Location Name"}
✅ Modal state set to open
🎨 Rendering PhotoSubmissionModal with props: {isOpen: true, location: {...}, user: {...}}
```

**Expected Upload Flow:**
```
🚀 Starting photo submission process...
📁 File details: {name: "photo.jpg", type: "image/jpeg", size: "2.5MB"}
📍 Location: {id: "location_id", name: "Location Name"}
👤 User: {id: "user_id", name: "User Name"}
📤 Uploading to /api/media...
📤 Upload response status: 200
✅ Upload successful: {doc: {...}}
📤 Submitting to photo-submissions API...
📤 Submission data: {photoId: "...", caption: "...", category: "...", tags: [...]}
📤 Submission response status: 200
✅ Submission successful: {submission: {...}}
✅ Photo submission success callback triggered
```

### Step 2: Check for Common Issues

#### Issue 1: User Not Authenticated
**Symptoms:**
- Console shows "❌ No user found - showing login error"
- "Please log in to add photos" toast appears

**Solution:**
- Ensure user is properly logged in
- Check that `useAuth()` hook is working correctly
- Verify session cookies are present

#### Issue 2: Modal Not Opening
**Symptoms:**
- Console shows "🚫 Modal not rendering: {isOpen: false, hasLocation: true, hasUser: true}"
- No modal appears when clicking "Add Photo"

**Solution:**
- Check if `isSubmissionModalOpen` state is being set correctly
- Verify that `location` and `user` props are being passed
- Check for any CSS z-index issues

#### Issue 3: File Upload Fails
**Symptoms:**
- Console shows "❌ Upload failed: {error: '...'}"
- Upload response status is not 200

**Common Causes:**
- File size too large (>10MB)
- Invalid file type
- Authentication issues with `/api/media` endpoint
- Network connectivity issues

**Solution:**
- Check file size and type
- Verify user authentication
- Check network connectivity
- Review `/api/media` endpoint logs

#### Issue 4: Photo Submission Fails
**Symptoms:**
- Console shows "❌ Submission failed: {error: '...'}"
- Submission response status is not 200

**Common Causes:**
- Missing required fields (photoId, category)
- Location not found
- Duplicate submission
- Database connection issues

**Solution:**
- Verify all required fields are present
- Check location exists in database
- Ensure no duplicate submissions
- Review `/api/locations/[id]/photo-submissions` endpoint logs

### Step 3: Check API Endpoints

#### Test `/api/media` Endpoint
```bash
curl -X POST http://localhost:3000/api/media \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-image.jpg" \
  -F "alt=Test image" \
  --cookie "your-session-cookie"
```

#### Test `/api/locations/[id]/photo-submissions` Endpoint
```bash
curl -X POST http://localhost:3000/api/locations/location-id/photo-submissions \
  -H "Content-Type: application/json" \
  -d '{
    "photoId": "media-id",
    "caption": "Test caption",
    "category": "exterior",
    "tags": ["test"]
  }' \
  --cookie "your-session-cookie"
```

### Step 4: Check Database Collections

Ensure the following collections exist and are accessible:
- `media` - for storing uploaded images
- `locationPhotoSubmissions` - for storing photo submissions
- `locations` - for location data

### Step 5: Check Dependencies

Verify these packages are installed:
```bash
npm list heic2any
npm list framer-motion
npm list sonner
```

## Common Fixes

### Fix 1: Authentication Issues
If user authentication is not working:

```typescript
// In UserPhotosSection.tsx
const { user } = useAuth()

// Add this check
useEffect(() => {
  console.log('🔐 Auth state:', { user, isAuthenticated: !!user })
}, [user])
```

### Fix 2: Modal Z-Index Issues
If modal appears behind other elements:

```css
/* Add to global CSS */
.photo-submission-modal {
  z-index: 100000 !important;
}
```

### Fix 3: File Upload Issues
If file upload is failing, check the file validation:

```typescript
// In PhotoSubmissionModal.tsx
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  console.log('📁 File selected:', {
    name: file.name,
    type: file.type,
    size: file.size,
    isValid: file.type.startsWith('image/') || isHEICFile(file)
  })
  
  // ... rest of the function
}
```

## Testing Steps

1. **Basic Functionality Test:**
   - Log in to the application
   - Navigate to a location page
   - Click "Add Photo" button
   - Verify modal opens
   - Select an image file
   - Fill in caption and category
   - Submit the photo
   - Verify success message

2. **Error Handling Test:**
   - Try uploading without selecting a file
   - Try uploading a file larger than 10MB
   - Try uploading a non-image file
   - Try submitting without required fields

3. **Authentication Test:**
   - Log out and try to add a photo
   - Verify appropriate error message
   - Log back in and try again

## Next Steps

After implementing these debugging changes:

1. Test the photo upload functionality
2. Check browser console for debug messages
3. Identify the specific point of failure
4. Apply the appropriate fix based on the error
5. Remove debug logging once the issue is resolved

## Support

If the issue persists after following this guide:
1. Check the browser console for specific error messages
2. Verify all API endpoints are responding correctly
3. Check database connectivity and collection permissions
4. Review server logs for any backend errors 