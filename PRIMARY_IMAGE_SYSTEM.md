# Primary Image System for Sacavia

## 🎯 Overview

The Primary Image System ensures that every location on Sacavia has a consistent, high-quality first image that represents the location across all platforms and interfaces. This system automatically manages image ordering, primary image selection, and fallback handling.

## 🏗️ Architecture

### Database Schema
```typescript
interface Location {
  featuredImage?: MediaItem | string    // Primary image displayed first
  gallery?: Array<{
    image: MediaItem | string
    caption?: string
    isPrimary?: boolean               // Override featuredImage
    order?: number                    // Display order (0 = first)
    altText?: string                  // Accessibility
    tags?: Array<{ tag: string }>     // Categorization
  }>
  imageUrl?: string                   // Legacy support
}
```

### Priority System
The system follows this priority order for determining the primary image:

1. **Featured Image** - Explicitly set primary image
2. **Primary Gallery Image** - Gallery image marked with `isPrimary: true`
3. **First Gallery Image** - First image in ordered gallery
4. **Legacy Image URL** - Backward compatibility
5. **Fallback Placeholder** - Default placeholder image

## 🔄 Automatic Management

### Backend Hooks (collections/Locations.ts)
- **Before Save**: Automatically manages image ordering and primary selection
- **Validation**: Ensures data consistency and proper image relationships
- **Order Management**: Maintains sequential ordering of gallery images

```typescript
// Automatic rules applied on save:
1. Gallery images sorted by 'order' field
2. If gallery image marked as primary → set as featuredImage
3. If no featuredImage and gallery exists → first gallery image becomes primary
4. All gallery images get sequential order values (0, 1, 2, ...)
```

## 🛠️ Utility Functions

### Core Functions (lib/image-utils.ts)

#### `getPrimaryImageUrl(location, fallback?)`
Returns the URL of the primary image following the priority system.

```typescript
const primaryUrl = getPrimaryImageUrl(location, '/custom-fallback.jpg')
```

#### `getLocationImages(location)`
Returns all images in proper display order with metadata.

```typescript
const images = getLocationImages(location)
// Returns: [{ url, caption, altText, isPrimary, order, tags }, ...]
```

#### `getOptimizedImageUrl(imageUrl, size)`
Returns optimized image URL for different use cases.

```typescript
const optimizedUrl = getOptimizedImageUrl(imageUrl, 'card')
// Sizes: 'thumbnail', 'card', 'hero', 'full'
```

#### `validateLocationImages(location)`
Validates image configuration and returns validation results.

```typescript
const validation = validateLocationImages(location)
// Returns: { isValid, errors, hasPrimaryImage, imageCount }
```

## 🎨 Frontend Integration

### React Hook
```typescript
import { useLocationImage } from '@/lib/image-utils'

function LocationCard({ location }) {
  const {
    primaryImage,      // Primary image URL
    allImages,         // All images in order
    validation,        // Validation status
    getOptimized,      // Get optimized size
    getAltText         // Generate alt text
  } = useLocationImage(location)

  return (
    <img 
      src={getOptimized('card')} 
      alt={getAltText(0)}
      className="w-full h-48 object-cover"
    />
  )
}
```

### Component Usage
All location cards and displays now automatically use the primary image system:

```typescript
// Mobile Location Card
import { getPrimaryImageUrl, getOptimizedImageUrl } from '@/lib/image-utils'

const imageUrl = getPrimaryImageUrl(location)
const optimizedUrl = getOptimizedImageUrl(imageUrl, 'card')
```

## 🔧 Business Dashboard

### Image Manager Component
The `ImageManager` component provides businesses with:

- **Drag & Drop Reordering** - Visual image ordering
- **Primary Image Selection** - Click star to set primary
- **Metadata Management** - Captions, alt text, tags
- **Upload Management** - Batch upload with positioning
- **Validation Feedback** - Real-time validation status

### Business Controls
- **Set Primary**: Star button to designate primary image
- **Reorder**: Drag and drop to change display order
- **Edit Metadata**: Add captions, alt text, and categorization tags
- **Bulk Actions**: Upload multiple images, bulk metadata updates

## 🌐 API Endpoints

### GET /api/locations/[id]/images
Retrieve location images with validation

```json
{
  "featuredImage": { "url": "...", "alt": "..." },
  "gallery": [...],
  "validation": {
    "isValid": true,
    "errors": [],
    "hasPrimaryImage": true,
    "imageCount": 5
  }
}
```

### PATCH /api/locations/[id]/images
Update location images

