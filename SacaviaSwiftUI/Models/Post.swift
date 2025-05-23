import Foundation

struct Post: Identifiable, Codable {
    let id: String
    var title: String?
    var content: String
    var type: PostType
    var image: Media?
    var author: User
    var location: Location?
    var rating: Int?
    var likeCount: Int?
    var commentCount: Int?
    var isLiked: Bool?
    var status: PostStatus
    var visibility: PostVisibility
    var tags: [String]?
    var categories: [Category]?
    var isFeatured: Bool?
    var isPinned: Bool?
    let createdAt: Date
    let updatedAt: Date
    
    enum PostType: String, Codable {
        case post
        case review
        case recommendation
    }
    
    enum PostStatus: String, Codable {
        case draft
        case published
        case archived
    }
    
    enum PostVisibility: String, Codable {
        case `public`
        case `private`
        case friends
    }
    
    struct Comment: Identifiable, Codable {
        let id: String
        var content: String
        var author: User
        var likeCount: Int
        var isLiked: Bool
        let createdAt: Date
    }
    
    // Helper methods
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: createdAt)
    }
    
    var isPublished: Bool {
        status == .published
    }
    
    var isPublic: Bool {
        visibility == .public
    }
    
    var hasLocation: Bool {
        location != nil
    }
    
    var hasRating: Bool {
        rating != nil && type == .review
    }
    
    var formattedRating: String? {
        guard let rating = rating else { return nil }
        return String(repeating: "★", count: rating) + String(repeating: "☆", count: 5 - rating)
    }
} 