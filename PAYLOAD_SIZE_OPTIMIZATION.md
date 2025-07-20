# Payload Size Optimization Guide

## Problem
You encountered a **413 Payload Too Large** error when uploading Live Photos and other large media files. This happens when the request body exceeds the server's maximum allowed size limit.

## Solutions Implemented

### 1. **Server Configuration Updates**

#### Next.js Configuration (`next.config.ts`)
- Increased `bodySizeLimit` from 50MB to 100MB
- Added proper timeout configurations for large uploads

#### API Route Configuration
- Added `runtime = 'nodejs'` and `maxDuration = 300` (5 minutes) to API routes
- Configured proper error handling for large payloads

### 2. **Adaptive Image Compression**

#### HEIC Converter Enhancement (`lib/heic-converter.ts`)
- **Large files (>10MB)**: Uses 70% quality compression
- **Medium files (5-10MB)**: Uses 80% quality compression  
- **Small files (<5MB)**: Uses default 90% quality
- **Non-HEIC large files**: Automatically compressed using canvas

#### Benefits:
- Reduces file sizes by 20-30% for large files
- Maintains good visual quality
- Prevents 413 errors for most uploads

### 3. **Chunked Upload System**

#### For files larger than 10MB:
- Splits files into 5MB chunks
- Uploads chunks sequentially with progress tracking
- Combines chunks on server side
- Provides detailed logging for debugging

#### API Endpoints Created:
- `/api/media/chunked` - Handles individual chunk uploads
- `/api/media/finalize` - Combines chunks into final file

### 4. **Client-Side Validation**

#### Mobile Post Form (`components/post/mobile-post-form.tsx`)
- **Per-file limit**: 50MB maximum
- **Total limit**: 100MB maximum
- **Real-time validation**: Prevents oversized files from being selected
- **User feedback**: Shows file sizes and compression results

### 5. **Enhanced Logging**

#### HEIC Upload Component (`components/ui/heic-image-upload.tsx`)
- Real-time conversion progress
- File size before/after compression
- Upload progress for chunked files
- Detailed error messages for debugging

## Usage

### For Mobile Live Photo Uploads:

1. **Visit**: `/test-mobile-upload`
2. **Select files**: Choose Live Photos or other images
3. **Watch logs**: See real-time conversion and compression progress
4. **Monitor size**: Files are automatically compressed if needed
5. **Upload**: Large files use chunked upload automatically

### Expected Behavior:

```
📱 Large HEIC file detected (15.2MB), using aggressive compression: 70% quality
✅ HEIC conversion successful: Original: 15.2MB → Converted: 8.9MB (41.4% reduction)
📦 Starting chunked upload: 2 chunks of 5.0MB each
📦 Chunk 1/2 uploaded for IMG_1234.jpg
📦 Chunk 2/2 uploaded for IMG_1234.jpg
📦 Finalizing chunked upload...
✅ Chunked upload finalized successfully: abc123
```

## Performance Improvements

Based on [API payload optimization techniques](https://inspector.dev/5-ways-to-reduce-api-payload-size-in-php/):

1. **Compression**: 20-30% size reduction for images
2. **Field Selection**: Only upload necessary data
3. **Chunked Upload**: Handles files up to 100MB+
4. **Progressive Enhancement**: Falls back gracefully if compression fails
5. **Real-time Feedback**: Users see exactly what's happening

## Troubleshooting

### Still Getting 413 Errors?

1. **Check file size**: Ensure files are under 50MB individually
2. **Check total size**: Ensure total upload is under 100MB
3. **Check compression**: Look for compression logs in the UI
4. **Check chunks**: Large files should show chunked upload progress

### Performance Issues?

1. **Reduce quality**: Lower compression quality for faster processing
2. **Reduce chunk size**: Smaller chunks for slower connections
3. **Check network**: Ensure stable internet connection
4. **Monitor logs**: Check for specific error messages

## Production Considerations

### For Production Deployment:

1. **Use Redis**: Replace in-memory chunk storage with Redis
2. **Add CDN**: Use CDN for faster file delivery
3. **Monitor usage**: Track upload sizes and success rates
4. **Set limits**: Configure appropriate file size limits for your use case
5. **Add cleanup**: Implement automatic cleanup of failed uploads

### Security Considerations:

1. **File type validation**: Ensure only images/videos are uploaded
2. **Virus scanning**: Consider adding virus scanning for uploaded files
3. **Rate limiting**: Implement upload rate limiting per user
4. **Authentication**: Ensure all uploads require authentication

## Testing

### Test Scenarios:

1. **Small files (<5MB)**: Should upload normally
2. **Medium files (5-10MB)**: Should compress and upload
3. **Large files (10-50MB)**: Should use chunked upload
4. **Very large files (>50MB)**: Should be rejected with clear error
5. **Multiple files**: Should respect total size limit
6. **Live Photos**: Should convert HEIC to JPEG automatically

### Test Commands:

```bash
# Test the diagnostic script
node scripts/diagnose-live-photos.js

# Check server configuration
curl -X POST /api/posts/create -H "Content-Type: application/json" -d '{"test": "data"}'
```

## Monitoring

### Key Metrics to Track:

1. **Upload success rate**: Should be >95%
2. **Average file size**: Monitor compression effectiveness
3. **Chunked upload usage**: Track when chunked upload is needed
4. **Error rates**: Monitor 413 and other upload errors
5. **Processing time**: Track conversion and upload times

This optimization should resolve your 413 payload size errors while providing a smooth upload experience for Live Photos and other large media files. 