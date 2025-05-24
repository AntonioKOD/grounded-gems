const CACHE_NAME = 'grounded-gems-v1';
const OFFLINE_PAGE = '/offline.html';

const urlsToCache = [
  '/',
  '/map',
  '/events',
  '/feed',
  '/notifications',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  OFFLINE_PAGE,
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache install failed:', error);
      })
  );
  
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all open clients
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other unsupported schemes
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.startsWith('safari-extension://') ||
      event.request.url.startsWith('edge-extension://')) {
    return;
  }

  // Skip API requests for specific handling
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return a basic offline response for API requests
          return new Response(
            JSON.stringify({ 
              error: 'Offline', 
              message: 'This feature requires an internet connection' 
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the new response - but handle errors gracefully
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache if the request and response are valid
                try {
                  cache.put(event.request, responseToCache);
                } catch (error) {
                  console.log('Failed to cache request:', event.request.url, error);
                }
              })
              .catch((error) => {
                console.log('Failed to open cache:', error);
              });

            return response;
          })
          .catch(() => {
            // Network failed, try to serve offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_PAGE);
            }
            
            // For other requests, just return a basic offline response
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  let title = 'Grounded Gems';
  let body = 'New notification from Grounded Gems!';
  let icon = '/icon-192.png';
  let data = {};

  if (event.data) {
    try {
      const pushData = event.data.json();
      title = pushData.title || title;
      body = pushData.body || body;
      icon = pushData.icon || icon;
      data = pushData.data || {};
    } catch (e) {
      body = event.data.text();
    }
  }

  const options = {
    body,
    icon,
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      ...data
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if the app is already open
        for (const client of clientList) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not already open
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
  // Close action doesn't need to do anything as notification is already closed
});

// Background sync event (for future offline functionality)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks here
      console.log('Background sync triggered')
    );
  }
}); 