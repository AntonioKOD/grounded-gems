# Redirect Loop Prevention - Complete Solution

## 🚨 Problem: ERR_TOO_MANY_REDIRECTS Error

The `ERR_TOO_MANY_REDIRECTS` error occurs when the browser gets stuck in an infinite redirect loop. This commonly happens in web applications when:

1. **Authentication redirects** create circular patterns
2. **Middleware redirects** conflict with client-side navigation
3. **Multiple redirect sources** compete with each other
4. **State management issues** cause repeated redirects

## ✅ Solutions Implemented

### 1. **Middleware Redirect Loop Detection**

**File:** `middleware.ts`

**Problem:** Server-side middleware was causing infinite redirects for mobile apps and authentication flows.

**Solution:**
```typescript
// Redirect loop detection
const redirectHistory = new Map<string, { count: number; lastRedirect: number }>()
const MAX_REDIRECTS_PER_IP = 5
const REDIRECT_WINDOW_MS = 30000 // 30 seconds

function checkRedirectLoop(ip: string, pathname: string): boolean {
  // Track redirects per IP and path
  // Prevent redirects if too many occur in a short time window
}
```

**Key Changes:**
- ✅ **Loop Detection**: Track redirects per IP and path
- ✅ **Mobile Leniency**: Allow mobile browsers to handle their own auth
- ✅ **Capacitor Support**: Special handling for native mobile apps
- ✅ **Rate Limiting**: Prevent excessive redirects from same source

### 2. **Safe Navigation Utility**

**File:** `lib/redirect-loop-prevention.ts`

**Problem:** Multiple navigation methods were causing conflicts and loops.

**Solution:**
```typescript
export function safeNavigate(
  path: string, 
  router: any, 
  options: { force?: boolean; replace?: boolean } = {}
): boolean {
  // Check for potential loops before navigating
  // Track successful navigations
  // Provide fallback mechanisms
}
```

**Features:**
- ✅ **Loop Prevention**: Detect and prevent circular redirects
- ✅ **Path Tracking**: Monitor redirect history per path
- ✅ **Automatic Cleanup**: Remove old redirect records
- ✅ **Statistics**: Track redirect patterns for debugging

### 3. **Login Form Improvements**

**File:** `components/LoginForm.tsx`

**Problem:** Login form was causing redirect loops when users were already authenticated.

**Solution:**
```typescript
// Use safe navigation instead of direct router calls
safeNavigate(redirectPath, router)

// Better state management to prevent multiple redirects
const [hasRedirected, setHasRedirected] = useState(false)
```

**Key Changes:**
- ✅ **Safe Navigation**: Use `safeNavigate` utility
- ✅ **State Management**: Track redirect attempts
- ✅ **Router Consistency**: Use `router.push` instead of `window.location`
- ✅ **Loop Prevention**: Prevent multiple redirects for same user

### 4. **Protected Route Optimization**

**File:** `components/auth/protected-route.tsx`

**Problem:** Protected routes were causing infinite redirects to login.

**Solution:**
```typescript
// Only redirect if not already on login page
if (pathname !== '/login') {
  const redirectPath = `/login?redirect=${encodeURIComponent(pathname)}`
  safeNavigate(redirectPath, router)
}
```

**Key Changes:**
- ✅ **Path Checking**: Don't redirect if already on login page
- ✅ **Safe Navigation**: Use redirect prevention utility
- ✅ **State Tracking**: Track redirect attempts to prevent loops

### 5. **Authentication Context Improvements**

**File:** `context/user-context.tsx` and `hooks/use-auth.ts`

**Problem:** Authentication state changes were causing unnecessary redirects.

**Solution:**
```typescript
// Use router.push instead of router.replace
router.push("/login")

// Better circuit breaker pattern for auth checks
const circuitBreaker = {
  failures: 0,
  isOpen: false,
  canExecute(): boolean { /* ... */ }
}
```

**Key Changes:**
- ✅ **Navigation Consistency**: Use `router.push` throughout
- ✅ **Circuit Breaker**: Prevent excessive auth API calls
- ✅ **State Management**: Better handling of auth state changes

## 🔧 Configuration

### Redirect Loop Prevention Settings

```typescript
// In lib/redirect-loop-prevention.ts
const MAX_REDIRECTS_PER_PATH = 3        // Max redirects per path
const REDIRECT_WINDOW_MS = 30000        // 30 second window
const CLEANUP_INTERVAL_MS = 60000       // 1 minute cleanup

// In middleware.ts
const MAX_REDIRECTS_PER_IP = 5          // Max redirects per IP
const REDIRECT_WINDOW_MS = 30000        // 30 second window
```

### Mobile App Settings

```typescript
// Capacitor apps get special treatment
if (isCapacitorApp) {
  console.log(`📱 [Middleware] Capacitor app - allowing: ${pathname}`)
  return NextResponse.next()
}

// Mobile browsers are more lenient
if (isMobile) {
  console.log(`📱 [Middleware] Mobile browser - allowing: ${pathname}`)
  return NextResponse.next()
}
```

