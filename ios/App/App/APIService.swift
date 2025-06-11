import Foundation

class APIService {
    static let shared = APIService()
    private let baseURL = "https://your-app-domain.com" // Replace with your actual domain
    private let session = URLSession.shared
    
    private init() {}
    
    // MARK: - Authentication Endpoints
    
    func login(email: String, password: String, rememberMe: Bool = false) async throws -> AuthResponse {
        let request = LoginRequest(email: email, password: password, rememberMe: rememberMe)
        let url = URL(string: "\(baseURL)/api/v1/mobile/auth/login")!
        
        return try await performRequest(url: url, method: "POST", body: request)
    }
    
    func register(name: String, email: String, password: String, confirmPassword: String, termsAccepted: Bool, privacyAccepted: Bool, location: LocationData? = nil, preferences: UserPreferences? = nil) async throws -> AuthResponse {
        let request = RegisterRequest(
            name: name,
            email: email,
            password: password,
            confirmPassword: confirmPassword,
            termsAccepted: termsAccepted,
            privacyAccepted: privacyAccepted,
            location: location,
            preferences: preferences
        )
        let url = URL(string: "\(baseURL)/api/v1/mobile/auth/register")!
        
        return try await performRequest(url: url, method: "POST", body: request)
    }
    
    func logout() async throws {
        guard let token = TokenManager.shared.getToken() else {
            throw APIError.invalidCredentials
        }
        
        let url = URL(string: "\(baseURL)/api/v1/mobile/auth/logout")!
        
        struct LogoutResponse: Codable {
            let success: Bool
            let message: String
        }
        
        let _: LogoutResponse = try await performAuthenticatedRequest(url: url, method: "POST", token: token)
    }
    
    func getCurrentUser() async throws -> User {
        guard let token = TokenManager.shared.getToken() else {
            throw APIError.invalidCredentials
        }
        
        let url = URL(string: "\(baseURL)/api/v1/mobile/auth/me")!
        
        struct UserResponse: Codable {
            let success: Bool
            let message: String
            let data: UserData?
        }
        
        struct UserData: Codable {
            let user: User
        }
        
        let response: UserResponse = try await performAuthenticatedRequest(url: url, method: "GET", token: token)
        
        guard let userData = response.data else {
            throw APIError.serverError
        }
        
        return userData.user
    }
    
    func updateProfile(data: OnboardingData) async throws -> User {
        guard let token = TokenManager.shared.getToken() else {
            throw APIError.invalidCredentials
        }
        
        let url = URL(string: "\(baseURL)/api/v1/mobile/users/profile")!
        
        // Convert OnboardingData to the expected format
        let profileData: [String: Any] = [
            "interests": data.interests,
            "searchRadius": data.travelRadius,
            "notificationSettings": [
                "enabled": data.notificationSettings.pushNotifications,
                "pushNotifications": data.notificationSettings.pushNotifications,
                "emailNotifications": data.notificationSettings.emailNotifications
            ]
        ]
        
        struct ProfileResponse: Codable {
            let success: Bool
            let message: String
            let data: ProfileData?
        }
        
        struct ProfileData: Codable {
            let user: User
        }
        
        let response: ProfileResponse = try await performAuthenticatedRequest(url: url, method: "PUT", body: profileData, token: token)
        
        guard let userData = response.data else {
            throw APIError.serverError
        }
        
        return userData.user
    }
    
    // MARK: - Generic Request Methods
    
    private func performRequest<T: Codable, U: Codable>(url: URL, method: String, body: T) async throws -> U {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        
        do {
            let jsonData = try JSONEncoder().encode(body)
            request.httpBody = jsonData
        } catch {
            throw APIError.validationError
        }
        
        return try await performRequest(request: request)
    }
    
    private func performAuthenticatedRequest<T: Codable>(url: URL, method: String, body: T? = nil, token: String) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        if let body = body {
            do {
                let jsonData = try JSONEncoder().encode(body)
                request.httpBody = jsonData
            } catch {
                throw APIError.validationError
            }
        }
        
        return try await performRequest(request: request)
    }
    
    private func performAuthenticatedRequest<T: Codable>(url: URL, method: String, body: [String: Any]? = nil, token: String) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        if let body = body {
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: body)
                request.httpBody = jsonData
            } catch {
                throw APIError.validationError
            }
        }
        
        return try await performRequest(request: request)
    }
    
    private func performRequest<T: Codable>(request: URLRequest) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError
            }
            
            // Handle different HTTP status codes
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    let decodedResponse = try JSONDecoder().decode(T.self, from: data)
                    return decodedResponse
                } catch {
                    print("Decoding error: \(error)")
                    throw APIError.serverError
                }
                
            case 400:
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError(message: errorResponse.error ?? errorResponse.message, code: errorResponse.code)
                }
                throw APIError.validationError
                
            case 401:
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError(message: errorResponse.error ?? errorResponse.message, code: errorResponse.code)
                }
                throw APIError.invalidCredentials
                
            case 409:
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError(message: errorResponse.error ?? errorResponse.message, code: errorResponse.code)
                }
                throw APIError.userExists
                
            case 500...599:
                throw APIError.serverError
                
            default:
                throw APIError.networkError
            }
            
        } catch {
            if error is APIError {
                throw error
            }
            throw APIError.networkError
        }
    }
}

// MARK: - Error Response Model

private struct ErrorResponse: Codable {
    let success: Bool
    let message: String
    let error: String?
    let code: String?
} 