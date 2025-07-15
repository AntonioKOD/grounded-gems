
import type { Location } from "@/app/(frontend)/map/map-data";
import type mapboxgl from "mapbox-gl";
import { 
  extractMapBounds, 
  extractMarkerState, 
  type MarkerState, 
  type MapBounds, 
  type PersistentMapState,
  loadMapState,
  saveMapState
} from "./map-state-persistence";

// Session storage key for temporary map state (survives page refreshes but not browser close)
const MAP_SESSION_KEY = "map_explorer_session_state";

/**
 * Service to handle map state persistence across page refreshes and navigation
 */
export class MapPersistenceService {
  private static instance: MapPersistenceService;
  private currentState: PersistentMapState | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private isNavigating = false;
  private lastSavedHash = "";

  // Make this a singleton
  private constructor() {
    // Initialize navigation event listeners
    if (typeof window !== 'undefined') {
      // Listen for beforeunload to save state before page refresh
      window.addEventListener('beforeunload', () => {
        this.saveStateImmediately();
      });

      // Listen for navigation events
      if ('navigation' in window) {
        (window.navigation as any)?.addEventListener('navigate', () => {
          this.isNavigating = true;
          this.saveStateImmediately();
        });
      }
    }
  }

  public static getInstance(): MapPersistenceService {
    if (!MapPersistenceService.instance) {
      MapPersistenceService.instance = new MapPersistenceService();
    }
    return MapPersistenceService.instance;
  }

  /**
   * Initialize the service with the current map state
   */
  public initialize(initialState?: Partial<PersistentMapState>): PersistentMapState {
    // Load state from storage
    const savedState = this.loadState();
    
    // Merge with initial state if provided
    if (initialState) {
      this.currentState = {
        ...savedState,
        ...initialState,
        lastUpdated: Date.now()
      };
    } else {
      this.currentState = savedState;
    }

    this.isInitialized = true;
    return this.currentState;
  }

  /**
   * Update the current map state
   */
  public updateState(updates: Partial<PersistentMapState>): void {
    if (!this.isInitialized) {
      console.warn("MapPersistenceService not initialized");
      return;
    }

    if (!this.currentState) {
      this.currentState = loadMapState();
    }

    // Update the current state
    this.currentState = {
      ...this.currentState,
      ...updates,
      lastUpdated: Date.now()
    };

    // Debounce save operations to prevent excessive writes
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, 300);
  }

  /**
   * Save the current state to storage
   */
  private saveState(): void {
    if (!this.currentState) return;

    // Generate a hash of the state to avoid unnecessary saves
    const stateHash = JSON.stringify({
      center: this.currentState.center,
      zoom: this.currentState.zoom,
      selectedLocationId: this.currentState.selectedLocationId,
      markers: this.currentState.markers?.length || 0,
      mapBounds: this.currentState.mapBounds
    });

    // Only save if state has changed
    if (stateHash !== this.lastSavedHash) {
      this.lastSavedHash = stateHash;
      
      // Save to localStorage for persistence across sessions
      saveMapState(this.currentState);
      
      // Also save to sessionStorage for immediate recovery
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(MAP_SESSION_KEY, JSON.stringify(this.currentState));
        } catch (error) {
          console.warn("Failed to save map state to session storage:", error);
        }
      }
      
      console.log("Map state saved", {
        center: this.currentState.center,
        zoom: this.currentState.zoom,
        markers: this.currentState.markers?.length || 0
      });
    }
  }

  /**
   * Save state immediately without debouncing (for navigation events)
   */
  public saveStateImmediately(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveState();
  }

  /**
   * Load state from storage
   */
  private loadState(): PersistentMapState {
    // Try to load from sessionStorage first (for page refreshes)
    if (typeof window !== 'undefined') {
      try {
        const sessionState = sessionStorage.getItem(MAP_SESSION_KEY);
        if (sessionState) {
          const parsedState = JSON.parse(sessionState) as PersistentMapState;
          console.log("Loaded map state from session storage");
          return parsedState;
        }
      } catch (error) {
        console.warn("Failed to load map state from session storage:", error);
      }
    }

    // Fall back to localStorage
    return loadMapState();
  }

  /**
   * Get the current state
   */
  public getState(): PersistentMapState | null {
    return this.currentState;
  }

  /**
   * Update marker state
   */
  public updateMarkers(markers: MarkerState[]): void {
    if (!this.currentState) return;
    
    this.updateState({
      markers,
      lastUpdated: Date.now()
    });
  }

  /**
   * Update map bounds
   */
  public updateBounds(bounds: MapBounds | null): void {
    if (!this.currentState) return;
    
    this.updateState({
      mapBounds: bounds,
      lastUpdated: Date.now()
    });
  }

  /**
   * Check if we're currently navigating
   */
  public isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }

  /**
   * Reset navigation state
   */
  public resetNavigationState(): void {
    this.isNavigating = false;
  }

  /**
   * Extract current map state from map instance
   */
  public extractCurrentMapState(
    map: mapboxgl.Map, 
    locations: Location[], 
    selectedLocationId: string | null
  ): Partial<PersistentMapState> {
    if (!map) return {};

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = extractMapBounds(map);
    const markers = extractMarkerState(locations);

    return {
      center: [center.lat, center.lng],
      zoom,
      mapBounds: bounds,
      markers,
      selectedLocationId,
      lastUpdated: Date.now()
    };
  }

  /**
   * Clear all saved state
   */
  public clearState(): void {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(MAP_SESSION_KEY);
      } catch (error) {
        console.warn("Failed to clear map state from session storage:", error);
      }
    }
    
    // Clear localStorage state
    if (this.currentState) {
      this.currentState = null;
    }
    
    this.lastSavedHash = "";
  }
}

// Export a singleton instance
export const mapPersistenceService = MapPersistenceService.getInstance();
