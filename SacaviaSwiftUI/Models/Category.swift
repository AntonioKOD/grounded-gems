import Foundation

struct Category: Identifiable, Codable {
    let id: String
    var name: String
    var slug: String?
    var type: CategoryType?
    var description: String?
    var parent: String?
    var icon: Media?
    var featuredImage: Media?
    var color: String?
    var order: Int?
    var isActive: Bool?
    var isFeatured: Bool?
    
    enum CategoryType: String, Codable {
        case location
        case event
        case special
        case general
    }
} 