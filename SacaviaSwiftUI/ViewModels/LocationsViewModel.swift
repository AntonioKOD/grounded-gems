import Foundation
import CoreLocation

@MainActor
class LocationsViewModel: ObservableObject {
    @Published var locations: [Location] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedLocation: Location?
    @Published var filters = LocationFilters()
    
    private let apiService = APIService.shared
    
    struct LocationFilters {
        var category: String?
        var priceRange: Location.PriceRange?
        var searchQuery: String = ""
        var radius: Double = 25
        var sortBy: String = "distance"
        var openNow: Bool = false
    }
    
    func fetchLocations() async {
        isLoading = true
        error = nil
        
        do {
            var queryParams: [String: Any] = [
                "sort": filters.sortBy
            ]
            
            if let category = filters.category {
                queryParams["category"] = category
            }
            
            if let priceRange = filters.priceRange {
                queryParams["priceRange"] = priceRange.intValue
            }
            
            if !filters.searchQuery.isEmpty {
                queryParams["search"] = filters.searchQuery
            }
            
            if filters.openNow {
                queryParams["openNow"] = true
            }
            
            locations = try await apiService.getLocations(filters: queryParams)
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    func createLocation(_ location: Location) async throws {
        isLoading = true
        error = nil
        
        do {
            let newLocation = try await apiService.createLocation(location)
            locations.append(newLocation)
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func updateLocation(_ location: Location) async throws {
        isLoading = true
        error = nil
        
        do {
            let updatedLocation = try await apiService.updateLocation(location)
            if let index = locations.firstIndex(where: { $0.id == location.id }) {
                locations[index] = updatedLocation
            }
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func searchLocations(_ query: String) async {
        isLoading = true
        error = nil
        
        do {
            locations = try await apiService.searchLocations(query: query)
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    func applyFilters(_ newFilters: LocationFilters) async {
        filters = newFilters
        await fetchLocations()
    }
    
    func clearFilters() async {
        filters = LocationFilters()
        await fetchLocations()
    }
    
    func calculateDistance(from userLocation: CLLocation, to location: Location) -> Double? {
        let locationCoordinates = location.coordinates
        let locationCL = CLLocation(
            latitude: locationCoordinates.latitude,
            longitude: locationCoordinates.longitude
        )
        return userLocation.distance(from: locationCL) / 1000 // Convert to kilometers
    }
    
    func sortByDistance(userLocation: CLLocation) {
        locations.sort { loc1, loc2 in
            guard let dist1 = calculateDistance(from: userLocation, to: loc1),
                  let dist2 = calculateDistance(from: userLocation, to: loc2) else {
                return false
            }
            return dist1 < dist2
        }
    }
} 