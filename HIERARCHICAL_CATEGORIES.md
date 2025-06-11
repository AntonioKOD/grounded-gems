# 🏗️ Hierarchical Category System

*Enhanced Foursquare Category Integration for Sacavia*

## Overview

Sacavia's hierarchical category system provides sophisticated location categorization with support for multiple categories, subcategories, and rich metadata. This system integrates with Foursquare's extensive venue category database to provide over 600 categorization options.

## Features

### 🌳 Hierarchical Structure
- **Parent Categories**: Main classification levels (e.g., "Food", "Arts & Entertainment")
- **Subcategories**: Specific venue types (e.g., "Food > Restaurants > Italian Restaurant")
- **Multiple Selection**: Users can select 3-5 categories per location for accurate classification
- **Visual Organization**: Expandable/collapsible tree structure with intuitive navigation

### 🔍 Smart Search & Discovery
- **Text Search**: Search across category names, descriptions, and metadata
- **Hierarchical Filtering**: Filter by parent categories or drill down to specific subcategories
- **Icon Integration**: Visual icons from Foursquare for enhanced UX
- **Source Tracking**: Categories marked as manual, foursquare, or imported

### 🎯 Enhanced User Experience
- **Badge Display**: Selected categories shown as removable badges
- **Search Autocomplete**: Real-time search suggestions as users type
- **Mobile Responsive**: Optimized interface for all device sizes
- **Accessibility**: Full keyboard navigation and screen reader support

## Architecture

### Database Schema

```typescript
interface Category {
  id: string
  name: string
  slug: string
  description?: string
  source: 'manual' | 'foursquare' | 'imported'
  
  // Foursquare-specific fields
  foursquareId?: string
  foursquarePluralName?: string
  foursquareShortName?: string
  foursquareIcon?: {
    prefix: string
    suffix: string
  }
  
  // Hierarchical relationships
  parent?: string | Category
  subcategories?: Category[]
  
  // Metadata
  showInFilter: boolean
  lastSyncDate?: Date
}
```

### Location Integration

```typescript
interface Location {
  // ... other fields
  categories: string[] // Array of category IDs (supports multiple)
}
```

## Implementation Guide

### 1. Initial Setup

#### Environment Configuration
```bash
# Add to .env.local
FOURSQUARE_API_KEY=your_foursquare_api_key
```

#### Category Synchronization
```bash
# Sync Foursquare categories
npm run sync-categories

# Test the sync process
npm run test-categories
```

### 2. Component Usage

#### Basic Implementation
```tsx
import { HierarchicalCategorySelector } from "@/components/ui/hierarchical-category-selector"

function LocationForm() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categories, setCategories] = useState([])

  return (
    <HierarchicalCategorySelector
      categories={categories}
      selectedCategories={selectedCategories}
      onSelectionChange={setSelectedCategories}
      maxSelections={3}
      placeholder="Choose categories that best describe your location"
      showSearch={true}
      showBadges={true}
      allowSubcategorySelection={true}
    />
  )
}
```

#### Advanced Configuration
```tsx
<HierarchicalCategorySelector
  categories={categories}
  selectedCategories={selectedCategories}
  onSelectionChange={setSelectedCategories}
  maxSelections={5}
  placeholder="Search categories..."
  showSearch={true}
  showBadges={true}
  allowSubcategorySelection={true}
  className="custom-category-selector"
  searchPlaceholder="Type to search categories..."
  expandedByDefault={false}
  showCategoryCount={true}
/>
```

### 3. API Integration

#### Fetch Categories with Hierarchy
```typescript
async function getHierarchicalCategories() {
  const result = await getCategories()
  
  // Transform flat categories into hierarchical structure
  const transformedCategories = result.docs.map((doc: any) => ({
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    source: doc.source || 'manual',
    foursquareIcon: doc.foursquareIcon,
    parent: doc.parent?.id || doc.parent,
    subcategories: []
  }))

  // Build hierarchy
  const categoryMap = new Map(transformedCategories.map(cat => [cat.id, cat]))
  const rootCategories: any[] = []

  transformedCategories.forEach(category => {
    if (category.parent) {
      const parent = categoryMap.get(category.parent)
      if (parent) {
        if (!parent.subcategories) parent.subcategories = []
        parent.subcategories.push(category)
      }
    } else {
      rootCategories.push(category)
    }
  })

  return rootCategories
}
```

#### Sync Foursquare Categories
```typescript
// POST /api/categories/sync-foursquare
const response = await fetch('/api/categories/sync-foursquare', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})

const result = await response.json()
// { total: 500, created: 450, updated: 50, errors: [] }
```

## User Interface Components

### HierarchicalCategorySelector

**Props:**
- `categories`: Array of hierarchical category objects
- `selectedCategories`: Array of selected category IDs
- `onSelectionChange`: Callback function for selection changes
- `maxSelections`: Maximum number of categories (default: 3)
- `placeholder`: Main placeholder text
- `showSearch`: Enable search functionality
- `showBadges`: Display selected categories as badges
- `allowSubcategorySelection`: Allow selecting subcategories