```json
{
  "action": "set_primary",
  "imageId": "gallery-123",
  "gallery": [...]
}
```

Available actions:
- `reorder` - Change image order
- `set_primary` - Set primary image
- `update_metadata` - Update captions/alt text
- `delete_image` - Remove image
- `bulk_update` - Update multiple images

### POST /api/locations/[id]/images
Upload new images

```typescript
const formData = new FormData()
formData.append('images', file1)
formData.append('images', file2)
formData.append('position', 'start') // 'start', 'end', or index

fetch(`/api/locations/${locationId}/images`, {
  method: 'POST',
  body: formData
})
```

## 📱 Mobile Optimization

### Image Sizes
Predefined sizes optimized for different use cases:

```typescript
export const IMAGE_SIZES = {
  THUMBNAIL: { width: 150, height: 150 },    // Profile pics, small previews
  CARD: { width: 400, height: 300 },         // Location cards, listings
  HERO: { width: 1200, height: 600 },        // Hero sections, banners
  MOBILE_CARD: { width: 300, height: 225 }   // Mobile-specific cards
}
```

### Performance Features
- **Lazy Loading** - Images load only when needed
- **Size Optimization** - Automatic size selection based on context
- **Fallback Handling** - Graceful degradation for missing images
- **Caching** - Optimized caching strategies for frequently accessed images

## 🔍 Business Benefits

### For Business Owners
1. **Professional Appearance** - Consistent, high-quality first impressions
2. **Easy Management** - Intuitive drag-and-drop interface
3. **SEO Benefits** - Proper alt text and metadata for search engines
4. **Mobile Optimization** - Images optimized for all device sizes

### For Platform
1. **Consistent UX** - Uniform image display across all interfaces
2. **Performance** - Optimized loading and caching
3. **Accessibility** - Proper alt text and ARIA labels
4. **Scalability** - Automated management reduces manual overhead

## 🛡️ Validation & Error Handling

### Automatic Validation
```typescript
const validation = validateLocationImages(location)

if (!validation.isValid) {
  console.log('Issues found:', validation.errors)
  // Example errors:
  // - "Featured image URL is missing"
  // - "First gallery image should be marked as primary"
  // - "Gallery image 3 is missing URL"
}
```

### Error Recovery
- **Missing Images** - Automatic fallback to placeholder
- **Broken URLs** - Validation and replacement with working images
- **Order Conflicts** - Automatic reordering based on order field
- **Orphaned Primary Flags** - Cleanup of inconsistent primary markers

## 🔮 Future Enhancements

### Planned Features
1. **AI Image Analysis** - Automatic tagging and quality scoring
2. **Dynamic Optimization** - Context-aware image selection
3. **A/B Testing** - Test different primary images for engagement
4. **Bulk Import** - Import images from social media, Google My Business
5. **Analytics** - Track image performance and user engagement

### Business Premium Features
1. **Professional Photography** - Connect with local photographers
2. **Custom Watermarking** - Brand protection and attribution
3. **Advanced Analytics** - Detailed image performance metrics
4. **Bulk Management** - Tools for managing multiple locations

## 📋 Implementation Checklist

### Backend ✅
- [x] Updated Locations collection schema
- [x] Added beforeChange hooks for automatic management
- [x] Created image utility functions
- [x] Built comprehensive API endpoints
- [x] Added validation and error handling

### Frontend ✅
- [x] Updated mobile location cards
- [x] Created business image manager component
- [x] Integrated utility functions across components
- [x] Added responsive image handling

### Business Tools ✅
- [x] Drag & drop image reordering
- [x] Primary image selection interface
- [x] Metadata editing capabilities
- [x] Validation feedback system

### Testing 🟡
- [ ] Unit tests for utility functions
- [ ] Integration tests for API endpoints
- [ ] UI tests for image manager component
- [ ] Performance tests for image loading

### Documentation ✅
- [x] Complete system documentation
- [x] API documentation
- [x] Business user guides
- [x] Developer integration guides

## 🎉 Summary

The Primary Image System ensures that **the first image for a location is always consistently set and displayed** across Sacavia. Through automatic management, intelligent fallbacks, and business-friendly tools, locations maintain professional appearances while reducing manual management overhead.

Key benefits:
- **🎯 Consistency**: Every location has a proper primary image
- **🚀 Performance**: Optimized loading for all device types  
- **💼 Business-Friendly**: Easy management tools for location owners
- **🔧 Developer-Friendly**: Simple utilities and comprehensive APIs
- **📱 Mobile-Optimized**: Perfect display on all screen sizes
- **♿ Accessible**: Proper alt text and ARIA compliance 