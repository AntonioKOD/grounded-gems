import Foundation
import CoreLocation

struct Location: Identifiable, Codable {
    let id: String
    var name: String
    var description: String
    var shortDescription: String?
    
    // Media
    var featuredImage: Media?
    var gallery: [GalleryItem]?
    
    // Taxonomy
    var categories: [Category]?
    var tags: [String]?
    
    // Address & Coordinates
    var address: Address
    var coordinates: Coordinates
    var neighborhood: String?
    
    // Business Info
    var contactInfo: ContactInfo?
    var businessHours: [BusinessHour]?
    var priceRange: PriceRange?
    
    // Additional Info
    var bestTimeToVisit: [Season]?
    var insiderTips: String?
    var accessibility: Accessibility?
    
    // Status & Meta
    var status: LocationStatus
    var isFeatured: Bool?
    var isVerified: Bool?
    var averageRating: Double?
    var reviewCount: Int?
    
    // Sports-specific fields
    var sportsDetails: SportsDetails?
    
    // Creator and metadata
    var createdBy: Creator?
    var createdAt: Date
    var updatedAt: Date
    
    struct GalleryItem: Codable {
        var image: Media
        var caption: String?
    }
    
    struct Address: Codable {
        var street: String?
        var city: String?
        var state: String?
        var postalCode: String?
        var country: String?
        
        func formatted() -> String {
            var components: [String] = []
            
            if let street = street {
                components.append(street)
            }
            if let city = city {
                components.append(city)
            }
            if let state = state {
                components.append(state)
            }
            if let postalCode = postalCode {
                components.append(postalCode)
            }
            if let country = country {
                components.append(country)
            }
            
            return components.joined(separator: ", ")
        }
    }
    
    struct Coordinates: Codable {
        var latitude: Double
        var longitude: Double
        
        var clLocation: CLLocationCoordinate2D {
            CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        }
        
        func distance(to otherCoordinates: CLLocationCoordinate2D) -> CLLocationDistance {
            let thisLocation = CLLocation(latitude: latitude, longitude: longitude)
            let otherLocation = CLLocation(latitude: otherCoordinates.latitude, longitude: otherCoordinates.longitude)
            return thisLocation.distance(from: otherLocation)
        }
        
        func distance(to otherCoordinates: Coordinates) -> CLLocationDistance {
            distance(to: otherCoordinates.clLocation)
        }
        
        func formattedDistance(to otherCoordinates: CLLocationCoordinate2D) -> String {
            let distance = distance(to: otherCoordinates)
            let kilometers = distance / 1000
            if kilometers < 1 {
                return String(format: "%.0fm", distance)
            } else {
                return String(format: "%.1fkm", kilometers)
            }
        }
    }
    
    struct ContactInfo: Codable {
        var phone: String?
        var email: String?
        var website: String?
        var socialMedia: SocialMedia?
        
        struct SocialMedia: Codable {
            var facebook: String?
            var twitter: String?
            var instagram: String?
            var linkedin: String?
        }
    }
    
    struct BusinessHour: Codable, Identifiable {
        var id: String { "\(day.rawValue)" }
        var day: Weekday
        var open: String?
        var close: String?
        var isClosed: Bool
        
        enum Weekday: String, Codable, CaseIterable {
            case sunday = "Sunday"
            case monday = "Monday"
            case tuesday = "Tuesday"
            case wednesday = "Wednesday"
            case thursday = "Thursday"
            case friday = "Friday"
            case saturday = "Saturday"
        }
    }
    
    struct Season: Codable {
        var season: String
    }
    
    struct Accessibility: Codable {
        var wheelchairAccess: Bool?
        var parking: Bool?
        var other: String?
        
        var features: [String] {
            var result: [String] = []
            if wheelchairAccess == true {
                result.append("Wheelchair Accessible")
            }
            if parking == true {
                result.append("Parking Available")
            }
            if let other = other {
                result.append(other)
            }
            return result
        }
    }
    
    enum PriceRange: String, Codable {
        case free
        case budget
        case moderate
        case expensive
        case luxury
        
