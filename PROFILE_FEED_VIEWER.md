# Profile Feed Viewer Implementation

A full-screen, Instagram-style viewer for browsing user posts with navigation, video handling, and proper URL routing.

## 🎯 Features

### Core Functionality
- **Full-screen modal overlay** with dimmed background and scroll lock
- **Grid tile integration** - clicking any tile opens the viewer on that post
- **Navigation system** - arrow keys, swipe gestures, and navigation buttons
- **Video handling** - autoplay when in view, pause when off-screen
- **URL routing** - shallow navigation with `/u/[username]/p/[postId]` URLs
- **Deep linking** - direct URLs open the viewer on the correct post
- **Infinite scroll** - loads more posts as you navigate beyond loaded items

### User Experience
- **Smooth transitions** between posts
- **Touch/swipe support** for mobile devices
- **Keyboard navigation** (Arrow keys, ESC to close)
- **Browser integration** - back/forward buttons work correctly
- **Focus management** - proper accessibility with ARIA labels
- **Loading states** - graceful handling of loading and errors

## 🏗️ Architecture

### Components

#### `ProfileFeedViewer.tsx`
The main viewer component that handles:
- Full-screen modal display
- Post navigation (previous/next)
- Video autoplay/pause logic
- Touch/swipe gesture handling
- URL state management
- Loading more posts via infinite scroll

#### `ProfileGrid.tsx` (Updated)
Enhanced grid component that:
- Integrates with the viewer
- Handles tile clicks to open viewer
- Manages viewer state and URL updates
- Provides initial data to the viewer

#### `/app/u/[username]/p/[postId]/page.tsx`
Deep linking route that:
- Fetches initial feed data
- Searches for the specific post
- Opens the viewer on the correct post
- Handles browser navigation

### Data Flow

1. **Grid Interaction**: User clicks a tile → `handleTileClick` → URL update → Viewer opens
2. **Deep Linking**: Direct URL visit → Page fetches data → Finds post → Opens viewer
3. **Navigation**: Arrow keys/swipe → `handlePrevious/Next` → Index update → URL sync
4. **Infinite Scroll**: Navigate beyond loaded items → `loadMoreItems` → Append to list

## 🎮 User Interactions

### Navigation Methods
- **Arrow Keys**: Left/Right arrows navigate between posts
- **Swipe Gestures**: Touch devices support left/right swipe
- **Navigation Buttons**: Clickable chevron buttons on sides
- **ESC Key**: Closes the viewer and returns to grid

### Touch/Swipe Handling
- **Threshold**: 50px minimum swipe distance
- **Direction**: Horizontal swipes only (ignores vertical)
- **Prevention**: Prevents default scroll during swipe detection

### Video Behavior
- **Autoplay**: Videos play automatically when post becomes active
- **Pause**: Videos pause when navigating away
- **Controls**: HTML5 video controls available
- **Fallback**: Thumbnail shown if video fails to load

## 🔗 URL Routing

### Shallow Navigation
- **No Page Reloads**: Uses `window.history.pushState/replaceState`
- **URL Updates**: `/u/[username]/p/[postId]` format
- **Browser Integration**: Back/forward buttons work correctly
- **State Persistence**: Maintains scroll position when closing

### Deep Linking
- **Direct Access**: URLs like `/u/antonio_kodheli/p/123` work directly
- **Post Search**: If post not in initial data, loads more pages to find it
- **Error Handling**: Shows "Post unavailable" if not found

## ♿ Accessibility

### ARIA Support
- **Modal Role**: `role="dialog"` with `aria-modal="true"`
- **Labels**: `aria-labelledby` and `aria-label` attributes
- **Focus Management**: Focus trapped within modal
- **Screen Readers**: Semantic HTML structure

### Keyboard Navigation
- **Tab Order**: Logical focus flow
- **Escape**: Closes modal and returns focus
- **Arrow Keys**: Navigate between posts
- **Enter/Space**: Activate buttons

## 🎨 Styling & Layout

### Visual Design
- **Full Screen**: Covers entire viewport with black background
- **Centered Content**: Posts centered with max-width constraints
- **Gradient Header**: Subtle gradient overlay for controls
- **Responsive**: Works on all screen sizes

