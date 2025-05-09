/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Category, Location } from "./map-data"

// Default colors by category type
const TYPE_COLORS: Record<string, string> = {
  location: "#1A936F", // Green
  event: "#FF6B6B", // Red
  special: "#FFD166", // Yellow
  general: "#3D5A80", // Blue
  default: "#6C757D", // Gray
}

/**
 * Get color for a category
 */
export function getCategoryColor(category: any): string {
  // If category is null or undefined, return default color
  if (!category) return TYPE_COLORS.default

  // If category has a color property, use it
  if (typeof category === "object" && category.color) {
    return category.color
  }

  // If category has a type, use the type color
  if (typeof category === "object" && category.type && TYPE_COLORS[category.type]) {
    return TYPE_COLORS[category.type]
  }

  // If category is a string, use it as a key for the color map
  if (typeof category === "string") {
    // Try to match with type colors first
    if (TYPE_COLORS[category.toLowerCase()]) {
      return TYPE_COLORS[category.toLowerCase()]
    }

    // Otherwise hash the string for a consistent color
    return hashStringToColor(category)
  }

  // If category is an object with a name, hash the name
  if (typeof category === "object" && category.name) {
    return hashStringToColor(category.name)
  }

  // If category is an object with an id, hash the id
  if (typeof category === "object" && category.id) {
    return hashStringToColor(category.id)
  }

  // Fallback to default color
  return TYPE_COLORS.default
}

/**
 * Hash a string to a color
 */
function hashStringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Convert to hex color
  let color = "#"
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    color += ("00" + value.toString(16)).substr(-2)
  }

  return color
}

/**
 * Get category name from category object or string
 */
export function getCategoryName(category: any): string {
  if (!category) return "Uncategorized"

  if (typeof category === "string") {
    return category
  }

  if (typeof category === "object" && category.name) {
    return category.name
  }

  if (typeof category === "object" && category.id) {
    return category.id
  }

  return "Uncategorized"
}

/**
 * Get primary category for a location
 */
export function getPrimaryCategory(location: Location): Category | string | null {
  if (!location.categories || !Array.isArray(location.categories) || location.categories.length === 0) {
    return null
  }

  return location.categories[0]
}

/**
 * Check if a location matches any of the selected categories
 */
export function locationMatchesCategories(location: Location, selectedCategoryIds: string[]): boolean {
  // If no categories are selected, all locations match
  if (!selectedCategoryIds || selectedCategoryIds.length === 0) {
    return true
  }

  // If location has no categories, it doesn't match
  if (!location.categories || !Array.isArray(location.categories) || location.categories.length === 0) {
    return false
  }

  // Check if any of the location's categories match the selected ones
  return location.categories.some((category) => {
    if (typeof category === "string") {
      return selectedCategoryIds.includes(category)
    }

    return category?.id && selectedCategoryIds.includes(category.id)
  })
}

/**
 * Format business hours for display
 */
export function formatBusinessHours(businessHours?: any[]): string {
  if (!businessHours || !Array.isArray(businessHours) || businessHours.length === 0) {
    return "Hours not available"
  }

  // Sort days in correct order
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const sortedHours = [...businessHours].sort((a, b) => {
    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
  })

  // Group consecutive days with the same hours
  const groupedHours: { days: string[]; hours: string }[] = []
  let currentGroup: { days: string[]; hours: string } | null = null

  sortedHours.forEach((dayHours) => {
    const hourString = dayHours.closed ? "Closed" : `${dayHours.open || "?"} - ${dayHours.close || "?"}`

    if (!currentGroup || currentGroup.hours !== hourString) {
      currentGroup = { days: [dayHours.day], hours: hourString }
      groupedHours.push(currentGroup)
    } else {
      currentGroup.days.push(dayHours.day)
    }
  })

  // Format the grouped hours
  return groupedHours
    .map((group) => {
      const daysStr = group.days.length > 1 ? `${group.days[0]} - ${group.days[group.days.length - 1]}` : group.days[0]
      return `${daysStr}: ${group.hours}`
    })
    .join(", ")
}

/**
 * Format price range for display
 */
export function formatPriceRange(priceRange?: string): string {
  if (!priceRange) return ""

  const priceSymbols: Record<string, string> = {
    free: "Free",
    budget: "$",
    moderate: "$$",
    expensive: "$$$",
    luxury: "$$$$",
  }

  return priceSymbols[priceRange] || priceRange
}
