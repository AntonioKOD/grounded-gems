/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Location } from "@/app/(frontend)/map/map-data"
import mapboxgl from "mapbox-gl";

// Define the structure of the map state we want to persist
export interface PersistentMapState {
  center: [number, number]
  zoom: number
  selectedLocationId: string | null
  searchQuery: string
  selectedCategories: string[]
  activeView: "map" | "list"
  lastUpdated: number
  filteredLocationIds: string[]
  // Add these fields:
  markers: MarkerState[]
  mapBounds: MapBounds | null
  lastInteraction: string
}

// Add these interfaces
export interface MarkerState {
  id: string
  latitude: number
  longitude: number
  category?: string
  isSelected?: boolean
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

// Default state to use when no saved state exists
const DEFAULT_MAP_STATE: PersistentMapState = {
  center: [40.7128, -74.006], // Default to NYC
  zoom: 12,
  selectedLocationId: null,
  searchQuery: "",
  selectedCategories: [],
  activeView: "map",
  lastUpdated: Date.now(),
  filteredLocationIds: [],
  markers: [],
  mapBounds: null,
  lastInteraction: "initial"
}

// Storage key for localStorage
const MAP_STATE_STORAGE_KEY = "map_explorer_state"

// Maximum age of stored state in milliseconds (24 hours)
const MAX_STATE_AGE = 24 * 60 * 60 * 1000

/**
 * Save the current map state to localStorage
 */
export function saveMapState(state: PersistentMapState): void {
  try {
    // Add timestamp for state age checking
    const stateWithTimestamp = {
      ...state,
      lastUpdated: Date.now(),
    }

    localStorage.setItem(MAP_STATE_STORAGE_KEY, JSON.stringify(stateWithTimestamp))
    console.log("Map state saved to localStorage")
  } catch (error) {
    console.error("Failed to save map state:", error)
  }
}

/**
 * Load the saved map state from localStorage
 * Returns the default state if no saved state exists or if it's invalid/expired
 */
export function loadMapState(): PersistentMapState {
  try {
    const savedState = localStorage.getItem(MAP_STATE_STORAGE_KEY)

    if (!savedState) {
      return DEFAULT_MAP_STATE
    }

    const parsedState = JSON.parse(savedState) as PersistentMapState

    // Check if state is too old
    if (Date.now() - parsedState.lastUpdated > MAX_STATE_AGE) {
      console.log("Saved map state is too old, using default state")
      return DEFAULT_MAP_STATE
    }

    // Validate the structure of the loaded state
    if (!isValidMapState(parsedState)) {
      console.warn("Invalid saved map state, using default state")
      return DEFAULT_MAP_STATE
    }

    console.log("Map state loaded from localStorage")
    return parsedState
  } catch (error) {
    console.error("Failed to load map state:", error)
    return DEFAULT_MAP_STATE
  }
}

/**
 * Clear the saved map state from localStorage
 */
export function clearMapState(): void {
  try {
    localStorage.removeItem(MAP_STATE_STORAGE_KEY)
    console.log("Map state cleared from localStorage")
  } catch (error) {
    console.error("Failed to clear map state:", error)
  }
}

// Add this function to extract marker state from locations
export function extractMarkerState(locations: Location[]): MarkerState[] {
  return locations.map(location => {
    const coords = getLocationCoordinates(location);
    if (!coords) return null;
    
    // Get primary category if it exists
    let category = "";
    if (location.categories && location.categories.length > 0) {
      const primaryCategory = location.categories[0];
      category = typeof primaryCategory === "string" ? 
        primaryCategory : 
        (primaryCategory.name || primaryCategory.id || "");
    }
    
    return {
      id: location.id,
      latitude: coords[0],
      longitude: coords[1],
      category,
      isSelected: false
    };
  }).filter(Boolean) as MarkerState[];
}

// Helper function to get coordinates from a location
export function getLocationCoordinates(location: Location): [number, number] | null {
  // Try direct latitude/longitude properties
  if (location.latitude != null && location.longitude != null) {
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
  }

  // Try coordinates object
  if (location.coordinates) {
    if (location.coordinates.latitude != null && location.coordinates.longitude != null) {
      const lat = Number(location.coordinates.latitude);
      const lng = Number(location.coordinates.longitude);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return [lat, lng];
      }
    }
  }

  return null;
}

// Add this function to extract map bounds from the map instance
export function extractMapBounds(map: mapboxgl.Map | null): MapBounds | null {
  if (!map) return null;
  
  try {
    const bounds = map.getBounds();
    return {
      north: bounds?.getNorth() ?? 0,
      south: bounds?.getSouth() ?? 0,
      east: bounds?.getEast() ?? 0,
      west: bounds?.getWest() ?? 0
    };
  } catch (error) {
    console.warn("Could not extract map bounds:", error);
    return null;
  }
}

// Add separate function to validate the marker state
function isValidMarkerState(markerState: any): boolean {
  return (
    markerState &&
    typeof markerState.id === "string" &&
    typeof markerState.latitude === "number" &&
    typeof markerState.longitude === "number" &&
    !isNaN(markerState.latitude) &&
    !isNaN(markerState.longitude) &&
    Math.abs(markerState.latitude) <= 90 &&
    Math.abs(markerState.longitude) <= 180
  );
}

/**
 * Validate the structure of a map state object
 */
function isValidMapState(state: any): state is PersistentMapState {
  return (
    state &&
    Array.isArray(state.center) &&
    state.center.length === 2 &&
    typeof state.center[0] === "number" &&
    typeof state.center[1] === "number" &&
    typeof state.zoom === "number" &&
    (state.selectedLocationId === null || typeof state.selectedLocationId === "string") &&
    typeof state.searchQuery === "string" &&
    Array.isArray(state.selectedCategories) &&
    (state.activeView === "map" || state.activeView === "list") &&
    typeof state.lastUpdated === "number" &&
    Array.isArray(state.filteredLocationIds) &&
    Array.isArray(state.markers) &&
    (state.mapBounds === null || 
      (typeof state.mapBounds === "object" && 
       typeof state.mapBounds.north === "number" &&
       typeof state.mapBounds.south === "number" &&
       typeof state.mapBounds.east === "number" &&
       typeof state.mapBounds.west === "number")) &&
    typeof state.lastInteraction === "string"
  );
}

/**
 * Find a location by ID in the locations array
 */
export function findLocationById(locations: Location[], id: string | null): Location | null {
  if (!id) return null
  return locations.find((loc) => loc.id === id) || null
}

/**
 * Filter locations by IDs
 */
export function filterLocationsByIds(locations: Location[], ids: string[]): Location[] {
  if (!ids.length) return locations
  return locations.filter((loc) => ids.includes(loc.id))
}

/**
 * Get location IDs from an array of locations
 */
export function getLocationIds(locations: Location[]): string[] {
  return locations.map((loc) => loc.id)
}
