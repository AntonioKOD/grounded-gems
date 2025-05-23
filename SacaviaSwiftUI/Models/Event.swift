import Foundation
import CoreLocation

struct Event: Identifiable, Codable {
    let id: String
    var name: String
    var description: String
    var date: Date
    var eventLocation: EventLocation?
    var category: String?
    var image: Media?
    var status: EventStatus
    var organizer: User?
    var attendees: [Attendee]?
    var maxParticipants: Int?
    var minParticipants: Int?
    var isMatchmaking: Bool?
    var skillLevel: SkillLevel?
    var price: Price?
    var tags: [String]?
    var createdAt: Date
    var updatedAt: Date
    
    struct EventLocation: Codable {
        var id: String
        var name: String
        var address: String?
        var coordinates: Coordinates?
        
        struct Coordinates: Codable {
            var latitude: Double
            var longitude: Double
            
            var clLocation: CLLocationCoordinate2D {
                CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
            }
            
            func distance(from otherCoordinates: CLLocationCoordinate2D) -> CLLocationDistance {
                let thisLocation = CLLocation(latitude: latitude, longitude: longitude)
                let otherLocation = CLLocation(latitude: otherCoordinates.latitude, longitude: otherCoordinates.longitude)
                return thisLocation.distance(from: otherLocation)
            }
            
            func formattedDistance(from otherCoordinates: CLLocationCoordinate2D) -> String {
                let distance = distance(from: otherCoordinates)
                let kilometers = distance / 1000
                if kilometers < 1 {
                    return String(format: "%.0fm", distance)
                } else {
                    return String(format: "%.1fkm", kilometers)
                }
            }
        }
    }
    
    struct Attendee: Codable, Identifiable {
        var id: String
        var user: User
        var status: AttendeeStatus
        var joinedAt: Date
    }
    
    struct Price: Codable {
        var amount: Double
        var currency: String
        var type: PriceType
        
        enum PriceType: String, Codable {
            case free
            case fixed
            case donation
            case variable
        }
    }
    
    enum EventStatus: String, Codable {
        case draft
        case published
        case cancelled
        case completed
    }
    
    enum AttendeeStatus: String, Codable {
        case interested
        case going
        case notGoing
    }
    
    enum SkillLevel: String, Codable {
        case beginner
        case intermediate
        case advanced
        case all
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, name, description, date, eventLocation = "location"
        case category, image, status, organizer, attendees
        case maxParticipants, minParticipants, isMatchmaking
        case skillLevel, price, tags, createdAt, updatedAt
    }
    
    // Helper methods
    var isUpcoming: Bool {
        date > Date()
    }
    
    var isPast: Bool {
        date < Date()
    }
    
    var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        
        if isToday {
            formatter.dateFormat = "h:mm a"
            return "Today at \(formatter.string(from: date))"
        }
        
        if Calendar.current.isDateInTomorrow(date) {
            formatter.dateFormat = "h:mm a"
            return "Tomorrow at \(formatter.string(from: date))"
        }
        
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    var spotsLeft: Int? {
        guard let maxParticipants = maxParticipants else { return nil }
        let currentAttendees = attendees?.filter { $0.status == .going }.count ?? 0
        return maxParticipants - currentAttendees
    }
    
    var isFull: Bool {
        guard let spotsLeft = spotsLeft else { return false }
        return spotsLeft <= 0
    }
    
    func distance(from coordinates: CLLocationCoordinate2D) -> CLLocationDistance? {
        guard let eventCoordinates = eventLocation?.coordinates else { return nil }
        return eventCoordinates.distance(from: coordinates)
    }
    
    func formattedDistance(from coordinates: CLLocationCoordinate2D) -> String? {
        guard let eventCoordinates = eventLocation?.coordinates else { return nil }
        return eventCoordinates.formattedDistance(from: coordinates)
    }
    
    func isWithinRadius(_ radius: Double, of coordinates: CLLocationCoordinate2D) -> Bool {
        guard let distance = distance(from: coordinates) else { return false }
        return distance <= radius * 1000 // Convert km to meters
    }
    
    func userAttendanceStatus(userId: String) -> AttendeeStatus? {
        attendees?.first(where: { $0.user.id == userId })?.status
    }
    
    var goingCount: Int {
        attendees?.filter { $0.status == .going }.count ?? 0
    }
    
    var interestedCount: Int {
        attendees?.filter { $0.status == .interested }.count ?? 0
    }
    
    var notGoingCount: Int {
        attendees?.filter { $0.status == .notGoing }.count ?? 0
    }
    
    var shouldShowMatchmaking: Bool {
        isMatchmaking == true && skillLevel != nil
    }
    
    var priceDisplay: String {
        guard let price = price else { return "Free" }
        
        switch price.type {
        case .free:
            return "Free"
        case .fixed:
            return String(format: "%.2f %@", price.amount, price.currency)
        case .donation:
            return "Donation"
        case .variable:
            return "Variable"
        }
    }
} 