# Multiple Live Photos Upload Fix

## Problem Summary

Multiple Live Photos (HEIC/HEIF files from iPhones) were not uploading correctly because:

1. **Media Assignment Logic Error**: The post creation API was incorrectly assigning media IDs based on the original file arrays instead of the actual upload order
2. **Sequential vs Parallel Processing**: Live Photos were uploaded sequentially, but the media assignment logic assumed they were uploaded in the same order as the original file arrays

## Root Cause

In `sacavia/app/api/posts/create/route.ts`, the media assignment logic was:

```javascript
// INCORRECT - This was wrong!
const imageCount = imageFiles.length
const videoCount = videoFiles.length

// First imageCount items are images, rest are videos
if (imageCount > 0) {
  imageIds.push(...mediaIds.slice(0, imageCount))
}
if (videoCount > 0) {
  videoIds.push(...mediaIds.slice(imageCount))
}
```

This logic failed because:
- Live Photos are uploaded **sequentially** first
- Regular images and videos are uploaded **in parallel** after
- The `mediaIds` array contains: `[LivePhoto1, LivePhoto2, LivePhoto3, RegularImage1, RegularImage2, Video1, Video2]`
- But the old logic assumed: `[Image1, Image2, Image3, Video1, Video2]`

## Solution

### 1. Fixed Media Assignment Logic

Updated the media assignment logic to track the actual upload order:

```javascript
// CORRECT - Track upload order properly
let currentIndex = 0

// First, add Live Photos (they were uploaded first, sequentially)
const livePhotoCount = livePhotoFiles.length
if (livePhotoCount > 0) {
  imageIds.push(...mediaIds.slice(currentIndex, currentIndex + livePhotoCount))
  currentIndex += livePhotoCount
}

// Then add regular images (uploaded in parallel)
const regularImageCount = regularImageFiles.length
if (regularImageCount > 0) {
  imageIds.push(...mediaIds.slice(currentIndex, currentIndex + regularImageCount))
  currentIndex += regularImageCount
}

// Finally add videos (uploaded in parallel)
const videoCount = videoFiles.length
if (videoCount > 0) {
  videoIds.push(...mediaIds.slice(currentIndex, currentIndex + videoCount))
}
```

### 2. Enhanced Logging

Added detailed logging to track the upload process:

```javascript
console.log(`📝 File breakdown: ${livePhotoFiles.length} Live Photos, ${regularImageFiles.length} regular images, ${videoFiles.length} videos`)
console.log(`📝 Media assignment: ${imageIds.length} images (${livePhotoCount} Live Photos + ${regularImageCount} regular), ${videoIds.length} videos`)
```

### 3. Sequential Processing for Live Photos

Live Photos are processed sequentially with delays to prevent conflicts:

```javascript
// Process Live Photos sequentially to prevent conflicts
if (livePhotoFiles.length > 0) {
  console.log(`📝 Processing ${livePhotoFiles.length} Live Photos sequentially...`)
  for (const file of livePhotoFiles) {
    try {
      const mediaId = await uploadImageFile(file, payload)
      if (mediaId) {
        mediaIds.push(mediaId)
        console.log(`📝 Live Photo uploaded successfully: ${mediaId}`)
        
        // Add delay between Live Photo uploads to prevent conflicts
        if (livePhotoFiles.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    } catch (error) {
      console.error(`📝 Live Photo upload failed: ${file.name}`, error)
      return NextResponse.json(
        { success: false, message: `Live Photo upload failed: ${file.name}` },
        { status: 500 }
      )
    }
  }
}
```

## How Live Photos Work

Based on the [Apple Support documentation](https://discussions.apple.com/thread/254977407), Live Photos are pairs of files:

1. **High-resolution still image** (JPEG)
2. **Short video clip** (MOV)

When imported together, they should be combined into a Live Photo. However, if one part is already imported, Photos will just import the missing part and not combine them.

## Testing Multiple Live Photos

### 1. Manual Testing

1. **Upload multiple Live Photos through the create post form**
2. **Check the console logs** for:
   - File breakdown: `X Live Photos, Y regular images, Z videos`
   - Sequential processing messages
   - Media assignment confirmation
3. **Verify in the database** that:
   - All Live Photos are converted to JPEG
   - Post has correct image and photos assignments
   - No conflicts or race conditions

### 2. Automated Testing

Run the test script:

```bash
node test-multiple-live-photos-fixed.js
```

This script:
- Creates 3 dummy HEIC files
- Uploads them through the post creation API
- Verifies all files are processed correctly
- Checks media assignments

### 3. Production Testing

1. **Deploy the fix to production**
2. **Test with real Live Photos from iPhone**
3. **Monitor logs** for conversion status
4. **Verify** that multiple Live Photos upload and convert correctly

## Expected Behavior

After the fix:

✅ **Multiple Live Photos upload sequentially**  
✅ **Each Live Photo converts to JPEG**  
✅ **Post has correct media assignments**  
✅ **No conflicts or race conditions**  
✅ **Proper error handling and logging**  

## Files Modified

1. `sacavia/app/api/posts/create/route.ts` - Fixed media assignment logic
2. `sacavia/test-multiple-live-photos-fixed.js` - Added comprehensive test script
3. `sacavia/MULTIPLE_LIVE_PHOTOS_FIX.md` - This documentation

## Related Components

- `sacavia/collections/Media.ts` - Live Photo conversion logic (already working)
- `sacavia/components/ui/heic-image-upload.tsx` - Client-side HEIC processing (already working)
- `sacavia/components/post/create-post-form.tsx` - Form handling (already working)

## Monitoring and Debugging

### Key Log Messages to Watch

```
📝 File breakdown: 3 Live Photos, 2 regular images, 1 videos
📝 Processing 3 Live Photos sequentially...
📝 Live Photo uploaded successfully: [media-id]
📝 Media assignment: 5 images (3 Live Photos + 2 regular), 1 videos
```

### Common Issues and Solutions

1. **Live Photos not converting**: Check Sharp library installation
2. **Conversion conflicts**: Verify queuing system is working
3. **Media assignment errors**: Check the new assignment logic
4. **Upload failures**: Monitor sequential processing delays

## Production Deployment

1. **Deploy the updated post creation API**
2. **Test with real Live Photos**
3. **Monitor conversion success rates**
4. **Verify media assignments in posts**
5. **Check for any remaining conflicts**

The fix ensures that multiple Live Photos can be uploaded reliably in production without conflicts or conversion failures. 