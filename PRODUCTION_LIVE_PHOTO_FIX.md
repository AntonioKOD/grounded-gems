# 🚀 Quick Production Fix for Live Photos

## Immediate Actions for Production

### 1. Deploy the Updated Code
```bash
# Deploy your updated code with the new Media collection
git add .
git commit -m "Fix Live Photo conversion for production"
git push
```

### 2. Install Sharp in Production
```bash
# SSH into your production server and run:
npm install sharp --save
# or if using yarn:
yarn add sharp
```

### 3. Fix Existing Failed Live Photos
```bash
# Run the fix script to convert any existing HEIC files
npm run fix-live-photos
```

### 4. Alternative: Use the API Endpoint
If the script doesn't work, use the API endpoint:

```bash
# Get list of failed conversions
curl -X GET "https://your-domain.com/api/media/convert-live-photos" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Convert a specific Live Photo
curl -X POST "https://your-domain.com/api/media/convert-live-photos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"mediaId": "MEDIA_ID_HERE"}'
```

## What Was Fixed

### ✅ **Enhanced Media Collection**
- Added robust error handling for Sharp library loading
- Added conversion status tracking
- Increased delay for file processing (2 seconds)
- Better fallback mechanisms

### ✅ **New API Endpoint**
- `/api/media/convert-live-photos` - Manual conversion endpoint
- Can fix failed conversions without re-uploading
- Lists all failed conversions

### ✅ **Fix Script**
- `npm run fix-live-photos` - Batch convert existing HEIC files
- Safe conversion with error handling
- Progress reporting

## Production Checklist

- [ ] Sharp library installed (`npm install sharp`)
- [ ] Updated Media collection deployed
- [ ] Run fix script: `npm run fix-live-photos`
- [ ] Test new Live Photo upload
- [ ] Monitor conversion status in admin panel

## Troubleshooting

### Sharp Not Working
```bash
# Check Sharp installation
node -e "console.log(require('sharp').versions)"

# Reinstall Sharp
npm uninstall sharp
npm install sharp
```

### File Permissions
```bash
# Check media directory permissions
ls -la media/

# Fix permissions if needed
chmod 755 media/
chown -R www-data:www-data media/  # or your web server user
```

### Disk Space
```bash
# Check available disk space
df -h

# Clean up if needed
rm -rf media/*.heic  # Only if you're sure
```

## Monitoring

Check the conversion status in your Payload admin panel:
- Go to Media collection
- Look for `conversionStatus` field
- Values: `not_converted`, `converted`, `failed`, `not_needed`

## Emergency Fallback

If Live Photos still don't work, users can:
1. Convert HEIC to JPEG on their phone before uploading
2. Use the "Live Photo" setting in iPhone Camera to turn off Live Photos
3. Upload as regular photos

## Support Commands

```bash
# Check for failed conversions
curl -X GET "https://your-domain.com/api/media/convert-live-photos"

# Convert all failed Live Photos (run in admin panel)
# Use the API endpoint for each failed media ID

# Monitor logs
tail -f /var/log/your-app.log | grep "Live Photo"
```

## Quick Test

After deployment, test with a Live Photo:
1. Take a Live Photo on iPhone
2. Upload to your app
3. Check if it converts to JPEG
4. Verify it displays correctly

---

**Status**: ✅ **READY FOR PRODUCTION DEPLOYMENT** 