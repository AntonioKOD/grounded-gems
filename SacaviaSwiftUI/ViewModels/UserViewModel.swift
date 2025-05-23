import Foundation
import CoreLocation
import SwiftUI

@MainActor
class UserViewModel: ObservableObject {
    @Published var user: User?
    @Published var isLoading = false
    @Published var error: Error?
    @Published var followers: [User] = []
    @Published var following: [User] = []
    @Published var userEvents: [Event] = []
    @Published var userPosts: [Post] = []
    
    private let apiService = APIService.shared
    private let locationManager = CLLocationManager()
    
    init() {
        setupLocationManager()
    }
    
    private func setupLocationManager() {
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.requestWhenInUseAuthorization()
    }
    
    func fetchUserProfile(_ userId: String) async {
        isLoading = true
        error = nil
        
        do {
            // Fetch user profile
            user = try await apiService.getUser(userId)
            
            // Fetch user's events
            userEvents = try await apiService.getUserEvents(userId)
            
            // Fetch user's posts
            userPosts = try await apiService.getUserPosts(userId)
            
            // Fetch followers and following
            if let followers = user?.followers {
                self.followers = try await apiService.getUsers(ids: followers)
            }
            if let following = user?.following {
                self.following = try await apiService.getUsers(ids: following)
            }
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    func updateProfile(userId: String, data: UpdateProfileRequest) async throws {
        isLoading = true
        error = nil
        
        do {
            // Convert UpdateProfileRequest to a dictionary
            let encoder = JSONEncoder()
            let jsonData = try encoder.encode(data)
            let dictionary = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] ?? [:]
            
            // Update using the dictionary version that will be properly wrapped with AnyEncodable
            user = try await apiService.updateProfile(userId, data: dictionary)
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func followUser(_ userId: String) async throws {
        error = nil
        
        do {
            try await apiService.followUser(userId)
            // Refresh user data to get updated followers/following lists
            if let currentUserId = user?.id {
                await fetchUserProfile(currentUserId)
            }
        } catch {
            self.error = error
            throw error
        }
    }
    
    func unfollowUser(_ userId: String) async throws {
        error = nil
        
        do {
            try await apiService.unfollowUser(userId)
            // Refresh user data to get updated followers/following lists
            if let currentUserId = user?.id {
                await fetchUserProfile(currentUserId)
            }
        } catch {
            self.error = error
            throw error
        }
    }
    
    func uploadProfileImage(_ image: UIImage) async throws -> Media {
        isLoading = true
        error = nil
        
        do {
            // Convert UIImage to Data
            guard let imageData = image.jpegData(compressionQuality: 0.8) else {
                throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to convert image to data"])
            }
            
            // Upload image
            let media = try await apiService.uploadMedia(data: imageData, type: "image/jpeg")
            
            // Update user profile with new image
            if let userId = user?.id {
                let updateRequest = UpdateProfileRequest(name: user?.name, bio: user?.bio, location: nil, interests: nil, socialLinks: nil)
                try await updateProfile(userId: userId, data: updateRequest)
            }
            
            return media
        } catch {
            self.error = error
            throw error
        }
        
        isLoading = false
    }
    
    func isFollowing(_ userId: String) -> Bool {
        user?.following?.contains(userId) ?? false
    }
    
    func getFollowerCount() -> Int {
        user?.followers?.count ?? 0
    }
    
    func getFollowingCount() -> Int {
        user?.following?.count ?? 0
    }
    
    func getPostCount() -> Int {
        user?.postCount ?? 0
    }
    
    func getReviewCount() -> Int {
        user?.reviewCount ?? 0
    }
    
    func getRecommendationCount() -> Int {
        user?.recommendationCount ?? 0
    }
    
    func getAverageRating() -> Double {
        user?.averageRating ?? 0.0
    }
    
    func fetchCurrentUser(userId: String) {
        Task {
            isLoading = true
            do {
                user = try await APIService.shared.getCurrentUser(userId: userId)
                error = nil
            } catch {
                self.error = error
            }
            isLoading = false
        }
    }
    
    func updateUserLocation(coordinate: CLLocationCoordinate2D) {
        guard let userId = user?.id else { return }
        
        Task {
            do {
                // The API service can now handle [String: Any] dictionaries with our AnyEncodable wrapper
                try await APIService.shared.updateUserLocation(
                    userId: userId,
                    coordinates: coordinate
                )
                // Refresh user data to get updated location
                await fetchUserProfile(userId)
            } catch {
                self.error = error
            }
        }
    }
    
    // MARK: - Helper Methods
    
    var isCreator: Bool {
        user?.isCreator ?? false
    }
    
    var userLocation: CLLocationCoordinate2D? {
        guard let coordinates = user?.userLocation?.coordinates else { return nil }
        return CLLocationCoordinate2D(
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
        )
    }
    
    var formattedLocation: String? {
        guard let location = user?.userLocation else { return nil }
        var components: [String] = []
        
        if let city = location.city {
            components.append(city)
        }
        if let state = location.state {
            components.append(state)
        }
        if let country = location.country {
            components.append(country)
        }
        
        return components.joined(separator: ", ")
    }
} 