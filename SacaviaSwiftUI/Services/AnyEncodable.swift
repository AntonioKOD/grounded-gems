import Foundation

// MARK: - AnyEncodable

/// A type-erased `Encodable` value.
struct AnyEncodable: Encodable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let value as String:
            try container.encode(value)
        case let value as Int:
            try container.encode(value)
        case let value as Double:
            try container.encode(value)
        case let value as Bool:
            try container.encode(value)
        case let value as Date:
            try container.encode(value)
        case let value as [String: Any]:
            try container.encode(value.mapValues(AnyEncodable.init))
        case let value as [Any]:
            try container.encode(value.map(AnyEncodable.init))
        case Optional<Any>.none:
            try container.encodeNil()
        default:
            let context = EncodingError.Context(
                codingPath: container.codingPath,
                debugDescription: "AnyEncodable value cannot be encoded: \(value)"
            )
            throw EncodingError.invalidValue(value, context)
        }
    }
}

// MARK: - Dictionary + AnyEncodable

extension Dictionary where Key == String {
    /// Creates an encodable dictionary that can handle Any values
    var encodable: [String: AnyEncodable] {
        mapValues(AnyEncodable.init)
    }
}

// MARK: - Array + AnyEncodable

extension Array {
    /// Creates an encodable array that can handle Any values
    var encodable: [AnyEncodable] {
        map(AnyEncodable.init)
    }
} 