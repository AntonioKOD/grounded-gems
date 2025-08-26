# Notification Troubleshooting Guide

## Overview
This guide helps you troubleshoot notification issues in the Sacavia app. The notification system includes both browser notifications and push notifications.

## Quick Diagnostic Steps

### 1. Check Browser Support
```javascript
// Open browser console and run:
console.log('Notifications supported:', 'Notification' in window)
console.log('Service Worker supported:', 'serviceWorker' in navigator)
console.log('Push Manager supported:', 'PushManager' in window)
```

### 2. Check Permission Status
```javascript
// Check current permission status:
console.log('Permission status:', Notification.permission)
```

### 3. Check Service Worker Registration
```javascript
// Check if service worker is registered:
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service worker registrations:', registrations)
})
```

## Common Issues and Solutions

### Issue 1: "Notifications not supported"
**Symptoms:**
- Error message: "Notifications not supported in this browser"
- No notification permission prompt appears

**Causes:**
- Browser doesn't support the Notification API
- Running on HTTP instead of HTTPS (notifications require secure context)
- Browser is outdated

**Solutions:**
1. Use a modern browser (Chrome, Firefox, Safari, Edge)
2. Ensure you're on HTTPS
3. Check browser console for specific error messages

### Issue 2: "Permission denied"
**Symptoms:**
- Permission status shows "denied"
- No notifications appear
- User previously blocked notifications

**Solutions:**
1. **Chrome/Edge:**
   - Click the lock icon in the address bar
   - Change "Notifications" to "Allow"
   - Refresh the page

2. **Firefox:**
   - Click the shield icon in the address bar
   - Change "Notifications" to "Allow"
   - Refresh the page

3. **Safari:**
   - Go to Safari > Preferences > Websites > Notifications
   - Find sacavia.com and change to "Allow"
   - Refresh the page

4. **Mobile browsers:**
   - Go to browser settings
   - Find site permissions or notifications
   - Allow notifications for sacavia.com

### Issue 3: "Service worker registration failed"
**Symptoms:**
- Console error: "SW registration failed"
- Notifications don't work even with permission granted

**Causes:**
- Service worker file not found
- Network issues
- Browser security restrictions

**Solutions:**
1. Check if `/sw.js` file exists in the public directory
2. Clear browser cache and reload
3. Check network tab for 404 errors on service worker
4. Try in incognito/private mode

### Issue 4: "Push subscription failed"
**Symptoms:**
- Error: "Failed to create push subscription"
- Push notifications don't work

**Causes:**
- VAPID keys not configured
- Service worker not properly registered
- Browser doesn't support push notifications

**Solutions:**
1. Check environment variables:
   ```bash
   VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   ```

2. Verify VAPID keys are valid
3. Check browser console for specific push errors

### Issue 5: "Notifications appear but don't work properly"
**Symptoms:**
- Notifications show but clicking doesn't work
- Wrong notification content
- Notifications don't close

**Solutions:**
1. Check service worker event handlers
2. Verify notification click handlers are properly set
3. Check notification data structure

## Testing Notifications

### 1. Browser Notification Test
```javascript
// Test basic browser notification:
if (Notification.permission === 'granted') {
  new Notification('Test', {
    body: 'This is a test notification',
    icon: '/icon-192.png'
  })
}
```

### 2. Push Notification Test
Use the test button in notification settings or call the API:
```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Test push notification"}'
```

### 3. Service Worker Test
```javascript
// Check service worker status:
navigator.serviceWorker.ready.then(registration => {
  console.log('Service worker ready:', registration)
})
```

## Environment Setup

### Required Environment Variables
```bash
# For web push notifications
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here

# For database
DATABASE_URI=your_mongodb_uri

# For authentication
PAYLOAD_SECRET=your_secret
```

### Generating VAPID Keys
```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

## Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed console logs for:
- Service worker registration
- Notification permission requests
- Push subscription creation
- Notification sending attempts

## Browser-Specific Issues

### Chrome
- Check chrome://settings/content/notifications
- Ensure site is not blocked
- Check for any extensions blocking notifications

### Firefox
- Check about:preferences#privacy > Permissions
- Ensure notifications are allowed
- Check for any privacy settings blocking notifications

### Safari
- Check Safari > Preferences > Websites > Notifications
- Ensure site is allowed
- Check for any content blockers

### Mobile Browsers
- Check browser settings for site permissions
- Ensure notifications are enabled for the browser
- Check device notification settings

## Server-Side Issues

### Check API Endpoints
1. `/api/notifications/vapid-public-key` - Should return VAPID public key
2. `/api/notifications/register-push-subscription` - Should accept POST requests
3. `/api/notifications/test` - Should send test notifications

### Check Database Collections
1. `push-subscriptions` - Should store user subscriptions
2. `users` - Should have user records
3. `notifications` - Should store notification history

### Check Logs
Look for errors in:
- Server console logs
- Browser console logs
- Network tab for failed requests

## Performance Issues

### Too Many Notifications
- Implement notification batching
- Add rate limiting
- Use notification tags to prevent duplicates

### Slow Notification Delivery
- Check server performance
- Optimize database queries
- Use background workers for notification sending

## Security Considerations

### VAPID Keys
- Keep private key secure
- Rotate keys regularly
- Use environment variables

### User Privacy
- Respect user preferences
- Allow users to opt out
- Don't send sensitive data in notifications

## Getting Help

If you're still experiencing issues:

1. **Check the console logs** for specific error messages
2. **Verify your environment setup** matches the requirements
3. **Test in different browsers** to isolate browser-specific issues
4. **Check the network tab** for failed API requests
5. **Review the service worker** implementation

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Notifications not supported" | Browser doesn't support API | Use modern browser |
| "Permission denied" | User blocked notifications | Reset browser permissions |
| "Service worker registration failed" | SW file missing/network error | Check file exists and network |
| "VAPID key not available" | Environment variable missing | Set VAPID keys |
| "Push subscription failed" | Browser doesn't support push | Use supported browser |

## Testing Checklist

- [ ] Browser supports notifications
- [ ] Running on HTTPS
- [ ] Permission granted
- [ ] Service worker registered
- [ ] VAPID keys configured
- [ ] Push subscription created
- [ ] Test notification works
- [ ] Click handlers work
- [ ] Notifications close properly

