import Foundation
import CoreLocation
import UIKit

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case networkError(Error)
    case decodingError(Error)
    case serverError(String)
    case unauthorized
    case validationError([String: String])
}

// MARK: - Request Models
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct SignupRequest: Encodable {
    let email: String
    let password: String
    let name: String
    let coords: Coordinates
}

struct Coordinates: Encodable {
    let latitude: Double
    let longitude: Double
}

struct UpdateProfileRequest: Encodable {
    var name: String?
    var bio: String?
    var location: LocationInfo?
    var interests: [Interest]?
    var socialLinks: [SocialLink]?
    
    struct LocationInfo: Encodable {
        var city: String?
        var state: String?
        var country: String?
    }
    
    struct Interest: Encodable {
        var interest: String
    }
    
    struct SocialLink: Encodable {
        var platform: String
        var url: String
    }
}

struct FilterRequest: Encodable {
    var page: Int?
    var limit: Int?
    var depth: Int?
    var category: String?
    var search: String?
    var sort: String?
    var startDate: TimeInterval?
    var endDate: TimeInterval?
    var location: String?
    var openNow: Bool?
    var verified: Bool?
    var author: String?
    var eventType: String?
    var isMatchmaking: Bool?
    
    init(filters: [String: Any], page: Int = 1, limit: Int = 10) {
        self.page = page
        self.limit = limit
        self.depth = 2
        self.category = filters["category"] as? String
        self.search = filters["search"] as? String
        self.sort = filters["sort"] as? String
        self.startDate = filters["startDate"] as? TimeInterval
        self.endDate = filters["endDate"] as? TimeInterval
        self.location = filters["location"] as? String
        self.openNow = filters["openNow"] as? Bool
        self.verified = filters["verified"] as? Bool
        self.author = filters["author"] as? String
        self.eventType = filters["eventType"] as? String
        self.isMatchmaking = filters["isMatchmaking"] as? Bool
    }
}

struct PayloadResponse<T: Decodable>: Decodable {
    let docs: [T]?
    let doc: T?
    let message: String?
    let errors: [[String: String]]?
    let totalDocs: Int?
    let totalPages: Int?
    let page: Int?
    let token: String?
    let exp: Int?
}

struct JoinEventRequest: Encodable {
    let status: Event.AttendeeStatus
}

class APIService {
    static let shared = APIService()
    
    // The baseURL for the API - update this if the endpoint has changed
    private var baseURL: String {
        switch currentEnvironment {
        case .production:
            return "https://grounded-gems.vercel.app"
        case .staging:
            return "https://staging.grounded-gems.vercel.app" 
        case .development:
            return "http://localhost:3000"
        case .custom:
            return customBaseURL
        }
    }
    
    enum APIEnvironment {
        case production
        case staging
        case development
        case custom
    }
    
    private var currentEnvironment: APIEnvironment = .production
    private var customBaseURL: String = ""
    
    // Method to change the environment
    func setEnvironment(_ environment: APIEnvironment, customURL: String = "") {
        currentEnvironment = environment
        if environment == .custom {
            customBaseURL = customURL
        }
        print("API Environment changed to: \(environment), baseURL: \(baseURL)")
    }
    
    // PayloadCMS standard API endpoints
    private var authEndpoint: String { return "/api/users/login" }
    private var meEndpoint: String { return "/api/users/me" }
    private var signupEndpoint: String { return "/api/users" }
    private var logoutEndpoint: String { return "/api/users/logout" }
    private var refreshTokenEndpoint: String { return "/api/users/refresh-token" }
    
    private var authToken: String?
    
    private init() {
        // Check if we have a saved token
        if let savedToken = KeychainService.shared.getAuthToken() {
            self.authToken = savedToken
            print("APIService: Loaded saved token from keychain")
        }
    }
    
    // MARK: - Authentication
    
    func login(email: String, password: String) async throws -> User {
        // First verify connection
        if !(await verifyConnection()) {
            throw APIError.networkError(NSError(domain: "APIService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Server is unreachable. Please check your connection and try again."]))
        }
        
