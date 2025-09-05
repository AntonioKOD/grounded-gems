# Enhanced Video Thumbnail Generation Implementation

## Overview

This implementation provides automatic video thumbnail generation for the PayloadCMS Media collection. When a video is uploaded, the system automatically generates a JPEG thumbnail (first frame at ~1 second) and stores its public URL in the `thumbnailUrl` field.

## Features

- ✅ **Automatic Detection**: Detects video files and generates thumbnails automatically
- ✅ **Storage Agnostic**: Works with both local disk and Vercel Blob storage
- ✅ **Robust Error Handling**: Graceful fallbacks and comprehensive logging
- ✅ **Non-blocking**: Thumbnail generation doesn't block the upload process
- ✅ **Cacheable URLs**: Thumbnails are publicly accessible and cacheable
- ✅ **Backward Compatible**: Maintains compatibility with existing image flows

## Implementation Details

### 1. Media Collection Updates

The Media collection has been enhanced with new fields:

```typescript
{
  name: 'type',
  type: 'select',
  options: [
    { label: 'Image', value: 'image' },
    { label: 'Video', value: 'video' },
  ],
  admin: {
    position: 'sidebar',
    description: 'Media type (auto-detected)',
    readOnly: true,
  },
},
{
  name: 'width',
  type: 'number',
  admin: {
    description: 'Media width in pixels',
    readOnly: true,
  },
},
{
  name: 'height',
  type: 'number',
  admin: {
    description: 'Media height in pixels',
    readOnly: true,
  },
},
{
  name: 'durationSec',
  type: 'number',
  admin: {
    description: 'Video duration in seconds (for videos only)',
    readOnly: true,
  },
},
{
  name: 'thumbnailUrl',
  type: 'text',
  admin: {
    description: 'Direct URL to video thumbnail (JPEG) - auto-generated for videos',
    readOnly: true,
  },
}
```

### 2. Storage Detection

The system automatically detects the storage type:

```typescript
const isUsingVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN
```

- **Vercel Blob**: Creates a new media document for the thumbnail
- **Local Disk**: Saves thumbnail to `/public/thumbnails/` directory

### 3. Video Processing Flow

1. **Upload Detection**: `beforeChange` hook sets `type: 'video'` for video files
2. **Thumbnail Generation**: `afterChange` hook triggers thumbnail generation
3. **Frame Extraction**: Uses fluent-ffmpeg to extract frame at 1 second
4. **Storage**: Saves thumbnail based on detected storage type
5. **URL Update**: Updates the video document with `thumbnailUrl`

### 4. Error Handling

- **Timeout Protection**: 30-second timeout for FFmpeg operations
- **Fallback Thumbnails**: Creates placeholder thumbnails if extraction fails
- **Comprehensive Logging**: Detailed logs for debugging
- **Graceful Degradation**: System continues working even if thumbnails fail

## File Structure

```
sacavia/
├── collections/
│   └── Media.ts                    # Enhanced Media collection with new fields
├── lib/
│   └── video-thumbnail-generator.ts # Enhanced thumbnail generation logic
├── public/
│   └── thumbnails/                 # Local thumbnail storage (if not using Vercel Blob)
└── test-video-thumbnail-generation.js # Test script
```

## Dependencies

The following dependencies are required and already installed:

```json
{
  "fluent-ffmpeg": "^2.1.3",
  "ffmpeg-static": "^5.2.0",
  "mime": "^4.0.7",
  "@types/fluent-ffmpeg": "^2.1.27"
}
```

## Environment Variables

```bash
# Required for Vercel Blob storage
BLOB_READ_WRITE_TOKEN=your_blob_token

# Optional - for absolute URL generation
NEXT_PUBLIC_BASE_URL=https://your-domain.com
SERVER_URL=https://your-domain.com
```

## Usage

### Automatic Generation

Thumbnails are generated automatically when videos are uploaded:

```typescript
// Video upload triggers automatic thumbnail generation
const videoDoc = await payload.create({
  collection: 'media',
  data: {
    alt: 'My video',
    type: 'video', // Auto-detected
  },
  file: videoFile
})

// thumbnailUrl is automatically set after processing
console.log(videoDoc.thumbnailUrl) // "/thumbnails/thumb_video_1234567890.jpg"
```

### Manual Generation

You can also generate thumbnails manually:

```typescript
import { generateVideoThumbnailEnhanced } from '@/lib/video-thumbnail-generator'

const thumbnailUrl = await generateVideoThumbnailEnhanced(videoDoc, payload)
```

## Testing

Run the test script to verify the implementation:

```bash
node test-video-thumbnail-generation.js
```

The test script checks:
- ✅ Dependencies are installed
- ✅ Storage configuration
- ✅ Directory permissions
- ✅ Utility functions
- ✅ Media collection structure
- ✅ Environment variables
- ✅ FFmpeg availability

## API Integration

The `thumbnailUrl` field can be used in your APIs:

```typescript
// In your API routes
const posts = await payload.find({
  collection: 'posts',
  where: {
    'media.type': { equals: 'video' }
  }
})

// Each video post will have a thumbnailUrl
posts.docs.forEach(post => {
  if (post.media?.type === 'video') {
    console.log('Video thumbnail:', post.media.thumbnailUrl)
  }
})
```

## Performance Considerations

- **Non-blocking**: Thumbnail generation happens asynchronously
- **Efficient Storage**: Thumbnails are optimized JPEG files (~50-100KB)
- **Caching**: Thumbnail URLs are cacheable by CDNs
- **Cleanup**: Temporary files are automatically cleaned up

## Troubleshooting

### Common Issues

1. **FFmpeg Not Found**
   ```bash
   # Ensure ffmpeg-static is installed
   npm install ffmpeg-static
   ```

2. **Permission Errors**
   ```bash
   # Ensure write permissions for thumbnail directory
   chmod 755 public/thumbnails
   ```

3. **Storage Issues**
   ```bash
   # Check Vercel Blob token
   echo $BLOB_READ_WRITE_TOKEN
   ```

### Debug Logging

Enable detailed logging by checking the console output:

```
🎬 Enhanced: Starting video thumbnail generation for: 123
🎬 Enhanced: Storage type: Vercel Blob
🎬 Enhanced: Downloading video from: https://...
🎬 FFmpeg: Frame extraction completed successfully
🎬 Enhanced: Thumbnail saved to Vercel Blob: https://...
```

## Migration Notes

### Existing Videos

Existing videos without thumbnails can be processed by:

1. Updating the Media collection schema
2. Running a migration script to generate thumbnails for existing videos
3. The system will automatically generate thumbnails for new uploads

### Backward Compatibility

- Legacy `isVideo` and `videoThumbnail` fields are maintained
- Existing image uploads are unaffected
- New `type` field provides better type safety

## Security Considerations

- Thumbnails are publicly accessible (as intended)
- Input validation prevents malicious file uploads
- Temporary files are cleaned up automatically
- No sensitive data is exposed in thumbnail URLs

## Future Enhancements

Potential improvements for future versions:

- **Multiple Thumbnails**: Generate thumbnails at different timestamps
- **Video Metadata**: Extract duration, resolution, codec information
- **Thumbnail Optimization**: WebP format for better compression
- **Batch Processing**: Process multiple videos simultaneously
- **Custom Timestamps**: Allow users to specify thumbnail timestamp

## Support

For issues or questions:

1. Check the test script output
2. Review console logs for error messages
3. Verify environment variables are set correctly
4. Ensure all dependencies are installed

The implementation is designed to be robust and self-healing, with comprehensive error handling and fallback mechanisms.

