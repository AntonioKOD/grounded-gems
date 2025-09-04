# Robust MP4 Streaming Implementation

## Overview

This implementation provides robust MP4 streaming for both Next.js API routes and iOS clients, specifically designed to prevent AVFoundationErrorDomain -11850 ("Operation Stopped") errors and ensure reliable video playback.

## Features

### Next.js API Route (`app/api/media/file/[filename]/route.ts`)

- ✅ **Range-aware streaming** with 206 Partial Content responses
- ✅ **Memory-efficient streaming** (no buffering entire files)
- ✅ **Proper HTTP headers** for AVPlayer compatibility
- ✅ **Support for both local files and blob storage**
- ✅ **Comprehensive error handling** and logging
- ✅ **416 Range Not Satisfiable** for invalid ranges
- ✅ **Stream pass-through** for upstream storage providers

### iOS Video Player Components

- ✅ **VideoPlayerViewModel.swift** - Robust playback with retry logic
- ✅ **VideoPlayerView.swift** - SwiftUI wrapper with error handling
- ✅ **AVURLAsset-based streaming** (not Data-based loading)
- ✅ **Automatic retry** with exponential backoff
- ✅ **Proper buffer management** to prevent stalling
- ✅ **Memory-efficient streaming**

## Testing

### Server-Side Testing

Run the test script to validate the API implementation:

```bash
./test-video-streaming.sh
```

### Manual Testing with curl

```bash
# Check headers
curl -I "https://sacavia.com/api/media/file/test.mp4"

# Test range request
curl -i -H "Range: bytes=0-1023" "https://sacavia.com/api/media/file/test.mp4"

# Test invalid range (should return 416)
curl -i -H "Range: bytes=999999999-" "https://sacavia.com/api/media/file/test.mp4"
```

### Expected Results

1. **HEAD request** should show:
   - `Accept-Ranges: bytes`
   - `Content-Type: video/mp4`

2. **Range request** should return:
   - `HTTP/1.1 206 Partial Content`
   - `Content-Range: bytes 0-1023/<TOTAL>`
   - `Content-Length: 1024`

3. **Invalid range** should return:
   - `HTTP/1.1 416 Range Not Satisfiable`
   - `Content-Range: bytes */<TOTAL>`

## iOS Implementation

### Basic Usage

```swift
// Simple video player
VideoPlayerView(
    videoUrl: URL(string: "https://sacavia.com/api/media/file/video.mp4")!,
    enableAutoplay: true,
    enableAudio: true,
    loop: true
)

// Autoplay video player for feeds
AutoplayVideoPlayer(
    videoUrl: URL(string: "https://sacavia.com/api/media/file/video.mp4")!,
    enableAudio: true,
    loop: true
)
```

### Key Features

- **Automatic retry** on failure (up to 3 attempts)
- **Exponential backoff** (0.8s, 1.6s, 3.2s)
- **Proper error handling** for common AVFoundation errors
- **Memory-efficient streaming** with AVURLAsset
- **Buffer management** to prevent stalling

## MP4 Fast Start

For legacy uploads, ensure MP4 files have the moov atom at the front:

```bash
ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4
```

This improves streaming performance by allowing AVPlayer to start playback before downloading the entire file.

## Configuration

### Environment Variables

- `BLOB_READ_WRITE_TOKEN` - Enables blob storage support
- `NODE_ENV` - Set to 'production' for production deployment

### iOS Configuration

The implementation automatically:
- Configures audio session for playback
- Sets proper buffer durations
- Handles network interruptions
- Manages memory efficiently

## Error Handling

### Common AVFoundation Errors

- **-11850 (Operation Stopped)** - Handled with automatic retry
- **-1009 (No Internet)** - Shows appropriate error message
- **-1001 (Timeout)** - Retries with exponential backoff
- **-1003 (Host Not Found)** - Shows server error message

### Server Errors

- **404** - File not found
- **403** - Access denied
- **416** - Range not satisfiable
- **500** - Internal server error

## Performance Optimizations

### Server-Side

- **Streaming responses** (no memory buffering)
- **64KB chunks** for optimal performance
- **Proper cache headers** (1 hour cache)
- **Range request validation**

### iOS-Side

- **AVURLAsset** for efficient streaming
- **Preferred forward buffer** of 5 seconds
- **Automatic stall minimization**
- **Memory cleanup** on view disappear

## Security

- **Path traversal protection** for local files
- **HTTPS enforcement** for all requests
- **Proper CORS headers**
- **Input validation** for range requests

## Monitoring

### Server Logs

Look for these log patterns:
```
📦 [GET] /api/media/file/video.mp4 - Range: bytes=0-1023
📦 Handling range request: bytes=0-1023 for file size: 1234567
✅ Streaming range 0-1023 (1024 bytes)
```

### iOS Logs

Look for these log patterns:
```
🎥 [VideoPlayerViewModel] Initializing with URL: https://...
🎥 [VideoPlayerViewModel] Player is ready to play
🎥 [VideoPlayerViewModel] Scheduling retry 1/3 in 0.8s
```

## Troubleshooting

### Common Issues

1. **Video won't play** - Check network connectivity and URL format
2. **Stalling during playback** - Verify range request support
3. **Memory issues** - Ensure streaming (not buffering) is used
4. **Authentication errors** - Check server configuration

### Debug Steps

1. Check server logs for range request handling
2. Verify iOS logs for player status changes
3. Test with curl to isolate server vs client issues
4. Check network connectivity and DNS resolution

## Future Enhancements

- **Adaptive bitrate streaming** (HLS/DASH)
- **Video thumbnails** generation
- **Progress tracking** and analytics
- **Offline playback** support
- **Multiple quality levels**

## Conclusion

This implementation provides a robust foundation for MP4 streaming that:
- Prevents common AVFoundation errors
- Handles network interruptions gracefully
- Provides excellent user experience
- Scales efficiently with proper caching
- Maintains security best practices

The combination of proper HTTP range support on the server and robust error handling on the iOS client ensures reliable video playback across various network conditions.
