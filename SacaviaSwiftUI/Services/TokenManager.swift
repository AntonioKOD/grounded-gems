import Foundation

// Helper class for JWT token management
class TokenManager {
    static let shared = TokenManager()
    
    private init() {}
    
    // Check if a JWT token is expired
    func isTokenExpired(_ token: String) -> Bool {
        // Parse the JWT token to extract the expiration time
        guard let payload = decodeJWTPayload(from: token) else {
            print("TokenManager: Unable to decode JWT payload")
            return true // Assume expired if can't parse
        }
        
        guard let expTimestamp = payload["exp"] as? TimeInterval else {
            print("TokenManager: No expiration time in token")
            return true // Assume expired if no exp claim
        }
        
        // JWT expiration is in seconds since 1970
        let expirationDate = Date(timeIntervalSince1970: expTimestamp)
        let currentDate = Date()
        
        // Token is expired if current date is after expiration date
        let isExpired = currentDate >= expirationDate
        
        // Add some buffer (5 minutes) to renew token before it actually expires
        let isCloseToExpiration = currentDate >= expirationDate.addingTimeInterval(-300)
        
        if isExpired {
            print("TokenManager: Token is expired")
        } else if isCloseToExpiration {
            print("TokenManager: Token will expire soon")
        }
        
        return isExpired || isCloseToExpiration
    }
    
    // Decode the JWT payload part (middle part between dots)
    private func decodeJWTPayload(from token: String) -> [String: Any]? {
        let segments = token.components(separatedBy: ".")
        guard segments.count >= 2 else {
            print("TokenManager: Invalid JWT format")
            return nil
        }
        
        let payloadBase64 = segments[1]
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Add padding if needed
        let paddingLength = payloadBase64.count % 4
        let base64Padded: String
        
        switch paddingLength {
        case 0:
            base64Padded = payloadBase64
        case 1:
            base64Padded = payloadBase64 + "==="
        case 2:
            base64Padded = payloadBase64 + "=="
        case 3:
            base64Padded = payloadBase64 + "="
        default:
            fatalError("Impossible padding length")
        }
        
        guard let payloadData = Data(base64Encoded: base64Padded) else {
            print("TokenManager: Failed to decode base64")
            return nil
        }
        
        do {
            guard let json = try JSONSerialization.jsonObject(with: payloadData, options: []) as? [String: Any] else {
                print("TokenManager: Payload is not a valid JSON dictionary")
                return nil
            }
            return json
        } catch {
            print("TokenManager: JSON parsing error: \(error)")
            return nil
        }
    }
    
    // Refresh a token if needed
    func refreshTokenIfNeeded(_ token: String) async -> String? {
        if isTokenExpired(token) {
            // Attempt to refresh the token
            do {
                let newToken = try await APIService.shared.refreshToken()
                return newToken
            } catch {
                print("Failed to refresh token: \(error)")
                return nil
            }
        }
        return token
    }
} 