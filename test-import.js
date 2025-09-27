// Test file to check imports
import('./lib/cache.ts').then(module => {
  console.log('Cache exports:', Object.keys(module));
  console.log('checkCacheHealth exists:', 'checkCacheHealth' in module);
}).catch(error => {
  console.error('Cache import error:', error.message);
});

import('./lib/database-indexes.ts').then(module => {
  console.log('Database-indexes exports:', Object.keys(module));
  console.log('createDatabaseIndexes exists:', 'createDatabaseIndexes' in module);
}).catch(error => {
  console.error('Database-indexes import error:', error.message);
});