## 🚀 Usage Examples

### Safe Navigation in Components

```typescript
import { safeNavigate } from "@/lib/redirect-loop-prevention"

// Instead of router.push()
safeNavigate('/dashboard', router)

// Force navigation (bypass loop prevention)
safeNavigate('/login', router, { force: true })

// Use replace instead of push
safeNavigate('/profile', router, { replace: true })
```

### Clearing Redirect History

```typescript
import { clearAuthRedirectHistory } from "@/lib/redirect-loop-prevention"

// Clear auth-related redirect history
clearAuthRedirectHistory()

// Get redirect statistics
const stats = getRedirectPreventionStats()
console.log('Suspicious paths:', stats.suspiciousPaths)
```

## 🧪 Testing

### Manual Testing Checklist

1. **Login Flow**
   - [ ] Login with valid credentials → Should redirect to dashboard
   - [ ] Login when already authenticated → Should redirect without loops
   - [ ] Login with invalid credentials → Should stay on login page

2. **Protected Routes**
   - [ ] Access protected route when not authenticated → Should redirect to login
   - [ ] Access protected route when authenticated → Should allow access
   - [ ] Multiple rapid access attempts → Should not create loops

3. **Mobile Apps**
   - [ ] Capacitor app navigation → Should work without server redirects
   - [ ] Mobile browser navigation → Should be more lenient
   - [ ] Native app authentication → Should handle auth locally

4. **Admin Routes**
   - [ ] Admin access with valid token → Should allow access
   - [ ] Admin access without token → Should redirect to login
   - [ ] Admin access with wrong email → Should show access denied

### Automated Testing

```typescript
// Test redirect loop prevention
describe('Redirect Loop Prevention', () => {
  it('should prevent redirect loops', () => {
    // Test multiple rapid redirects to same path
    // Should prevent after MAX_REDIRECTS_PER_PATH attempts
  })

  it('should allow normal navigation', () => {
    // Test normal navigation flow
    // Should work without issues
  })

  it('should clear history after timeout', () => {
    // Test cleanup of old redirect records
    // Should reset after REDIRECT_WINDOW_MS
  })
})
```

## 📊 Monitoring

### Console Logs to Watch

```bash
# Normal operation
🔍 [Middleware] Processing: /dashboard
✅ [Middleware] Authenticated access to protected route: /dashboard

# Redirect prevention
🚫 [Redirect Prevention] Potential redirect loop detected for path: /login
🚫 [Safe Navigate] Redirect prevented to avoid loop: /login

# Mobile handling
📱 [Middleware] Capacitor app - allowing: /feed
📱 [Middleware] Mobile browser - allowing: /profile

# Cleanup
🧹 [Redirect Prevention] Cleaned up 3 old redirect records
```

### Metrics to Track

- **Redirect Loop Incidents**: Count of prevented loops
- **Mobile App Performance**: Navigation success rate
- **Authentication Flow**: Login redirect success rate
- **Middleware Performance**: Response times and redirect counts

## 🛠️ Troubleshooting

### Common Issues and Solutions

1. **Still Getting Redirect Loops**
   ```bash
   # Check browser console for redirect prevention logs
   # Clear browser cache and cookies
   # Check if multiple auth providers are conflicting
   ```

2. **Mobile App Navigation Issues**
   ```bash
   # Verify Capacitor configuration
   # Check if middleware is detecting mobile apps correctly
   # Ensure native auth is working properly
   ```

3. **Admin Access Problems**
   ```bash
   # Verify admin email in security config
   # Check token expiration
   # Ensure proper admin route protection
   ```

### Debug Commands

```typescript
// Get current redirect statistics
const stats = getRedirectPreventionStats()
console.log('Redirect stats:', stats)

// Clear all redirect history
redirectLoopPrevention.clearAllHistory()

// Check specific path history
const record = redirectLoopPrevention.getPathRecord('/login')
console.log('Login path record:', record)
```

## 🎯 Best Practices

1. **Always use safe navigation utilities** instead of direct router calls
2. **Test on multiple devices** including mobile browsers and native apps
3. **Monitor redirect patterns** in production for potential issues
4. **Clear redirect history** after successful authentication flows
5. **Use appropriate timeouts** for redirect loop detection
6. **Log redirect events** for debugging and monitoring

## 📈 Performance Impact

- **Reduced Server Load**: Fewer unnecessary redirects
- **Better User Experience**: Faster navigation without loops
- **Mobile Optimization**: Native app performance improvements
- **Debugging Capability**: Better visibility into redirect patterns

This comprehensive solution should eliminate `ERR_TOO_MANY_REDIRECTS` errors while maintaining security and providing a smooth user experience across all platforms. 