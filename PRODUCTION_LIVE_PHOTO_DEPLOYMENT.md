# Production Live Photo Deployment Guide

## Problem Summary

Multiple Live Photos are not working in production, with logs only showing "something went wrong" without specific error details. This guide addresses production-specific issues that can cause Live Photo conversion failures.

## Common Production Issues

### 1. Sharp Library Installation Issues

**Problem**: Sharp library may not be properly installed or accessible in production.

**Solutions**:
```bash
# Reinstall Sharp with proper binaries
npm uninstall sharp
npm install sharp

# Or force rebuild for current platform
npm rebuild sharp

# For Docker/containerized environments
npm install --platform=linux --arch=x64 sharp
```

### 2. File System Permissions

**Problem**: Production server may not have proper write permissions to the media directory.

**Solutions**:
```bash
# Check current permissions
ls -la media/

# Set proper permissions
chmod 755 media/
chown -R node:node media/  # Replace 'node' with your server user

# For Docker containers
chmod -R 777 media/  # Temporary fix for testing
```

### 3. Memory and Resource Limits

**Problem**: Production servers may have memory limits that prevent Sharp from processing large files.

**Solutions**:
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# For Docker containers, add to docker-compose.yml:
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

### 4. Missing System Dependencies

**Problem**: Sharp requires system-level dependencies that may not be installed.

**Solutions**:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y libvips-dev

# CentOS/RHEL
sudo yum install -y vips-devel

# Alpine Linux (Docker)
apk add --no-cache vips-dev
```

## Production Deployment Checklist

### Pre-Deployment

1. **Run Diagnostic Script**:
   ```bash
   node scripts/diagnose-live-photos.js
   ```

2. **Verify Sharp Installation**:
   ```bash
   npm list sharp
   node -e "console.log(require('sharp').versions)"
   ```

3. **Test File System**:
   ```bash
   # Test write permissions
   touch media/test-write
   rm media/test-write
   ```

4. **Check System Resources**:
   ```bash
   # Check available memory
   free -h
   
   # Check disk space
   df -h
   ```

### Deployment Steps

1. **Update Media Collection**:
   - Deploy the updated `collections/Media.ts` with enhanced error handling
   - Ensure the file has proper permissions

2. **Update Post Creation API**:
   - Deploy the updated `app/api/posts/create/route.ts` with fixed media assignment logic
   - Verify the file has proper permissions

3. **Environment Variables**:
   ```bash
   # Set production environment
   export NODE_ENV=production
   
   # Increase memory if needed
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

4. **Restart Services**:
   ```bash
   # Restart your application
   pm2 restart all
   
   # Or for Docker
   docker-compose restart
   ```

### Post-Deployment Verification

1. **Test Single Live Photo**:
   - Upload one Live Photo through the create post form
   - Check logs for conversion status
   - Verify the file is converted to JPEG

2. **Test Multiple Live Photos**:
   - Upload 2-3 Live Photos simultaneously
   - Check logs for sequential processing
   - Verify all files are converted and assigned correctly

3. **Monitor Logs**:
   ```bash
   # Watch application logs
   tail -f logs/app.log
   
   # Or for Docker
   docker-compose logs -f app
   ```

## Enhanced Logging

The updated Media collection now includes enhanced logging for production debugging:

### Key Log Messages to Watch

```
🔧 Environment: production
✅ Sharp library loaded successfully
📱 Media beforeChange: Live Photo detected: [filename]
📱 Converting Live Photo to JPEG: [filename]
📁 Conversion paths: [input] -> [output]
✅ Output directory is writable
🔄 Converting HEIC to JPEG...
✅ HEIC converted to JPEG successfully: [size] bytes
📱 Live Photo converted successfully to JPEG: [filename]
```

### Error Messages to Look For

```
❌ Failed to load Sharp library: [error]
❌ Input file does not exist: [path]
❌ Output directory not writable: [path]
❌ Output file was not created
❌ Output file is empty
🔧 Production error details: [detailed error info]
```

## Troubleshooting Steps

### If Sharp Fails to Load

1. **Check Installation**:
   ```bash
   npm list sharp
   ```

2. **Rebuild Sharp**:
   ```bash
   npm rebuild sharp
   ```

3. **Check Platform Compatibility**:
   ```bash
   node -e "console.log(process.platform, process.arch)"
   ```

### If File System Issues Occur

1. **Check Permissions**:
   ```bash
   ls -la media/
   ```

2. **Fix Permissions**:
   ```bash
   chmod -R 755 media/
   chown -R $USER:$USER media/
   ```

3. **Test Write Access**:
   ```bash
   touch media/test-file
   rm media/test-file
   ```

### If Conversion Fails

1. **Check Memory**:
   ```bash
   free -h
   ```

2. **Increase Memory Limit**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

3. **Check Disk Space**:
   ```bash
   df -h
   ```

### If Multiple Uploads Fail

1. **Check Queue Processing**:
   - Look for queue-related logs
   - Verify sequential processing is working

2. **Check Media Assignment**:
   - Verify the new media assignment logic is working
   - Check that Live Photos are assigned before regular images

## Docker-Specific Instructions

### Dockerfile Updates

```dockerfile
# Install system dependencies
RUN apt-get update && apt-get install -y \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Sharp with proper platform
RUN npm install --platform=linux --arch=x64 sharp

# Set proper permissions
RUN mkdir -p media && chmod 755 media
```

### Docker Compose Updates

```yaml
version: '3.8'
services:
  app:
    environment:
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=4096
    volumes:
      - ./media:/app/media
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

## Monitoring and Alerts

### Set Up Monitoring

1. **Log Monitoring**:
   - Monitor for conversion failure logs
   - Set up alerts for repeated failures

2. **File System Monitoring**:
   - Monitor disk space usage
   - Monitor file permissions

3. **Memory Monitoring**:
   - Monitor Node.js memory usage
   - Set up alerts for high memory usage

### Health Checks

Create a health check endpoint to verify Live Photo functionality:

```javascript
// app/api/health/live-photos/route.ts
export async function GET() {
  try {
    // Test Sharp availability
    const sharp = require('sharp');
    
    // Test file system
    const mediaDir = path.join(process.cwd(), 'media');
    const testFile = path.join(mediaDir, '.health-check');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    return NextResponse.json({ 
      status: 'healthy',
      sharp: 'available',
      fileSystem: 'writable'
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy',
      error: error.message 
    }, { status: 500 });
  }
}
```

## Emergency Fallback

If Live Photo conversion continues to fail in production, implement a fallback:

1. **Keep Original Files**: Don't delete HEIC files if conversion fails
2. **Client-Side Conversion**: Implement client-side HEIC to JPEG conversion
3. **Manual Conversion**: Provide an admin interface to manually convert files

## Support and Debugging

### When to Contact Support

- Sharp library installation issues
- File system permission problems
- Memory/resource constraints
- Platform-specific compatibility issues

### Debug Information to Collect

1. **Environment Details**:
   - Node.js version
   - Platform and architecture
   - Sharp version
   - Available memory and disk space

2. **Error Logs**:
   - Full error stack traces
   - Conversion failure details
   - File system error messages

3. **System Information**:
   - Operating system details
   - Docker configuration (if applicable)
   - Network and firewall settings

This guide should help resolve the production-specific issues with multiple Live Photo uploads and conversions. 