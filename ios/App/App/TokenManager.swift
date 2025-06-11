import Foundation
import Security

class TokenManager: ObservableObject {
    static let shared = TokenManager()
    
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    
    private let tokenKey = "sacavia_auth_token"
    private let userKey = "sacavia_current_user"
    private let serviceName = "com.groundedgems.sacavia"
    
    private init() {
        checkAuthenticationStatus()
    }
    
    // MARK: - Authentication Status
    
    func checkAuthenticationStatus() {
        if let token = getToken(), !token.isEmpty, isTokenValid(token) {
            isAuthenticated = true
            loadCurrentUser()
        } else {
            isAuthenticated = false
            currentUser = nil
        }
    }
    
    // MARK: - Token Management
    
    func saveToken(_ token: String) {
        saveToKeychain(key: tokenKey, value: token)
        isAuthenticated = true
    }
    
    func getToken() -> String? {
        return getFromKeychain(key: tokenKey)
    }
    
    func clearToken() {
        deleteFromKeychain(key: tokenKey)
        deleteFromKeychain(key: userKey)
        isAuthenticated = false
        currentUser = nil
    }
    
    // MARK: - User Management
    
    func saveUser(_ user: User) {
        if let userData = try? JSONEncoder().encode(user) {
            saveToKeychain(key: userKey, value: String(data: userData, encoding: .utf8) ?? "")
            currentUser = user
        }
    }
    
    func loadCurrentUser() {
        if let userDataString = getFromKeychain(key: userKey),
           let userData = userDataString.data(using: .utf8),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            currentUser = user
        }
    }
    
    // MARK: - Token Validation
    
    private func isTokenValid(_ token: String) -> Bool {
        // Basic JWT validation - in a production app, you might want more sophisticated validation
        let components = token.components(separatedBy: ".")
        guard components.count == 3 else { return false }
        
        // Check if token is expired by decoding the payload
        if let payloadData = Data(base64URLEncoded: components[1]),
           let payload = try? JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
           let exp = payload["exp"] as? TimeInterval {
            return Date().timeIntervalSince1970 < exp
        }
        
        return true // Fallback to true if we can't validate
    }
    
    // MARK: - Keychain Operations
    
    private func saveToKeychain(key: String, value: String) {
        let data = value.data(using: .utf8) ?? Data()
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        // Delete any existing item
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            print("Failed to save to keychain: \(status)")
        }
    }
    
    private func getFromKeychain(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess,
           let data = result as? Data,
           let string = String(data: data, encoding: .utf8) {
            return string
        }
        
        return nil
    }
    
    private func deleteFromKeychain(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Base64URL Decoding Extension

extension Data {
    init?(base64URLEncoded string: String) {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Add padding if necessary
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }
        
        self.init(base64Encoded: base64)
    }
} 