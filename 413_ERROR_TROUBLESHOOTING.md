# 413 Payload Too Large - Troubleshooting Guide

## Quick Diagnosis

### 1. Test Upload Limits
Visit: `http://localhost:3000/api/test-upload-limits`

This endpoint will tell you:
- Current server configuration
- Maximum allowed payload size
- Whether your server is properly configured

### 2. Check File Sizes
Before uploading, check your file sizes:
- **Individual files**: Should be under 50MB
- **Total upload**: Should be under 100MB
- **Post payload**: Should be under 4.5MB (Vercel limit)

## Immediate Solutions

### Solution 1: Use Chunked Upload (Recommended)
The system now automatically uses chunked upload for files larger than 5MB:
1. Large files are split into 2MB chunks
2. Each chunk is uploaded separately
3. Files are reassembled on the server

### Solution 2: Reduce File Sizes
- **HEIC files**: Automatically compressed (20-30% reduction)
- **Large images**: Automatically compressed if >5MB
- **Manual compression**: Use image editing tools before upload

### Solution 3: Upload Files Separately
1. Upload media files first using `/test-mobile-upload`
2. Create post with media IDs (not files)
3. This reduces the post payload size significantly

## Server Configuration

### Development Environment
```bash
# Restart server with new configuration
pkill -f "next"
npm run dev
```

### Production Environment (Vercel)
The `vercel.json` file configures:
- Function timeout: 300 seconds
- CORS headers for API routes
- Proper error handling

### Alternative Hosting
If using other hosting services, check their limits:
- **Netlify**: 6MB function payload limit
- **Railway**: 10MB request limit
- **Heroku**: 30MB request limit

## Debugging Steps

### Step 1: Check Request Size
```javascript
// In browser console
const formData = new FormData()
formData.append('file', yourFile)
console.log('File size:', yourFile.size / 1024 / 1024, 'MB')
```

### Step 2: Test with Small Files
1. Try uploading a 1MB image first
2. If that works, gradually increase file size
3. Note the exact size where it fails

### Step 3: Check Network Tab
1. Open browser DevTools
2. Go to Network tab
3. Try uploading a file
4. Look for the failed request
5. Check the "Request Payload" size

### Step 4: Test API Endpoints
```bash
# Test the upload limits endpoint
curl -X GET http://localhost:3000/api/test-upload-limits

# Test with a small file
curl -X POST http://localhost:3000/api/test-upload-limits \
  -F "file=@small-image.jpg"
```

## Common Issues and Fixes

### Issue 1: "Request Entity Too Large" on Vercel
**Cause**: Vercel has a 4.5MB limit for serverless functions
**Solution**: 
- Use chunked upload for files >5MB
- Compress images before upload
- Upload files separately from post creation

### Issue 2: "413 Content Too Large" on Custom Server
**Cause**: Server configuration limits
**Solution**:
- Check `next.config.ts` bodySizeLimit
- Verify API route configuration
- Restart development server

### Issue 3: Chunked Upload Not Working
**Cause**: Chunked upload endpoints not configured
**Solution**:
- Ensure `/api/media/chunked` and `/api/media/finalize` exist
- Check server logs for chunked upload errors
- Verify chunk size configuration (2MB chunks)

### Issue 4: HEIC Conversion Failing
**Cause**: Sharp library not installed or configured
**Solution**:
```bash
npm install sharp
npm run build
```

## Performance Optimization

### For Large Files (>10MB)
1. **Use chunked upload**: Automatic for files >5MB
2. **Enable compression**: Automatic for images
3. **Show progress**: Real-time upload progress
4. **Handle failures**: Automatic retry with smaller chunks

### For Multiple Files
1. **Sequential upload**: Upload one file at a time
2. **Progress tracking**: Show progress for each file
3. **Error handling**: Continue with successful uploads
4. **Size validation**: Check total size before starting

## Testing Checklist

### Before Upload
- [ ] File size < 50MB individually
- [ ] Total size < 100MB
- [ ] Post payload < 4.5MB
- [ ] Server is running with new config
- [ ] Chunked upload endpoints are available

### During Upload
- [ ] Check browser console for errors
- [ ] Monitor network tab for request size
- [ ] Verify chunked upload is used for large files
- [ ] Check server logs for processing errors

### After Upload
- [ ] Verify files are accessible
- [ ] Check file sizes are reduced
- [ ] Confirm post creation succeeds
- [ ] Test file display in UI

## Emergency Workarounds

### If Nothing Works
1. **Manual compression**: Use online tools to compress images
2. **Split uploads**: Upload files one by one
3. **Use external storage**: Upload to cloud storage, then link
4. **Reduce quality**: Use lower resolution images

### Temporary Solution
```javascript
// In your upload component, add this check
if (file.size > 5 * 1024 * 1024) { // 5MB
  alert('File too large. Please compress or use a smaller file.')
  return
}
```

## Monitoring and Alerts

### Key Metrics to Watch
- Upload success rate
- Average file size
- Chunked upload usage
- 413 error frequency
- Processing time

### Log Messages to Look For
```
📊 Request size: X.XX MB
📦 Starting chunked upload: X chunks
✅ Chunked upload finalized successfully
❌ Request too large: X.XX MB
```

## Support

If you're still experiencing issues:

1. **Check logs**: Look at server console output
2. **Test endpoints**: Use `/api/test-upload-limits`
3. **Verify configuration**: Ensure all files are saved and server restarted
4. **Check hosting limits**: Verify your hosting provider's limits
5. **Try different files**: Test with various file types and sizes

## Quick Commands

```bash
# Restart server
pkill -f "next" && npm run dev

# Check server status
ps aux | grep next

# Test API endpoint
curl http://localhost:3000/api/test-upload-limits

# Check file sizes
ls -lh your-upload-folder/

# Monitor logs
tail -f .next/server.log
``` 