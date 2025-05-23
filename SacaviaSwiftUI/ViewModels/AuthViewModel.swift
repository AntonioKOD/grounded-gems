import Foundation
import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: Error?
    
    private let apiService = APIService.shared
    private let keychainService = KeychainService.shared
    
    init() {
        // Check for existing auth token and validate session
        Task {
            await validateSession()
        }
    }
    
    func login(email: String, password: String) async throws {
        isLoading = true
        error = nil
        
        print("AuthViewModel: Starting login with email: \(email)")
        
        // Basic validation
        guard !email.isEmpty, email.contains("@"), !password.isEmpty, password.count >= 6 else {
            await MainActor.run {
                self.error = NSError(
                    domain: "GroundedGems.ValidationError", 
                    code: 400, 
                    userInfo: [NSLocalizedDescriptionKey: "Please enter a valid email address and password (minimum 6 characters)"]
                )
                isLoading = false
            }
            throw APIError.validationError(["form": "Invalid email or password format"])
        }
        
        do {
            // First clear any existing user data to avoid stale state
            currentUser = nil
            isAuthenticated = false
            
            // Verify server connection before attempting login
            let serverIsReachable = await apiService.verifyConnection()
            if !serverIsReachable {
                await MainActor.run {
                    self.error = NSError(
                        domain: "GroundedGems.NetworkError", 
                        code: -1009, 
                        userInfo: [NSLocalizedDescriptionKey: "Unable to reach the server. Please check your internet connection and try again."]
                    )
                    isLoading = false
                }
                throw APIError.networkError(NSError(domain: "Network", code: -1009, userInfo: nil))
            }
            
            let user = try await apiService.login(email: email, password: password)
            
            // Ensure we're on the main thread
            await MainActor.run {
                currentUser = user
                isAuthenticated = true
                print("AuthViewModel: Login successful, user set")
                
                // If biometric authentication is enabled, save credentials
                if BiometricAuthManager.shared.isBiometricEnabled() {
                    KeychainService.shared.saveCredentials(email: email, password: password)
                    print("AuthViewModel: Credentials saved for biometric authentication")
                }
            }
        } catch let apiError as APIError {
            // Handle specific API errors
            await MainActor.run {
                switch apiError {
                case .invalidURL:
                    print("AuthViewModel: Invalid URL error")
                    self.error = NSError(
                        domain: "GroundedGems.APIError", 
                        code: 1, 
                        userInfo: [NSLocalizedDescriptionKey: "Invalid API URL. Please check your connection."]
                    )
                case .invalidResponse:
                    print("AuthViewModel: Invalid response error")
                    self.error = NSError(
                        domain: "GroundedGems.APIError", 
                        code: 2, 
                        userInfo: [NSLocalizedDescriptionKey: "Server returned an invalid response. The server may be misconfigured."]
                    )
                case .unauthorized:
                    print("AuthViewModel: Unauthorized error")
                    self.error = NSError(
                        domain: "GroundedGems.APIError", 
                        code: 3, 
                        userInfo: [NSLocalizedDescriptionKey: "Invalid email or password. Please try again."]
                    )
                case .serverError(let message):
                    print("AuthViewModel: Server error: \(message)")
                    self.error = NSError(
                        domain: "GroundedGems.APIError", 
                        code: 4, 
                        userInfo: [NSLocalizedDescriptionKey: "Server error: \(message)"]
                    )
                case .validationError(let errors):
                    let errorMessage = errors.values.joined(separator: ", ")
                    print("AuthViewModel: Validation error: \(errorMessage)")
                    self.error = NSError(
                        domain: "GroundedGems.APIError", 
                        code: 5, 
                        userInfo: [NSLocalizedDescriptionKey: "Validation error: \(errorMessage)"]
                    )
                case .networkError(let underlyingError):
                    print("AuthViewModel: Network error: \(underlyingError)")
                    
                    // Check if it's a connectivity issue
                    if let urlError = underlyingError as? URLError {
                        let errorMessage: String
                        switch urlError.code {
                        case .notConnectedToInternet:
                            errorMessage = "No internet connection. Please check your network settings."
                        case .timedOut:
                            errorMessage = "Request timed out. The server may be down or unreachable."
                        case .cannotFindHost, .cannotConnectToHost:
                            errorMessage = "Cannot connect to server. The server may be down or the URL is incorrect."
                        default:
                            errorMessage = "Network error: \(urlError.localizedDescription)"
                        }
                        
                        self.error = NSError(
                            domain: "GroundedGems.APIError", 
                            code: 6, 
                            userInfo: [NSLocalizedDescriptionKey: errorMessage]
                        )
                    } else {
                        self.error = NSError(
                            domain: "GroundedGems.APIError", 
                            code: 6, 
                            userInfo: [NSLocalizedDescriptionKey: "Network error: \(underlyingError.localizedDescription)"]
                        )
                    }
                case .decodingError(let decodingError):
                    print("AuthViewModel: Decoding error: \(decodingError)")
                    
                    let errorMessage: String
                    if let decodingErr = decodingError as? DecodingError {
                        switch decodingErr {
                        case .typeMismatch(let type, let context):
                            errorMessage = "Type mismatch error: Expected \(type) at \(context.codingPath.map { $0.stringValue }.joined(separator: "."))"
                        case .valueNotFound(let type, let context):
                            errorMessage = "Value not found: Expected \(type) at \(context.codingPath.map { $0.stringValue }.joined(separator: "."))"
                        case .keyNotFound(let key, let context):
                            errorMessage = "Key not found: \(key.stringValue) at \(context.codingPath.map { $0.stringValue }.joined(separator: "."))"
                        case .dataCorrupted(let context):
                            errorMessage = "Data corrupted: \(context.debugDescription)"
                        @unknown default:
                            errorMessage = "Unknown decoding error: \(decodingErr.localizedDescription)"
                        }
                    } else {
                        errorMessage = "Error processing server response: \(decodingError.localizedDescription)"
                    }
                    
                    self.error = NSError(
                        domain: "GroundedGems.APIError", 
                        code: 7, 
                        userInfo: [NSLocalizedDescriptionKey: errorMessage]
                    )
                }
            }
            throw apiError
        } catch {
            await MainActor.run {
                print("AuthViewModel: Unexpected error: \(error)")
                self.error = error
            }
            throw error
        } finally {
            await MainActor.run {
                isLoading = false
                print("AuthViewModel: Login attempt completed")
            }
        }
    }
    
    func signup(email: String, password: String, name: String, coords: [String: Double]) async throws {
        isLoading = true
        error = nil
        
        do {
            let user = try await apiService.signup(
                email: email,
                password: password,
                name: name,
                coords: coords
            )
            currentUser = user
            isAuthenticated = true
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func logout() async throws {
        isLoading = true
        error = nil
        
        do {
            try await apiService.logout()
            currentUser = nil
            isAuthenticated = false
            keychainService.deleteAuthToken()
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func validateSession() async {
        guard let token = keychainService.getAuthToken() else {
            isAuthenticated = false
            return
        }
        
        do {
            let user = try await apiService.getCurrentUser()
            await MainActor.run {
                currentUser = user
                isAuthenticated = true
            }
        } catch {
            await MainActor.run {
                currentUser = nil
                isAuthenticated = false
                keychainService.deleteAuthToken()
            }
        }
    }
    
    func resetPassword(email: String) async throws {
        isLoading = true
        error = nil
        
        do {
            try await apiService.resetPassword(email: email)
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func verifyEmail(token: String) async throws {
        isLoading = true
        error = nil
        
        do {
            try await apiService.verifyEmail(token: token)
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func updatePassword(currentPassword: String, newPassword: String) async throws {
        isLoading = true
        error = nil
        
        do {
            try await apiService.updatePassword(
                currentPassword: currentPassword,
                newPassword: newPassword
            )
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    // New method to handle authentication callback from URL scheme
    func processAuthCallback(code: String) async throws {
        isLoading = true
        error = nil
        
        do {
            print("Processing authentication code: \(code)")
            
            // Exchange the authorization code for a token and user
            let user = try await apiService.exchangeCodeForToken(code: code)
            
            // Update the local state
            currentUser = user
            isAuthenticated = true
            
            print("Authentication successful for user: \(user.name ?? "Unknown")")
        } catch {
            self.error = error
            isLoading = false
            throw error
        }
        
        isLoading = false
    }
}

class KeychainService {
    static let shared = KeychainService()
    
    private init() {}
    
    // Auth token methods
    func saveAuthToken(_ token: String) {
        saveToKeychain(key: "authToken", data: Data(token.utf8))
    }
    
    func getAuthToken() -> String? {
        if let data = getFromKeychain(key: "authToken") {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
    
    func deleteAuthToken() {
        deleteFromKeychain(key: "authToken")
    }
    
    // User credentials methods for biometric authentication
    func saveCredentials(email: String, password: String) {
        saveToKeychain(key: "userEmail", data: Data(email.utf8))
        saveToKeychain(key: "userPassword", data: Data(password.utf8))
    }
    
    func getStoredEmail() -> String? {
        if let data = getFromKeychain(key: "userEmail") {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
    
    func getStoredPassword() -> String? {
        if let data = getFromKeychain(key: "userPassword") {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
    
    func deleteCredentials() {
        deleteFromKeychain(key: "userEmail")
        deleteFromKeychain(key: "userPassword")
    }
    
    // Generic Keychain methods
    private func saveToKeychain(key: String, data: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        // Delete any existing item before adding
        SecItemDelete(query as CFDictionary)
        
        // Add the new item
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            print("KeychainService: Failed to save \(key) to keychain, status: \(status)")
        }
    }
    
    private func getFromKeychain(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess, let data = dataTypeRef as? Data {
            return data
        }
        
        return nil
    }
    
    private func deleteFromKeychain(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
} 