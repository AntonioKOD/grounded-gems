// Simple test to verify map functionality with mock locations
const mockLocations = [
  {
    id: '1',
    name: 'Boston Common',
    description: 'Historic park in downtown Boston',
    shortDescription: "America's oldest public park",
    latitude: 42.3601,
    longitude: -71.0589,
    address: '139 Tremont St, Boston, MA 02111',
    categories: ['Parks'],
    status: 'published',
    isFeatured: true,
    isVerified: true,
    averageRating: 4.5,
    reviewCount: 123
  },
  {
    id: '2',
    name: 'MIT Campus',
    description: 'Massachusetts Institute of Technology campus',
    shortDescription: 'World-renowned technology institute',
    latitude: 42.3601,
    longitude: -71.0942,
    address: '77 Massachusetts Ave, Cambridge, MA 02139',
    categories: ['Education'],
    status: 'published',
    isFeatured: true,
    isVerified: true,
    averageRating: 4.8,
    reviewCount: 89
  },
  {
    id: '3',
    name: 'Harvard University',
    description: 'Historic Ivy League university',
    shortDescription: "America's oldest institution of higher education",
    latitude: 42.3770,
    longitude: -71.1167,
    address: 'Harvard Yard, Cambridge, MA 02138',
    categories: ['Education'],
    status: 'published',
    isFeatured: true,
    isVerified: true,
    averageRating: 4.7,
    reviewCount: 156
  },
  {
    id: '4',
    name: 'Fenway Park',
    description: 'Historic baseball stadium, home of the Boston Red Sox',
    shortDescription: "America's Most Beloved Ballpark",
    latitude: 42.3467,
    longitude: -71.0972,
    address: '4 Yawkey Way, Boston, MA 02215',
    categories: ['Sports'],
    status: 'published',
    isFeatured: true,
    isVerified: true,
    averageRating: 4.6,
    reviewCount: 234
  },
  {
    id: '5',
    name: 'Boston Tea Party Ships & Museum',
    description: 'Interactive museum and historic ships',
    shortDescription: 'Relive the famous Boston Tea Party',
    latitude: 42.3520,
    longitude: -71.0552,
    address: '306 Congress St, Boston, MA 02210',
    categories: ['Museums'],
    status: 'published',
    isFeatured: true,
    isVerified: true,
    averageRating: 4.4,
    reviewCount: 78
  }
]

console.log('Mock locations for testing:')
console.log(JSON.stringify(mockLocations, null, 2))
console.log(`\nTotal locations: ${mockLocations.length}`)
console.log('✅ Mock data ready for testing') 