# Live Photo Support

## Overview

This application now supports **Live Photos** from iPhones, automatically converting them to regular JPEG images for better compatibility and reduced file sizes.

## What are Live Photos?

Live Photos are a feature on iPhones that capture a brief moment before and after taking a photo, creating a short video clip. They are stored in the **HEIC/HEIF** format, which can cause issues with:

- File size (3-5MB per photo)
- Browser compatibility
- Upload restrictions
- Storage costs

## How It Works

### 1. Upload Process

When a user uploads a Live Photo (HEIC/HEIF file):

1. **Detection**: The system detects HEIC/HEIF files by MIME type or file extension
2. **Storage**: The original format is recorded in the `originalFormat` field
3. **Conversion**: The file is automatically converted to JPEG format using the Sharp library
4. **Cleanup**: The original HEIC file is removed, keeping only the JPEG version

### 2. Supported Formats

The system accepts these Live Photo formats:

```typescript
// Primary Live Photo formats
'image/heic',
'image/heif',
'image/heic-sequence',
'image/heif-sequence',

// Additional Live Photo formats
'image/heic-sequence-1',
'image/heif-sequence-1',
```

### 3. Conversion Process

```typescript
// In Media collection afterChange hook
if (doc.mimeType === 'image/heic' || doc.mimeType === 'image/heif') {
  // Convert to JPEG with 90% quality
  await sharp(filePath)
    .jpeg({ quality: 90 })
    .toFile(outputPath)
  
  // Update document with new filename and MIME type
  await req.payload.update({
    collection: 'media',
    id: doc.id,
    data: {
      filename: newFilename,
      mimeType: 'image/jpeg',
    },
  })
}
```

## Benefits

### For Users
- ✅ **Seamless Upload**: Live Photos upload just like regular photos
- ✅ **No Manual Conversion**: Automatic conversion to JPEG
- ✅ **Better Compatibility**: Works across all browsers and devices
- ✅ **Faster Loading**: Smaller file sizes

### For Developers
- ✅ **Reduced Storage**: JPEG files are typically 50-70% smaller
- ✅ **Better Performance**: Faster uploads and downloads
- ✅ **Universal Compatibility**: No browser compatibility issues
- ✅ **Simplified Processing**: No need for HEIC-specific handling

## Technical Implementation

### Media Collection Updates

```typescript
// Added fields
{
  name: 'originalFormat',
  type: 'text',
  admin: {
    description: 'Original file format before conversion (e.g., HEIC for Live Photos)',
    readOnly: true,
  },
}

// Added hooks
beforeChange: [
  async ({ data, operation }) => {
    // Store original format for Live Photos
    if (operation === 'create' && (data.mimeType === 'image/heic' || data.mimeType === 'image/heif')) {
      data.originalFormat = data.mimeType
    }
    return data
  },
]

afterChange: [
  async ({ doc, operation, req }) => {
    // Handle Live Photo conversion to JPEG
    if (operation === 'create' && (doc.mimeType === 'image/heic' || doc.mimeType === 'image/heif')) {
      // Convert using Sharp library
      // Update document with new filename and MIME type
      // Remove original HEIC file
    }
  },
]
```

### API Routes

Both upload endpoints support Live Photos:

1. **`/api/media`** - General media upload
2. **`/api/mobile/upload/image`** - Mobile-specific upload

### File Validation

The system includes comprehensive validation for HEIC files:

```typescript
// HEIC/HEIF validation (ftyp box with HEIC)
if (mimeType.includes('heic') || mimeType.includes('heif')) {
  const ftypBox = buffer.indexOf(Buffer.from('ftyp'))
  const isValidHeic = ftypBox > 0 && (
    buffer.indexOf(Buffer.from('heic'), ftypBox) > ftypBox ||
    buffer.indexOf(Buffer.from('heif'), ftypBox) > ftypBox
  )
  return isValidHeic
}
```

## Testing

Use the test script to verify Live Photo support:

```bash
node test-live-photo-upload.js
```

This script:
- Creates a mock HEIC file
- Tests upload to both API endpoints
- Verifies conversion to JPEG
- Checks metadata preservation

## Dependencies

- **Sharp**: Image processing library for HEIC to JPEG conversion
- **FormData**: For file upload handling
- **Payload CMS**: For media collection management

## Configuration

### File Size Limits
- **Maximum**: 20MB (increased for mobile uploads)
- **Recommended**: 10MB or less for optimal performance

### Image Quality
- **JPEG Quality**: 90% (good balance of quality and file size)
- **Format**: JPEG (universally compatible)

## Troubleshooting

### Common Issues

1. **Sharp Library Not Found**
   ```bash
   npm install sharp
   ```

2. **HEIC Files Not Converting**
   - Check if Sharp is properly installed
   - Verify file permissions
   - Check server logs for conversion errors

3. **Upload Failures**
   - Ensure file size is under 20MB
   - Check MIME type validation
   - Verify authentication

### Debug Logging

The system includes comprehensive logging:

```typescript
console.log('📱 Converting Live Photo to JPEG:', doc.filename)
console.log('📱 Live Photo converted successfully to JPEG:', newFilename)
console.log('📱 Error converting Live Photo:', conversionError)
```

## Future Enhancements

- [ ] **Batch Processing**: Convert multiple Live Photos simultaneously
- [ ] **Quality Settings**: Allow users to choose JPEG quality
- [ ] **Format Options**: Support conversion to WebP or AVIF
- [ ] **Metadata Preservation**: Keep EXIF data during conversion
- [ ] **Progressive Enhancement**: Show conversion progress

## References

- [How to Disable Live Photos on iPhone](https://www.majorgeeks.com/content/page/how_to_disable_live_photos_on_your_iphone.html)
- [Turn Off Live Photo on iPhone Camera](https://lightroomguy.com/turn-off-live-photo-on-your-iphone-camera/)
- [How to Turn Off Live Photo Feature](https://www.businessinsider.com/guides/tech/how-to-turn-off-live-photo-on-iphone)

## Support

For issues with Live Photo uploads:

1. Check the server logs for conversion errors
2. Verify the Sharp library is installed
3. Test with the provided test script
4. Ensure file permissions are correct
5. Check file size limits 