# ProfileGrid Component

## Overview

The `ProfileGrid` component is a reusable React component that renders a responsive 3-column square grid of user posts with infinite scroll functionality. It consumes the normalized profile feed API and provides an Instagram-style media grid experience.

## Features

### ✅ Core Functionality
- **3-column responsive grid** with square aspect ratio tiles
- **Infinite scroll** using cursor-based pagination
- **Video overlay badges** (▶︎) for video posts
- **Loading states** with skeleton placeholders
- **Error handling** with retry functionality
- **Hover effects** on desktop (subtle zoom)

### ✅ API Integration
- Consumes `/api/profile/[username]/feed` endpoint
- Handles normalized media structure
- Supports cursor-based pagination
- Client-side data fetching (no SSR blocking)
- Proper TypeScript types

### ✅ UX/UI Details
- Square tiles with consistent aspect ratio
- Subtle hover zoom effect on desktop
- Loading placeholders during initial load
- "Loading more..." indicator during pagination
- "You've reached the end" message
- Empty state handling
- Error state with retry button

## Usage

### Basic Usage

```tsx
import ProfileGrid from '@/components/ProfileGrid'

export default function ProfilePage() {
  return (
    <div>
      <h1>User Profile</h1>
      <ProfileGrid username="antonio_kodheli" />
    </div>
  )
}
```

### With Custom Styling

```tsx
import ProfileGrid from '@/components/ProfileGrid'

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <ProfileGrid 
        username="antonio_kodheli" 
        className="max-w-2xl mx-auto"
      />
    </div>
  )
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `username` | `string` | ✅ | - | The username to fetch posts for |
| `className` | `string` | ❌ | `''` | Additional CSS classes for the container |

## Component Structure

### Main Components

1. **ProfileGrid** - Main container component
2. **GridTile** - Individual post tile component
3. **VideoBadge** - Video overlay badge component
4. **GridPlaceholder** - Loading skeleton component

### State Management

```tsx
const [items, setItems] = useState<ProfileFeedItem[]>([])
const [nextCursor, setNextCursor] = useState<string | null>(null)
const [loading, setLoading] = useState(true)
const [loadingMore, setLoadingMore] = useState(false)
const [error, setError] = useState<string | null>(null)
const [hasMore, setHasMore] = useState(true)
```

## API Integration

### Data Fetching

The component fetches data from the normalized profile feed API:

```tsx
const fetchFeed = useCallback(async (cursor: string | null = null, isLoadMore = false) => {
  const params = new URLSearchParams({
    take: '24',
    ...(cursor && { cursor })
  })

  const response = await fetch(`/api/profile/${username}/feed?${params}`)
  const data: ProfileFeedResponse = await response.json()
  
  // Handle response...
}, [username])
```

### Infinite Scroll

Uses Intersection Observer API for efficient infinite scroll:

```tsx
useEffect(() => {
  observerRef.current = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && nextCursor) {
        fetchFeed(nextCursor, true)
      }
    },
    {
      rootMargin: '100px', // Start loading when 100px away from bottom
      threshold: 0.1
    }
  )
}, [hasMore, loadingMore, nextCursor, fetchFeed])
```

## Styling

### Grid Layout

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem; /* 8px */
}
```

### Tile Styling

```css
.aspect-square {
  aspect-ratio: 1 / 1;
}

.hover\:scale-105:hover {
  transform: scale(1.05);
}

.transition-transform {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
```

### Video Badge

```css
.video-badge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-icon {
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 9999px;
  padding: 0.5rem;
  backdrop-filter: blur(4px);
}
```

## TypeScript Types

### Core Types

```tsx
interface MediaItem {
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  durationSec?: number
}

interface CoverImage {
  type: 'IMAGE' | 'VIDEO'
  url: string
}

interface ProfileFeedItem {
  id: string
  caption: string
  createdAt: string
  cover: CoverImage | null
  media: MediaItem[]
}

interface ProfileFeedResponse {
  items: ProfileFeedItem[]
  nextCursor: string | null
}
```

## Navigation

### Post Links

Each tile links to the post detail page:

```tsx
<Link href={`/u/${username}/p/${item.id}`}>
  {/* Tile content */}
</Link>
```

### Route Structure

- **Grid tiles**: `/u/[username]/p/[postId]`
- **Test page**: `/test-profile-grid`

## Performance Optimizations

### Image Optimization

