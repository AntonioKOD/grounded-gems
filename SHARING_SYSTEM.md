# Instagram-Style Post Sharing System

This document explains how the Instagram-style post sharing system works in Sacavia.

## Overview

The sharing system allows users to share posts via:
1. **Native sharing** (mobile devices) - uses the device's native share sheet
2. **Clipboard copying** (desktop) - copies the post URL to clipboard
3. **Direct links** - generates shareable URLs that open the post in a dedicated page

## Components

### 1. Dedicated Post Page
- **Location**: `/app/(frontend)/post/[postId]/page.tsx`
- **URL Format**: `https://yoursite.com/post/{postId}`
- **Features**:
  - Full post display with media carousel
  - Author information
  - Comments system
  - SEO-optimized metadata
  - Social media preview cards

### 2. Share Button Component
- **Location**: `/components/ui/share-button.tsx`
- **Features**:
  - Automatic native sharing detection
  - Clipboard fallback
  - Visual feedback (success state)
  - Haptic feedback on mobile
  - Customizable appearance

### 3. Share API Endpoint
- **Location**: `/app/api/posts/share/route.ts`
- **Features**:
  - Tracks share analytics
  - Updates share count
  - Returns shareable URL
  - Handles different share methods

### 4. Analytics Collection
- **Location**: `/collections/Analytics.ts`
- **Tracks**:
  - Share method (native, clipboard, link)
  - User agent and referrer
  - Timestamp and metadata
  - Post and user relationships

## Usage Examples

### Basic Share Button
```tsx
import ShareButton from '@/components/ui/share-button'

<ShareButton
  url={`${process.env.NEXT_PUBLIC_APP_URL}/post/${postId}`}
  title={`${authorName} on Sacavia`}
  text={postContent.substring(0, 100)}
/>
```

### Custom Share Button
```tsx
<ShareButton
  url={`${process.env.NEXT_PUBLIC_APP_URL}/post/${postId}`}
  title="Check this out!"
  text="Amazing content on Sacavia"
  variant="outline"
  size="lg"
  className="custom-share-btn"
  onShare={() => console.log('Post shared!')}
>
  Share Post
</ShareButton>
```

### Programmatic Sharing
```tsx
const handleShare = async () => {
  const postUrl = `${window.location.origin}/post/${post.id}`
  
  if (navigator.share) {
    await navigator.share({
      title: `${post.author.name} on Sacavia`,
      text: post.content.substring(0, 100),
      url: postUrl,
    })
  } else {
    await navigator.clipboard.writeText(postUrl)
    toast.success("Link copied!")
  }
}
```

## URL Structure

### Post URLs
- **Format**: `https://yoursite.com/post/{postId}`
- **Example**: `https://sacavia.com/post/68673db51c1fb4baa1c2156b`

### SEO Features
- Dynamic meta tags based on post content
- Open Graph tags for social media
- Twitter Card support
- Structured data for search engines

## Analytics Tracking

The system automatically tracks:
- **Share events** with method and metadata
- **User interactions** (likes, comments, views)
- **Device information** (user agent, referrer)
- **Timing data** for engagement analysis

## Mobile Optimization

### Native Sharing
- Uses `navigator.share()` API when available
- Provides rich preview with title, text, and URL
- Integrates with device share sheet

### Haptic Feedback
- Vibration feedback on successful shares
- Enhanced user experience on mobile devices

### Responsive Design
- Optimized layout for mobile viewing
- Touch-friendly interaction areas
- Fast loading with image optimization

## Security Considerations

### Access Control
- Public read access for shared posts
- User authentication for analytics
- Rate limiting on share endpoints

### Data Privacy
- Minimal data collection
- User consent for analytics
- GDPR-compliant tracking

## Future Enhancements

### Planned Features
1. **Social Media Integration**
   - Direct sharing to Facebook, Twitter, Instagram
   - Custom share cards for each platform

2. **Advanced Analytics**
   - Share attribution tracking
   - Viral coefficient calculation
   - Engagement funnel analysis

3. **Enhanced URLs**
   - Custom short URLs
   - QR code generation
   - Deep linking support

4. **Content Protection**
   - Watermarking for shared images
   - Download restrictions
   - Copyright protection

## Testing

### Manual Testing
1. Create a post with media
2. Click share button
3. Test native sharing on mobile
4. Test clipboard copying on desktop
5. Verify shared URL opens correctly
6. Check analytics tracking

### Automated Testing
```bash
# Test share API
curl -X POST http://localhost:3000/api/posts/share \
  -H "Content-Type: application/json" \
  -d '{"postId": "test-post-id", "userId": "test-user-id"}'

# Test post page
curl http://localhost:3000/post/test-post-id
```

## Environment Variables

Required environment variables:
```env
NEXT_PUBLIC_APP_URL=https://yoursite.com
DATABASE_URI=your-mongodb-connection-string
PAYLOAD_SECRET=your-payload-secret
```

## Troubleshooting

### Common Issues

1. **Native sharing not working**
   - Check if `navigator.share` is supported
   - Ensure HTTPS in production
   - Verify mobile device compatibility

2. **Analytics not tracking**
   - Check database connection
   - Verify Analytics collection is added to payload config
   - Check user authentication

3. **SEO metadata not showing**
   - Verify `generateMetadata` function
   - Check Open Graph tags
   - Test with social media debuggers

4. **Share count not updating**
   - Check API endpoint permissions
   - Verify post exists in database
   - Check for JavaScript errors

### Debug Commands
```bash
# Check if post exists
curl http://localhost:3000/api/posts/{postId}

# Test share endpoint
curl -X POST http://localhost:3000/api/posts/share \
  -H "Content-Type: application/json" \
  -d '{"postId": "test-id"}'

# Check analytics
curl http://localhost:3000/api/analytics
``` 