import Foundation

struct Media: Identifiable, Codable {
    let id: String
    var url: String?
    var alt: String?
    var filename: String?
    var mimeType: String?
    var filesize: Int?
    var width: Int?
    var height: Int?
    var sizes: MediaSizes?
    
    struct MediaSizes: Codable {
        var thumbnail: String?
        var small: String?
        var medium: String?
        var large: String?
    }
} 