Uses Next.js Image component with proper sizing:

```tsx
<Image
  src={item.cover.url}
  alt=""
  fill
  className="object-cover"
  sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
  priority={false}
/>
```

### Intersection Observer

Efficient infinite scroll without scroll event listeners:

```tsx
const observerRef = useRef<IntersectionObserver | null>(null)
const loadMoreRef = useRef<HTMLDivElement | null>(null)
```

### Memoization

Uses `useCallback` for stable function references:

```tsx
const fetchFeed = useCallback(async (cursor: string | null = null, isLoadMore = false) => {
  // Fetch logic
}, [username])
```

## Error Handling

### Network Errors

```tsx
try {
  const response = await fetch(`/api/profile/${username}/feed?${params}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status}`)
  }
  
  const data: ProfileFeedResponse = await response.json()
  // Handle success...
} catch (err) {
  console.error('Error fetching profile feed:', err)
  setError(err instanceof Error ? err.message : 'Failed to load feed')
}
```

### Error UI

```tsx
if (error) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Failed to load posts</p>
        <button
          onClick={() => fetchFeed()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
```

## Loading States

### Initial Loading

```tsx
if (loading) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 12 }).map((_, index) => (
        <GridPlaceholder key={index} />
      ))}
    </div>
  )
}
```

### Loading More

```tsx
{loadingMore && (
  <div className="flex justify-center py-8">
    <div className="flex items-center space-x-2 text-gray-500">
      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      <span>Loading more posts...</span>
    </div>
  </div>
)}
```

## Accessibility

### ARIA Labels

```tsx
<svg 
  className="w-6 h-6 text-white" 
  fill="currentColor" 
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <path d="M8 5v14l11-7z" />
</svg>
```

### Alt Text

```tsx
<Image
  src={item.cover.url}
  alt="" // Empty alt text for decorative tiles as specified
  fill
  className="object-cover"
/>
```

## Testing

### Test Page

Visit `/test-profile-grid` to test the component with real data.

### Test Features

- ✅ 3-column grid layout
- ✅ Video overlay badges
- ✅ Infinite scroll functionality
- ✅ Loading states
- ✅ Error handling
- ✅ Hover effects
- ✅ Navigation links

## Browser Support

- **Modern browsers** with Intersection Observer API support
- **Fallback** for older browsers (graceful degradation)
- **Mobile responsive** design
- **Touch-friendly** interactions

## Dependencies

- **Next.js 14+** - For Image component and routing
- **React 18+** - For hooks and concurrent features
- **Tailwind CSS** - For styling
- **TypeScript** - For type safety

## Future Enhancements

Potential improvements for future versions:

- **Lazy loading** for better performance
- **Virtual scrolling** for large datasets
- **Image preloading** for smoother UX
- **Keyboard navigation** support
- **Swipe gestures** on mobile
- **Pull-to-refresh** functionality
- **Analytics tracking** for engagement
- **Customizable grid columns** (2, 3, 4 columns)
- **Filtering and sorting** options
- **Batch operations** (like, save, share)

## Troubleshooting

### Common Issues

1. **Posts not loading**: Check if the username exists and has posts
2. **Infinite scroll not working**: Verify the API returns `nextCursor`
3. **Images not displaying**: Check if media URLs are absolute
4. **Video badges not showing**: Ensure video posts have `cover.type === 'VIDEO'`

### Debug Mode

Enable debug logging by adding to the component:

```tsx
console.log('ProfileGrid Debug:', {
  username,
  itemsCount: items.length,
  nextCursor,
  hasMore,
  loading,
  loadingMore,
  error
})
```

## Integration Examples

### In Profile Page

```tsx
import ProfileGrid from '@/components/ProfileGrid'

export default function ProfilePage({ params }: { params: { username: string } }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">@{params.username}</h1>
        <p className="text-gray-600">Posts</p>
      </div>
      
      <ProfileGrid username={params.username} />
    </div>
  )
}
```

### In Dashboard

```tsx
import ProfileGrid from '@/components/ProfileGrid'

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
        <ProfileGrid username="current_user" className="max-h-96 overflow-y-auto" />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Other Content</h2>
        {/* Other dashboard content */}
      </div>
    </div>
  )
}
```

The ProfileGrid component is now ready for production use and provides a robust, accessible, and performant solution for displaying user posts in a grid format with infinite scroll functionality.