        // Create a simple dictionary for login instead of a structured request
        let requestDict: [String: Any] = [
            "email": email, 
            "password": password,
            "client_id": "grounded-gems-app",
            "device_name": UIDevice.current.name,
            "device_id": UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        ]
        
        print("Attempting login with email: \(email)")
        
        // Ensure the URL is valid
        guard let baseURL = URL(string: baseURL) else {
            print("Invalid base URL")
            throw APIError.invalidURL
        }
        
        guard let loginURL = URL(string: authEndpoint, relativeTo: baseURL) else {
            print("Invalid login URL")
            throw APIError.invalidURL
        }
        
        print("Login URL: \(loginURL.absoluteString)")
        
        var urlRequest = URLRequest(url: loginURL)
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Configure request with proper timeouts
        urlRequest = configureRequest(urlRequest)
        
        // Encode the request body as a simple dictionary
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: requestDict)
            urlRequest.httpBody = jsonData
            print("Request body: \(String(data: jsonData, encoding: .utf8) ?? "Unable to print request body")")
        } catch {
            print("Failed to encode request: \(error)")
            throw APIError.networkError(error)
        }
        
        // Perform the request manually to handle cookies
        do {
            let (data, response) = try await URLSession.shared.data(for: urlRequest)
            print("Response received: \(response)")
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("Invalid HTTP response")
                throw APIError.invalidResponse
            }
            
            print("Response status code: \(httpResponse.statusCode)")
            
            // Print the raw response data for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("Response data: \(responseString)")
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    // First try to debug the JSON structure
                    if let json = try? JSONSerialization.jsonObject(with: data, options: []) {
                        print("JSON structure: \(json)")
                    }
                    
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .iso8601
                    
                    // Try to decode the payload structure
                    do {
                        let authResponse = try decoder.decode(PayloadResponse<User>.self, from: data)
                        print("Auth response decoded successfully")
                        
                        if let token = authResponse.token {
                            print("Token received, length: \(token.count)")
                            setAuthToken(token)
                            
                            // Store the token in the keychain for later use
                            KeychainService.shared.saveAuthToken(token)
                        } else {
                            print("No token received in response")
                        }
                        
                        if let user = authResponse.doc {
                            print("Login successful for user: \(user.name ?? "Unknown")")
                            return user
                        } else if let users = authResponse.docs, let firstUser = users.first {
                            print("Login successful for user from docs array: \(firstUser.name ?? "Unknown")")
                            return firstUser
                        } else {
                            print("No user document in response")
                            throw APIError.invalidResponse
                        }
                    } catch {
                        print("Failed to decode PayloadResponse: \(error)")
                        
                        // As a fallback, try to decode the user directly
                        do {
                            let user = try decoder.decode(User.self, from: data)
                            print("Decoded user directly: \(user.name ?? "Unknown")")
                            return user
                        } catch {
                            print("Failed to decode User: \(error)")
                            
                            // Try to extract user from a different structure
                            if let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                               let userData = json["user"] as? [String: Any] {
                                print("Found user data in JSON: \(userData)")
                                
                                // Convert userData back to JSON data and try to decode
                                if let userDataJSON = try? JSONSerialization.data(withJSONObject: userData) {
                                    do {
                                        let user = try decoder.decode(User.self, from: userDataJSON)
                                        print("Manually extracted user: \(user.name ?? "Unknown")")
                                        
                                        // Look for token in the JSON
                                        if let token = json["token"] as? String {
                                            print("Token found in JSON")
                                            setAuthToken(token)
                                            KeychainService.shared.saveAuthToken(token)
                                        }
                                        
                                        return user
                                    } catch {
                                        print("Failed to decode extracted user: \(error)")
                                    }
                                }
                            }
                            
                            // Log detailed error
                            logDetailedError(error: error, endpoint: "login", request: urlRequest, response: httpResponse, data: data)
                            throw APIError.decodingError(error)
                        }
                    }
                } catch {
                    logDetailedError(error: error, endpoint: "login", request: urlRequest, response: httpResponse, data: data)
                    throw APIError.decodingError(error)
                }
            case 401:
                logDetailedError(error: APIError.unauthorized, endpoint: "login", request: urlRequest, response: httpResponse, data: data)
                throw APIError.unauthorized
            case 400:
                if let responseString = String(data: data, encoding: .utf8) {
                    print("Bad request: \(responseString)")
                }
                
                // Try to decode validation errors
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        // Check for errors array
                        if let errorsArray = json["errors"] as? [[String: Any]] {
                            var errorMessages: [String: String] = [:]
                            
                            for errorObj in errorsArray {
                                if let message = errorObj["message"] as? String,
                                   let field = errorObj["field"] as? String {
                                    errorMessages[field] = message
                                }
                            }
                            
                            if !errorMessages.isEmpty {
                                logDetailedError(error: APIError.validationError(errorMessages), endpoint: "login", request: urlRequest, response: httpResponse, data: data)
                                throw APIError.validationError(errorMessages)
                            }
                        }
                        
                        // Check for message
                        if let message = json["message"] as? String {
                            logDetailedError(error: APIError.serverError(message), endpoint: "login", request: urlRequest, response: httpResponse, data: data)
                            throw APIError.serverError(message)
                        }
                    }
                } catch let apiError as APIError {
                    throw apiError
                } catch {
                    print("Error parsing error response: \(error)")
                }
                
                // Fallback error handling
                logDetailedError(error: APIError.invalidResponse, endpoint: "login", request: urlRequest, response: httpResponse, data: data)
                throw APIError.invalidResponse
            default:
                // Try to parse error message
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = json["message"] as? String {
                    logDetailedError(error: APIError.serverError(message), endpoint: "login", request: urlRequest, response: httpResponse, data: data)
                    throw APIError.serverError(message)
                }
                
                logDetailedError(error: APIError.invalidResponse, endpoint: "login", request: urlRequest, response: httpResponse, data: data)
                throw APIError.invalidResponse
            }
        } catch let urlError as URLError {
            print("URL Session error: \(urlError)")
            logDetailedError(error: urlError, endpoint: "login", request: urlRequest, response: nil, data: nil)
            throw APIError.networkError(urlError)
        } catch let apiError as APIError {
            throw apiError
        } catch {
            print("Unknown error: \(error)")
            logDetailedError(error: error, endpoint: "login", request: urlRequest, response: nil, data: nil)
            throw APIError.networkError(error)
        }
    }
    
    func signup(email: String, password: String, name: String, coords: [String: Double]) async throws -> User {
        let coordinates = Coordinates(latitude: coords["latitude"] ?? 0, longitude: coords["longitude"] ?? 0)
        let request = SignupRequest(email: email, password: password, name: name, coords: coordinates)
        
        var components = URLComponents(string: baseURL + "/api/users")!
        var urlRequest = URLRequest(url: components.url!)
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Encode the request body
        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(request)
        
        // Perform the request manually to handle cookies
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                
                // PayloadCMS returns user data with a token
                let authResponse = try decoder.decode(PayloadResponse<User>.self, from: data)
                
                if let token = authResponse.token {
                    setAuthToken(token)
                    
                    // Store the token in the keychain for later use
                    KeychainService.shared.saveAuthToken(token)
                }
                
                guard let user = authResponse.doc else {
                    throw APIError.invalidResponse
                }
                
                return user
            } catch {
                print("Decoding error: \(error)")
                throw APIError.decodingError(error)
            }
        case 401:
            throw APIError.unauthorized
        case 400:
            if let errors = try? JSONDecoder().decode([String: String].self, from: data) {
                throw APIError.validationError(errors)
            }
            throw APIError.invalidResponse
        default:
            if let errorMessage = try? JSONDecoder().decode([String: String].self, from: data)["message"] {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.invalidResponse
        }
    }
    
    // New method for JSON Web Token authentication
    func exchangeCodeForToken(code: String) async throws -> User {
        // In PayloadCMS, this would typically be a token verification endpoint
        // For now, we'll assume this is a custom endpoint you've added to your PayloadCMS backend
        let data = ["code": code]
        let encodableData = data.encodable
        
        var components = URLComponents(string: baseURL + "/api/users/token")!
        var urlRequest = URLRequest(url: components.url!)
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Encode the request body
        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(encodableData)
        
        // Perform the request manually to handle cookies
        let (responseData, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                
                // PayloadCMS returns user data with a token
                let authResponse = try decoder.decode(PayloadResponse<User>.self, from: responseData)
                
                if let token = authResponse.token {
                    setAuthToken(token)
                    
                    // Store the token in the keychain for later use
                    KeychainService.shared.saveAuthToken(token)
                }
                
                guard let user = authResponse.doc else {
                    throw APIError.invalidResponse
                }
                
                return user
            } catch {
                print("Decoding error: \(error)")
                throw APIError.decodingError(error)
            }
        case 401:
            throw APIError.unauthorized
        default:
            if let errorMessage = try? JSONDecoder().decode([String: String].self, from: responseData)["message"] {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.invalidResponse
        }
    }
    
    func logout() async throws {
        let _: PayloadResponse<EmptyRequest> = try await postRequest("/api/users/logout", body: Optional<EmptyRequest>.none)
        clearAuthToken()
        KeychainService.shared.deleteAuthToken()
    }
    
    // MARK: - Events
    
    func getEvents(filters: [String: Any] = [:], page: Int = 1, limit: Int = 10) async throws -> [Event] {
        var queryParams = filters
        queryParams["page"] = page
        queryParams["limit"] = limit
        let response: PayloadResponse<Event> = try await get("/api/events", queryParams: queryParams)
        return response.docs ?? []
    }
    
    func createEvent(_ event: Event) async throws -> Event {
        let response: PayloadResponse<Event> = try await postRequest("/api/events", body: event)
        guard let createdEvent = response.doc else {
            throw APIError.invalidResponse
        }
        return createdEvent
    }
    
    func updateEvent(_ event: Event) async throws -> Event {
        let response: PayloadResponse<Event> = try await patch("/api/events/\(event.id)", body: event)
        guard let updatedEvent = response.doc else {
            throw APIError.invalidResponse
        }
        return updatedEvent
    }
    
    func deleteEvent(_ eventId: String) async throws {
        let _: PayloadResponse<Event> = try await delete("/api/events/\(eventId)")
    }
    
    func joinEvent(_ eventId: String, status: Event.AttendeeStatus) async throws {
        let request = JoinEventRequest(status: status)
        let _: PayloadResponse<EmptyRequest> = try await postRequest("/api/events/\(eventId)/join", body: request)
    }
    
    // MARK: - Locations
    
    func getLocations(filters: [String: Any] = [:], page: Int = 1, limit: Int = 10) async throws -> [Location] {
        var queryParams = filters
        queryParams["page"] = page
        queryParams["limit"] = limit
        let response: PayloadResponse<Location> = try await get("/api/locations", queryParams: queryParams)
        return response.docs ?? []
    }
    
    func createLocation(_ location: Location) async throws -> Location {
        let response: PayloadResponse<Location> = try await postRequest("/api/locations", body: location)
        guard let createdLocation = response.doc else {
            throw APIError.invalidResponse
        }
        return createdLocation
    }
    
    func updateLocation(_ location: Location) async throws -> Location {
        let response: PayloadResponse<Location> = try await patch("/api/locations/\(location.id)", body: location)
        guard let updatedLocation = response.doc else {
            throw APIError.invalidResponse
        }
        return updatedLocation
    }
    
    func searchLocations(query: String) async throws -> [Location] {
        let queryParams = ["search": query]
        let response: PayloadResponse<Location> = try await get("/api/locations/search", queryParams: queryParams)
        return response.docs ?? []
    }
    
    // MARK: - Users
    
    func getCurrentUser() async throws -> User {
        let response: PayloadResponse<User> = try await get("/api/users/me")
        guard let user = response.doc else {
            throw APIError.invalidResponse
        }
        return user
    }
    
    func getCurrentUser(userId: String) async throws -> User {
        let response: PayloadResponse<User> = try await get("/api/users/\(userId)")
        guard let user = response.doc else {
            throw APIError.invalidResponse
        }
        return user
    }
    
    func getUser(_ userId: String) async throws -> User {
        let response: PayloadResponse<User> = try await get("/api/users/\(userId)")
        guard let user = response.doc else {
            throw APIError.invalidResponse
        }
        return user
    }
    
    func getUsers(ids: [String]) async throws -> [User] {
        let queryParams = ["ids": ids.joined(separator: ",")]
        let response: PayloadResponse<User> = try await get("/api/users", queryParams: queryParams)
        return response.docs ?? []
    }
    
    func updateProfile(_ userId: String, data: [String: Any]) async throws -> User {
        let encodableData = data.encodable
        let response: PayloadResponse<User> = try await patch("/api/users/\(userId)", body: encodableData)
        guard let updatedUser = response.doc else {
            throw APIError.invalidResponse
        }
        return updatedUser
    }
    
    func updateUserLocation(userId: String, coordinates: CLLocationCoordinate2D) async throws {
        let data: [String: Any] = [
            "location": [
                "coordinates": [
                    "latitude": coordinates.latitude,
                    "longitude": coordinates.longitude
                ]
            ]
        ]
        let encodableData = data.encodable
        let _: PayloadResponse<User> = try await patch("/api/users/\(userId)", body: encodableData)
    }
    
    func resetPassword(email: String) async throws {
        let data = ["email": email]
        let _: PayloadResponse<EmptyRequest> = try await postRequest("/api/users/reset-password", body: data)
    }
    
    func verifyEmail(token: String) async throws {
        let data = ["token": token]
        let _: PayloadResponse<EmptyRequest> = try await postRequest("/api/users/verify-email", body: data)
    }
    
    func updatePassword(currentPassword: String, newPassword: String) async throws {
        let data = [
            "currentPassword": currentPassword,
            "newPassword": newPassword
        ]
        let _: PayloadResponse<EmptyRequest> = try await postRequest("/api/users/update-password", body: data)
    }
    
    func followUser(_ userId: String) async throws {
        let _: PayloadResponse<EmptyRequest> = try await postRequest("/api/users/\(userId)/follow", body: nil as EmptyRequest?)
    }
    
    func unfollowUser(_ userId: String) async throws {
        let _: PayloadResponse<EmptyRequest> = try await delete("/api/users/\(userId)/follow")
    }
    
    // MARK: - Posts
    
    func getPosts(filters: [String: Any] = [:], page: Int = 1, limit: Int = 10) async throws -> [Post] {
        var queryParams = filters
        queryParams["page"] = page
        queryParams["limit"] = limit
        let response: PayloadResponse<Post> = try await get("/api/posts", queryParams: queryParams)
        return response.docs ?? []
    }
    
    func createPost(_ post: Post) async throws -> Post {
        let response: PayloadResponse<Post> = try await postRequest("/api/posts", body: post)
        guard let createdPost = response.doc else {
            throw APIError.invalidResponse
        }
        return createdPost
    }
    
    func updatePost(_ post: Post) async throws -> Post {
        let response: PayloadResponse<Post> = try await patch("/api/posts/\(post.id)", body: post)
        guard let updatedPost = response.doc else {
            throw APIError.invalidResponse
        }
        return updatedPost
    }
    
    func deletePost(_ postId: String) async throws {
        let _: PayloadResponse<Post> = try await delete("/api/posts/\(postId)")
    }
    
    func likePost(_ postId: String) async throws {
        let _: PayloadResponse<EmptyRequest> = try await postRequest("/api/posts/\(postId)/like", body: nil as EmptyRequest?)
    }
    
    func unlikePost(_ postId: String) async throws {
        let _: PayloadResponse<EmptyRequest> = try await delete("/api/posts/\(postId)/like")
    }
    
    func sharePost(_ postId: String) async throws {
        let _: PayloadResponse<EmptyRequest> = try await postRequest("/api/posts/\(postId)/share", body: nil as EmptyRequest?)
    }
    
    func getUserPosts(_ userId: String, filters: [String: Any] = [:]) async throws -> [Post] {
        var queryParams = filters
        queryParams["author"] = userId
        let response: PayloadResponse<Post> = try await get("/api/posts", queryParams: queryParams)
        return response.docs ?? []
    }
    
    // MARK: - User Events
    func getUserEvents(_ userId: String) async throws -> [Event] {
        let queryParams = ["userId": userId]
        let response: PayloadResponse<Event> = try await get("/api/events", queryParams: queryParams)
        return response.docs ?? []
    }
    
    // MARK: - Media Upload
    func uploadMedia(data: Data, type: String) async throws -> Media {
        var request = URLRequest(url: URL(string: baseURL + "/api/upload-media")!)
        request.httpMethod = "POST"
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            request.addValue(token, forHTTPHeaderField: "Authorization")
        }
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"image.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(type)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        let (responseData, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        let decoder = JSONDecoder()
        return try decoder.decode(Media.self, from: responseData)
    }
    
    // MARK: - Suggested or Popular Events
    func getSuggestedOrPopularEvents(type: String = "popular", filters: [String: Any] = [:], page: Int = 1, limit: Int = 10) async throws -> [Event] {
        var queryParams = filters
        queryParams["page"] = page
        queryParams["limit"] = limit
        queryParams["type"] = type // e.g., "suggested" or "popular"
        let response: PayloadResponse<Event> = try await get("/api/events", queryParams: queryParams)
        return response.docs ?? []
    }
    
    // Add getCategories method
    func getCategories(type: String? = nil) async throws -> [Category] {
        var queryParams: [String: Any] = [:]
        if let type = type {
            queryParams["type"] = type
        }
        let response: PayloadResponse<Category> = try await get("/api/categories", queryParams: queryParams)
        return response.docs ?? []
    }
    
    // MARK: - Generic Network Methods
    
    private func get<T: Decodable>(_ endpoint: String, queryParams: [String: Any]? = nil) async throws -> T {
        var components = URLComponents(string: baseURL + endpoint)!
        
        if let queryParams = queryParams {
            components.queryItems = queryParams.map { key, value in
                URLQueryItem(name: key, value: String(describing: value))
            }
        }
        
        var request = URLRequest(url: components.url!)
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            request.addValue(token, forHTTPHeaderField: "Authorization")
        }
        
        return try await performRequestWithRetry(request)
    }
    
    private func postRequest<T: Decodable, E: Encodable>(_ endpoint: String, body: E?) async throws -> T {
        var request = URLRequest(url: URL(string: baseURL + endpoint)!)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            request.addValue(token, forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(body)
        }
        
        return try await performRequestWithRetry(request)
    }
    
    private func patch<T: Decodable, E: Encodable>(_ endpoint: String, body: E) async throws -> T {
        var request = URLRequest(url: URL(string: baseURL + endpoint)!)
        request.httpMethod = "PATCH"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            request.addValue(token, forHTTPHeaderField: "Authorization")
        }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(body)
        
        return try await performRequestWithRetry(request)
    }
    
    private func delete<T: Decodable>(_ endpoint: String) async throws -> T {
        var request = URLRequest(url: URL(string: baseURL + endpoint)!)
        request.httpMethod = "DELETE"
        if let token = authToken {
            request.addValue(token, forHTTPHeaderField: "Authorization")
        }
        
        return try await performRequestWithRetry(request)
    }
    
    private func performRequestWithRetry<T: Decodable>(_ request: URLRequest, maxRetries: Int = 3) async throws -> T {
        var retryCount = 0
        var lastError: Error? = nil
        
        while retryCount < maxRetries {
            do {
                // Try to perform the request
                return try await performRequest(request)
            } catch let error as APIError {
                lastError = error
                
                // Only retry for network errors or server errors, not for validation or unauthorized
                switch error {
                case .networkError, .serverError:
                    retryCount += 1
                    print("Request failed (attempt \(retryCount)/\(maxRetries)): \(error.localizedDescription)")
                    
                    if retryCount < maxRetries {
                        // Wait with exponential backoff before retrying (0.5s, 1s, 2s, etc.)
                        let delay = 0.5 * pow(2.0, Double(retryCount - 1))
                        try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                        continue
                    }
                default:
                    // Don't retry for other types of errors
                    throw error
                }
            } catch {
                lastError = error
                throw error
            }
        }
        
        // If we've exhausted all retries, throw the last error
        throw lastError ?? APIError.networkError(NSError(domain: "APIService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Max retries exceeded"]))
    }
    
    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        // Check if we need to refresh the token before making the request
        if let token = authToken, TokenManager.shared.isTokenExpired(token) {
            do {
                let newToken = try await refreshToken()
                // Update the request with the new token
                var updatedRequest = request
                updatedRequest.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
                return try await performActualRequest(updatedRequest)
            } catch {
                // If token refresh fails, proceed with the original request
                // It might fail with 401, which is expected
                return try await performActualRequest(request)
            }
        } else {
            // Token is valid or doesn't exist, proceed with the request
            return try await performActualRequest(request)
        }
    }
    
    private func performActualRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                return try decoder.decode(T.self, from: data)
            } catch {
                print("Decoding error: \(error)")
                throw APIError.decodingError(error)
            }
        case 401:
            // Clear the token on unauthorized response
            clearAuthToken()
            KeychainService.shared.deleteAuthToken()
            throw APIError.unauthorized
        case 400:
            if let errors = try? JSONDecoder().decode([String: String].self, from: data) {
                throw APIError.validationError(errors)
            }
            throw APIError.invalidResponse
        default:
            if let errorMessage = try? JSONDecoder().decode([String: String].self, from: data)["message"] {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.invalidResponse
        }
    }
    
    // MARK: - Token Management
    
    func setAuthToken(_ token: String) {
        self.authToken = token
    }
    
    func clearAuthToken() {
        self.authToken = nil
    }
    
    func refreshToken() async throws -> String {
        // PayloadCMS provides a token refresh endpoint
        var components = URLComponents(string: baseURL + "/api/users/refresh-token")!
        var urlRequest = URLRequest(url: components.url!)
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add the current token to the authorization header
        if let token = authToken {
            urlRequest.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            throw APIError.unauthorized
        }
        
        // Perform the request manually to handle cookies
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                
                // Parse the response which should contain a refreshedToken
                struct RefreshResponse: Decodable {
                    let refreshedToken: String
                    let exp: TimeInterval
                }
                
                let refreshResponse = try decoder.decode(RefreshResponse.self, from: data)
                
                // Update the stored token
                setAuthToken(refreshResponse.refreshedToken)
                KeychainService.shared.saveAuthToken(refreshResponse.refreshedToken)
                
                return refreshResponse.refreshedToken
            } catch {
                print("Decoding error: \(error)")
                throw APIError.decodingError(error)
            }
        case 401:
            // Token is invalid or expired
            clearAuthToken()
            KeychainService.shared.deleteAuthToken()
            throw APIError.unauthorized
        default:
            if let errorMessage = try? JSONDecoder().decode([String: String].self, from: data)["message"] {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.invalidResponse
        }
    }
    
    // Function to test the server connection
    func testServerConnection() async -> (Bool, String) {
        print("Testing server connection...")
        
        guard let url = URL(string: baseURL) else {
            return (false, "Invalid base URL")
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return (false, "Invalid HTTP response")
            }
            
            print("Server responded with status code: \(httpResponse.statusCode)")
            
            if (200...299).contains(httpResponse.statusCode) {
                return (true, "Connection successful")
            } else {
                return (false, "Server responded with status code: \(httpResponse.statusCode)")
            }
        } catch {
            print("Connection test failed: \(error)")
            return (false, "Connection failed: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Diagnostics
    
    func printAPIConfiguration() {
        print("--- API Configuration Diagnostics ---")
        print("Base URL: \(baseURL)")
        print("Auth Endpoint: \(authEndpoint)")
        print("Full Auth URL: \(baseURL + authEndpoint)")
        print("Auth Token: \(authToken != nil ? "Set (length: \(authToken!.count))" : "Not set")")
        print("-----------------------------------")
    }
    
    func validateURL() -> Bool {
        guard let url = URL(string: baseURL) else {
            print("Base URL is invalid: \(baseURL)")
            return false
        }
        
        guard let loginURL = URL(string: authEndpoint, relativeTo: url) else {
            print("Login URL is invalid: \(baseURL + authEndpoint)")
            return false
        }
        
        print("URL validation successful:")
        print("Base URL: \(url)")
        print("Login URL: \(loginURL)")
        return true
    }
    
    // Configure request with proper timeouts and cache policy
    private func configureRequest(_ request: URLRequest) -> URLRequest {
        var updatedRequest = request
        updatedRequest.timeoutInterval = 30 // 30 seconds timeout
        updatedRequest.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData // Don't use cache for auth requests
        return updatedRequest
    }
    
    // Verify server is reachable before attempting auth
    func verifyConnection() async -> Bool {
        print("Verifying connection to \(baseURL)")
        
        guard let url = URL(string: baseURL) else {
            print("Invalid base URL")
            return false
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "HEAD" // Use HEAD method to just check headers without downloading content
        request.timeoutInterval = 10 // 10 seconds timeout for connection check
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                print("Invalid HTTP response")
                return false
            }
            
            // Any response code indicates the server is reachable
            print("Server reachable, status code: \(httpResponse.statusCode)")
            return true
        } catch {
            print("Connection verification failed: \(error.localizedDescription)")
            return false
        }
    }
    
    // Enhanced error logging
    private func logDetailedError(error: Error, endpoint: String, request: URLRequest?, response: HTTPURLResponse?, data: Data?) {
        print("========== DETAILED ERROR LOG ==========")
        print("Endpoint: \(endpoint)")
        print("Error: \(error.localizedDescription)")
        
        // Log error details
        if let apiError = error as? APIError {
            print("API Error Type: \(apiError)")
        } else {
            print("Raw Error: \(error)")
        }
        
        // Log request details
        if let request = request {
            print("Request URL: \(request.url?.absoluteString ?? "nil")")
            print("Request Method: \(request.httpMethod ?? "nil")")
            print("Request Headers: \(request.allHTTPHeaderFields ?? [:])")
            if let body = request.httpBody, let bodyString = String(data: body, encoding: .utf8) {
                print("Request Body: \(bodyString)")
            }
        }
        
        // Log response details
        if let response = response {
            print("Response Status Code: \(response.statusCode)")
            print("Response Headers: \(response.allHeaderFields)")
        }
        
        // Log response data
        if let data = data, let dataString = String(data: data, encoding: .utf8) {
            print("Response Data: \(dataString)")
        }
        
        print("========== END ERROR LOG ==========")
    }
}

// MARK: - Helper Types
struct EmptyRequest: Codable {
    private struct AnyCodingKey: CodingKey {
        var intValue: Int? { nil }
        var stringValue: String { "" }
        
        init?(intValue: Int) { }
        init?(stringValue: String) { }
    }
    
    init() {}
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: AnyCodingKey.self)
        guard container.allKeys.isEmpty else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Expected empty object, but received object with keys"
                )
            )
        }
    }
}

// MARK: - Dictionary JSON Encoding Extensions

// Add extension to Dictionary to make it encodable
extension Dictionary where Key == String, Value == Any {
    var encodable: AnyEncodable {
        return AnyEncodable(self)
    }
}

// AnyEncodable wrapper to handle [String: Any] dictionaries
struct AnyEncodable: Encodable {
    private let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let string as String:
            try container.encode(string)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let bool as Bool:
            try container.encode(bool)
        case let array as [Any]:
            try container.encode(array.map { AnyEncodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyEncodable($0) })
        case let date as Date:
            try container.encode(date)
        case let url as URL:
            try container.encode(url.absoluteString)
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