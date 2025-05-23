import Foundation
import CoreLocation

@MainActor
class EventsViewModel: ObservableObject {
    @Published var events: [Event] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedEvent: Event?
    @Published var filters = EventFilters()
    
    private let apiService = APIService.shared
    
    struct EventFilters {
        var category: String?
        var eventType: String?
        var isMatchmaking: Bool = false
        var radius: Double = 50
        var searchQuery: String = ""
        var sortBy: String = "date"
    }
    
    func fetchEvents() async {
        isLoading = true
        error = nil
        
        do {
            var queryParams: [String: Any] = [
                "sort": filters.sortBy,
                "startDate": Date().timeIntervalSince1970
            ]
            
            if let category = filters.category {
                queryParams["category"] = category
            }
            
            if let eventType = filters.eventType {
                queryParams["eventType"] = eventType
            }
            
            if filters.isMatchmaking {
                queryParams["isMatchmaking"] = true
            }
            
            if !filters.searchQuery.isEmpty {
                queryParams["search"] = filters.searchQuery
            }
            
            events = try await apiService.getEvents(filters: queryParams)
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    func createEvent(_ event: Event) async throws {
        isLoading = true
        error = nil
        
        do {
            let newEvent = try await apiService.createEvent(event)
            events.append(newEvent)
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func updateEvent(_ event: Event) async throws {
        isLoading = true
        error = nil
        
        do {
            let updatedEvent = try await apiService.updateEvent(event)
            if let index = events.firstIndex(where: { $0.id == event.id }) {
                events[index] = updatedEvent
            }
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func deleteEvent(_ eventId: String) async throws {
        isLoading = true
        error = nil
        
        do {
            try await apiService.deleteEvent(eventId)
            events.removeAll { $0.id == eventId }
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func joinEvent(_ eventId: String, status: Event.AttendeeStatus) async throws {
        error = nil
        
        do {
            try await apiService.joinEvent(eventId, status: status)
            // Update local event data
            if let index = events.firstIndex(where: { $0.id == eventId }) {
                // You might want to refresh the entire event here to get updated attendee list
                await fetchEvents()
            }
        } catch {
            self.error = error
            throw error
        }
    }
    
    func applyFilters(_ newFilters: EventFilters) async {
        filters = newFilters
        await fetchEvents()
    }
    
    func clearFilters() async {
        filters = EventFilters()
        await fetchEvents()
    }
    
    func searchEvents(_ query: String) async {
        filters.searchQuery = query
        await fetchEvents()
    }
} 