        var intValue: Int {
            switch self {
            case .free: return 0
            case .budget: return 1
            case .moderate: return 2
            case .expensive: return 3
            case .luxury: return 4
            }
        }
    }
    
    enum LocationStatus: String, Codable {
        case draft
        case review
        case published
        case archived
    }
    
    struct SportsDetails: Codable {
        var sportTypes: [String]?
        var facilities: [String]?
        var equipmentRental: Bool?
        var skillLevels: [String]?
    }
    
    struct Creator: Codable {
        var id: String
        var name: String
        var avatar: String?
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, name, description, shortDescription
        case featuredImage, gallery
        case categories, tags
        case address, coordinates, neighborhood
        case contactInfo, businessHours, priceRange
        case bestTimeToVisit, insiderTips, accessibility
        case status, isFeatured, isVerified
        case averageRating, reviewCount
        case sportsDetails
        case createdBy, createdAt, updatedAt
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Required fields
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decode(String.self, forKey: .description)
        address = try container.decode(Address.self, forKey: .address)
        coordinates = try container.decode(Coordinates.self, forKey: .coordinates)
        status = try container.decode(LocationStatus.self, forKey: .status)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        
        // Optional fields
        shortDescription = try container.decodeIfPresent(String.self, forKey: .shortDescription)
        featuredImage = try container.decodeIfPresent(Media.self, forKey: .featuredImage)
        gallery = try container.decodeIfPresent([GalleryItem].self, forKey: .gallery)
        categories = try container.decodeIfPresent([Category].self, forKey: .categories)
        tags = try container.decodeIfPresent([String].self, forKey: .tags)
        neighborhood = try container.decodeIfPresent(String.self, forKey: .neighborhood)
        contactInfo = try container.decodeIfPresent(ContactInfo.self, forKey: .contactInfo)
        businessHours = try container.decodeIfPresent([BusinessHour].self, forKey: .businessHours)
        priceRange = try container.decodeIfPresent(PriceRange.self, forKey: .priceRange)
        bestTimeToVisit = try container.decodeIfPresent([Season].self, forKey: .bestTimeToVisit)
        insiderTips = try container.decodeIfPresent(String.self, forKey: .insiderTips)
        accessibility = try container.decodeIfPresent(Accessibility.self, forKey: .accessibility)
        isFeatured = try container.decodeIfPresent(Bool.self, forKey: .isFeatured)
        isVerified = try container.decodeIfPresent(Bool.self, forKey: .isVerified)
        averageRating = try container.decodeIfPresent(Double.self, forKey: .averageRating)
        reviewCount = try container.decodeIfPresent(Int.self, forKey: .reviewCount)
        sportsDetails = try container.decodeIfPresent(SportsDetails.self, forKey: .sportsDetails)
        createdBy = try container.decodeIfPresent(Creator.self, forKey: .createdBy)
    }
    
    // Helper methods
    func isWithinRadius(_ radius: Double, of coordinates: CLLocationCoordinate2D) -> Bool {
        self.coordinates.distance(to: coordinates) <= radius * 1000 // Convert km to meters
    }
    
    var isOpen: Bool {
        guard let businessHours = businessHours else { return false }
        
        let calendar = Calendar.current
        let now = Date()
        let weekday = calendar.component(.weekday, from: now)
        
        // Convert weekday to our enum (1 = Sunday, 2 = Monday, etc.)
        let currentDay: BusinessHour.Weekday = {
            switch weekday {
            case 1: return .sunday
            case 2: return .monday
            case 3: return .tuesday
            case 4: return .wednesday
            case 5: return .thursday
            case 6: return .friday
            case 7: return .saturday
            default: return .sunday
            }
        }()
        
        guard let todayHours = businessHours.first(where: { $0.day == currentDay }) else {
            return false
        }
        
        if todayHours.isClosed { return false }
        
        guard let openTime = todayHours.open,
              let closeTime = todayHours.close else {
            return false
        }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        let currentTimeString = formatter.string(from: now)
        
        return currentTimeString >= openTime && currentTimeString <= closeTime
    }
} 