### Animation & Transitions
- **Smooth Scaling**: Grid tiles scale on hover
- **Fade Effects**: Subtle hover overlays
- **Loading States**: Spinner animations for loading
- **Transition Timing**: 200ms ease-out transitions

## 🔧 Technical Implementation

### State Management
```typescript
interface ViewerState {
  items: ProfileFeedItem[]        // All loaded posts
  cursor: string | null           // Pagination cursor
  activeIndex: number             // Current post index
  isLoading: boolean              // Loading more posts
  error: string | null            // Error state
  hasMore: boolean                // More posts available
}
```

### Performance Optimizations
- **Lazy Loading**: Images and videos load on demand
- **Prefetching**: Neighbor posts preloaded (±1)
- **Debouncing**: Navigation events debounced
- **Memory Management**: Video refs cleaned up properly

### Error Handling
- **Network Errors**: Retry mechanism with user feedback
- **Missing Posts**: "Post unavailable" state with navigation
- **API Failures**: Graceful degradation with previous content
- **Loading States**: Clear loading indicators

## 🧪 Testing

### Test Page
Visit `/test-profile-viewer` to test all features:
- Grid tile interactions
- Navigation methods
- Video playback
- URL routing
- Deep linking
- Error states

### Test Scenarios
1. **Basic Navigation**: Click tile → Navigate with arrows → Close with ESC
2. **Touch Devices**: Swipe left/right to navigate
3. **Deep Linking**: Visit direct post URL
4. **Infinite Scroll**: Navigate beyond loaded posts
5. **Error Handling**: Test with invalid post IDs
6. **Browser Navigation**: Use back/forward buttons

## 🚀 Usage

### Basic Integration
```tsx
import ProfileGrid from '@/components/ProfileGrid'

export default function ProfilePage() {
  return (
    <div>
      <h1>@username</h1>
      <ProfileGrid username="username" />
    </div>
  )
}
```

### Direct Post Access
```tsx
// URL: /u/username/p/postId
// Automatically opens viewer on the specified post
```

### Custom Viewer
```tsx
import ProfileFeedViewer from '@/components/ProfileFeedViewer'

<ProfileFeedViewer
  username="username"
  initialItems={posts}
  initialCursor={cursor}
  isOpen={isViewerOpen}
  onClose={handleClose}
  initialPostId="postId"
/>
```

## 📱 Mobile Support

### Touch Gestures
- **Swipe Detection**: Horizontal swipe threshold of 50px
- **Gesture Prevention**: Prevents default scroll during swipes
- **Responsive Design**: Optimized for mobile viewports

### Performance
- **Touch Events**: Optimized touch event handling
- **Memory Usage**: Efficient video memory management
- **Battery Life**: Videos pause when off-screen

## 🔮 Future Enhancements

### Potential Features
- **Zoom/Pinch**: Image zoom functionality
- **Comments**: Inline comment system
- **Likes**: Like/unlike functionality
- **Sharing**: Share individual posts
- **Bookmarks**: Save posts for later
- **Analytics**: Track viewer interactions

### Performance Improvements
- **Virtual Scrolling**: For very large post lists
- **Image Optimization**: WebP/AVIF support
- **Caching**: Intelligent post caching
- **Preloading**: Predictive post loading

## 🐛 Known Issues

### Current Limitations
- **Video Controls**: Basic HTML5 controls only
- **Image Zoom**: No zoom functionality yet
- **Comments**: No inline comment system
- **Likes**: No like/unlike functionality

### Browser Compatibility
- **Touch Events**: Requires modern browser support
- **Video Autoplay**: May be restricted by browser policies
- **History API**: Requires modern browser support

## 📚 Dependencies

### Required Packages
- `next`: App Router and navigation
- `react`: Component framework
- `lucide-react`: Icons (X, ChevronLeft, ChevronRight)
- `tailwindcss`: Styling framework

### Browser APIs
- `IntersectionObserver`: Infinite scroll detection
- `History API`: URL state management
- `Touch Events`: Swipe gesture handling
- `HTML5 Video`: Video playback control

---

This implementation provides a complete Instagram-style profile feed viewer with all the requested features including navigation, video handling, URL routing, and accessibility support.

