# Mobile Live Photo Testing Guide

## Overview

This guide helps you test Live Photo uploads on mobile devices with detailed logging to understand what's happening during the upload and conversion process.

## What's New

### Enhanced Logging System
- **Real-time logs** displayed directly on the mobile form
- **Detailed conversion information** showing file sizes, processing times, and compression ratios
- **Upload status tracking** with progress indicators
- **Error details** with specific failure reasons
- **Debug information** toggle for additional technical details

### Mobile-Optimized Interface
- **Touch-friendly** upload interface
- **Tabbed interface** to separate upload and status views
- **Real-time feedback** during processing
- **Clear error messages** in user-friendly language

## Testing Steps

### 1. Access the Test Page

Navigate to: `/test-mobile-upload`

This page provides a dedicated mobile-optimized interface for testing Live Photo uploads.

### 2. Understanding the Interface

The test page has several key sections:

#### Header Section
- User profile information
- **Debug Info button** (ℹ️) - Toggle to see technical details

#### Content Input
- Text area for post content
- Character counter (500 max)

#### Media Upload Section
Two tabs:
- **Upload Media** - Main upload interface
- **Upload Status** - Progress and status information

#### Location Section
- Location search and selection

#### Debug Information (Toggle)
Shows:
- Selected Files count
- Uploaded Media IDs count
- Form validation status
- Error count

### 3. Testing Live Photo Uploads

#### Step 1: Prepare Test Files
1. **Single Live Photo**: Take one Live Photo with your iPhone
2. **Multiple Live Photos**: Take 2-3 Live Photos in sequence
3. **Mixed Content**: Mix Live Photos with regular photos and videos

#### Step 2: Upload Process
1. **Tap "Upload Media" tab**
2. **Tap "Choose Files" button**
3. **Select your Live Photos**
4. **Watch the detailed logs appear**

#### Step 3: Monitor the Logs

The logging system will show:

```
📋 Starting to process 2 file(s)
📋 Validating file: IMG_1234.HEIC
📋 HEIC file detected: IMG_1234.HEIC
📋 Size: 8.45MB
📋 Starting file processing and conversion
📋 Processing file 1/2: IMG_1234.HEIC
✅ HEIC conversion successful: IMG_1234.HEIC
📋 Original: 8.45MB → Converted: 2.31MB (1250ms)
📋 Conversion details: Quality 90%, Format: JPEG
📋 Preview created for: IMG_1234.HEIC
📋 Starting upload of 2 file(s) to server
📋 Uploading file 1/2: IMG_1234.HEIC
✅ Upload successful: IMG_1234.HEIC
📋 Upload time: 850ms, Server ID: abc123
✅ All uploads completed successfully!
📋 Total uploaded: 2 files
```

### 4. What to Look For

#### Successful Upload Indicators
- ✅ **Green checkmarks** for successful operations
- **File size reduction** (typically 60-80% for HEIC)
- **Processing times** under 3 seconds per file
- **Server IDs** assigned to uploaded files
- **"Media ready for post"** status

#### Error Indicators
- ❌ **Red error icons** for failed operations
- **Specific error messages** with details
- **Response status codes** (e.g., 500, 413)
- **File validation failures**

#### Performance Metrics
- **Conversion time**: Should be under 3 seconds per file
- **Upload time**: Depends on file size and network
- **Compression ratio**: Typically 60-80% for HEIC files
- **Memory usage**: Should remain stable

### 5. Common Issues and Solutions

#### Issue: "Sharp library not available"
**Symptoms**: Error in conversion logs
**Solution**: 
- Check if Sharp is installed: `npm list sharp`
- Rebuild Sharp: `npm rebuild sharp`
- For production: Follow the production deployment guide

#### Issue: "File too large"
**Symptoms**: Validation error in logs
**Solution**:
- HEIC files are typically large, ensure server accepts up to 10MB
- Check server configuration for file size limits

#### Issue: "Upload failed"
**Symptoms**: Network error in upload logs
**Solution**:
- Check network connection
- Verify server is running
- Check server logs for detailed error information

#### Issue: "Conversion failed"
**Symptoms**: HEIC conversion error in logs
**Solution**:
- Check if file is actually HEIC format
- Verify Sharp library is working
- Check available memory on device

### 6. Production Testing

#### Before Deploying
1. **Run diagnostic script**:
   ```bash
   node scripts/diagnose-live-photos.js
   ```

2. **Test on actual mobile devices**:
   - iPhone with Live Photos
   - Android with HEIC files
   - Different network conditions

3. **Monitor server logs**:
   ```bash
   tail -f logs/app.log
   ```

#### Production Checklist
- [ ] Sharp library installed and working
- [ ] File size limits configured correctly
- [ ] Media directory has proper permissions
- [ ] Server has sufficient memory
- [ ] Network timeouts configured appropriately

### 7. Debug Information

#### Toggle Debug Info
Tap the ℹ️ button in the header to see:
- Selected Files count
- Uploaded Media IDs count
- Form validation status
- Error count

#### Console Logs
Open browser developer tools to see:
- Detailed conversion information
- Network request details
- Error stack traces

#### Server Logs
Check server logs for:
- Media collection hooks
- File processing details
- Conversion queue status
- Error details

### 8. Expected Behavior

#### Single Live Photo
1. File selected → Validation → HEIC detection
2. Conversion starts → Progress updates
3. JPEG created → Size reduction shown
4. Upload starts → Progress updates
5. Server ID assigned → Success message

#### Multiple Live Photos
1. Files selected → Sequential processing
2. Each file converted individually
3. Progress shown for each file
4. All files uploaded → Success message

#### Mixed Content
1. HEIC files converted to JPEG
2. Regular images processed normally
3. Videos uploaded as-is
4. All media IDs collected for post creation

### 9. Performance Benchmarks

#### Conversion Performance
- **Small HEIC (2-5MB)**: 1-2 seconds
- **Medium HEIC (5-10MB)**: 2-3 seconds
- **Large HEIC (10MB+)**: 3-5 seconds

#### Upload Performance
- **Fast WiFi**: 1-3 seconds per MB
- **Slow WiFi**: 3-8 seconds per MB
- **Mobile Data**: 5-15 seconds per MB

#### Memory Usage
- **Conversion**: +50-100MB per file
- **Upload**: +10-20MB per file
- **Total**: Should stay under 500MB

### 10. Troubleshooting

#### If Logs Don't Appear
1. Check if `showDetailedLogs={true}` is set
2. Verify the HEIC upload component is loaded
3. Check browser console for JavaScript errors

#### If Conversion Fails
1. Check Sharp library installation
2. Verify file permissions
3. Check available memory
4. Review server logs

#### If Upload Fails
1. Check network connection
2. Verify server is running
3. Check file size limits
4. Review server error logs

#### If Multiple Files Fail
1. Check conversion queue
2. Verify sequential processing
3. Monitor memory usage
4. Check server load

## Summary

The enhanced mobile testing interface provides:
- **Real-time visibility** into the Live Photo upload process
- **Detailed error reporting** for troubleshooting
- **Performance metrics** for optimization
- **User-friendly feedback** for better UX

Use this guide to systematically test Live Photo uploads and identify any issues in the conversion or upload process. 