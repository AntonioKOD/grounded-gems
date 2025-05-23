import Foundation

struct User: Identifiable, Codable {
    let id: String
    var name: String?
    var email: String
    var bio: String?
    var profileImage: Media?
    var userLocation: UserLocation?
    var interests: [Interest]?
    var socialLinks: [SocialLink]?
    var isCreator: Bool?
    var followers: [String]?
    var following: [String]?
    var postCount: Int?
    var reviewCount: Int?
    var recommendationCount: Int?
    var averageRating: Double?
    let joinDate: Date
    
    struct Interest: Codable {
        var interest: String
    }
    
    struct SocialLink: Codable {
        var platform: Platform
        var url: String
        
        enum Platform: String, Codable {
            case facebook
            case twitter
            case instagram
            case linkedin
            case website
            case other
            
            init(from decoder: Decoder) throws {
                let container = try decoder.singleValueContainer()
                let rawValue = try container.decode(String.self)
                
                switch rawValue.lowercased() {
                case "facebook":
                    self = .facebook
                case "twitter":
                    self = .twitter
                case "instagram":
                    self = .instagram
                case "linkedin":
                    self = .linkedin
                case "website":
                    self = .website
                default:
                    self = .other
                }
            }
        }
    }
    
    struct UserLocation: Codable {
        var city: String?
        var state: String?
        var country: String?
        var coordinates: Coordinates?
        
        struct Coordinates: Codable {
            var latitude: Double
            var longitude: Double
        }
    }
} 