**Features:**
- Real-time search across categories
- Expandable parent categories
- Badge display with removal capability
- Visual feedback for selection limits
- Foursquare icon integration
- Responsive design

### Category Display Components

#### Badge Display
```tsx
// Location Detail Page
{categoryNames.length > 0 && (
  <div className="flex flex-wrap gap-2 mb-4">
    {categoryNames.map((category, index) => (
      <Badge key={index} variant="secondary" className="bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/20">
        {category}
      </Badge>
    ))}
  </div>
)}
```

#### Card Preview
```tsx
// Location Cards
{location.categories && location.categories.length > 0 && (
  <div className="flex flex-wrap gap-1">
    {location.categories.slice(0, 2).map((category) => (
      <Badge key={category.id} variant="outline" className="text-xs">
        {category.name}
      </Badge>
    ))}
    {location.categories.length > 2 && (
      <Badge variant="outline" className="text-xs">
        +{location.categories.length - 2}
      </Badge>
    )}
  </div>
)}
```

## Data Management

### Category Sources

1. **Manual**: Created by administrators through CMS
2. **Foursquare**: Synced from Foursquare API
3. **Imported**: Bulk imported from external sources

### Synchronization Process

1. **Fetch**: Retrieve categories from Foursquare Personalization API
2. **Process**: Parse into hierarchical structure
3. **Merge**: Update existing or create new categories
4. **Validate**: Ensure data integrity and relationships
5. **Index**: Update search indexes for fast retrieval

### Data Integrity

- **Relationship Validation**: Ensure parent-child relationships are valid
- **Duplicate Prevention**: Handle conflicts between manual and Foursquare categories
- **Orphan Cleanup**: Remove orphaned subcategories when parents are deleted
- **Sync Tracking**: Monitor last sync dates and handle incremental updates

## Performance Optimization

### Frontend Optimizations
- **Lazy Loading**: Load subcategories on demand
- **Search Debouncing**: Reduce API calls during search
- **Virtual Scrolling**: Handle large category lists efficiently
- **Memoization**: Cache category structures for better performance

### Backend Optimizations
- **Indexing**: Database indexes on frequently queried fields
- **Caching**: Redis cache for category hierarchies
- **Batch Processing**: Efficient bulk operations during sync
- **Pagination**: Chunked data loading for large datasets

## Testing

### Unit Tests
```bash
# Test category sync functionality
npm run test-categories

# Test hierarchy building
npm test -- --testPathPattern=categories
```

### Integration Tests
```bash
# Test API endpoints
npm test -- --testPathPattern=api/categories

# Test component functionality
npm test -- --testPathPattern=hierarchical-category-selector
```

### Manual Testing Checklist

- [ ] Category sync completes without errors
- [ ] Hierarchical structure displays correctly
- [ ] Search functionality works across all levels
- [ ] Multiple category selection works within limits
- [ ] Badge display and removal functions properly
- [ ] Mobile responsive design works on all devices
- [ ] Form validation handles edge cases
- [ ] Database relationships maintain integrity

## Troubleshooting

### Common Issues

**Sync Failures:**
- Check Foursquare API key validity
- Verify database connection
- Review error logs for specific failures

**Display Issues:**
- Clear component state and re-fetch categories
- Check CSS class conflicts
- Verify category data structure

**Performance Issues:**
- Review database indexes
- Check for memory leaks in large category lists
- Optimize search algorithms

### Debug Commands

```bash
# Test category sync with detailed logging
DEBUG=categories npm run sync-categories

# Validate category relationships
node scripts/validate-category-hierarchy.js

# Check API endpoint health
curl -X POST http://localhost:3000/api/categories/sync-foursquare
```

## Future Enhancements

### Planned Features
- **AI-Powered Suggestions**: Smart category recommendations based on location description
- **Category Analytics**: Usage statistics and popular category combinations
- **Bulk Category Assignment**: Mass category updates for existing locations
- **Custom Category Creation**: User-generated categories for specific communities
- **Category Localization**: Multi-language support for international venues

### API Expansion
- **GraphQL Support**: More flexible category queries
- **Real-time Updates**: WebSocket-based live category sync
- **Advanced Filtering**: Complex category-based location filtering
- **External Integrations**: Connect with Google Places, Yelp, and other services

## Contributing

When contributing to the category system:

1. **Follow Schema**: Maintain database schema consistency
2. **Test Thoroughly**: Ensure hierarchy integrity
3. **Document Changes**: Update this documentation
4. **Performance First**: Consider scalability implications
5. **Accessibility**: Maintain WCAG compliance

## Support

For questions or issues related to the hierarchical category system:

- **Documentation**: Review this guide and inline code comments
- **Issues**: Submit GitHub issues with detailed reproduction steps
- **Community**: Join our Discord for real-time support
- **Email**: Contact developers at dev@sacavia.com

---

*Built with ❤️ for the Sacavia community* 