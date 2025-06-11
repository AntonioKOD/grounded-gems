import Foundation

// MARK: - Authentication Request Models

struct LoginRequest: Codable {
    let email: String
    let password: String
    let rememberMe: Bool
    let deviceInfo: DeviceInfo?
    
    init(email: String, password: String, rememberMe: Bool = false) {
        self.email = email
        self.password = password
        self.rememberMe = rememberMe
        self.deviceInfo = DeviceInfo()
    }
}

struct RegisterRequest: Codable {
    let name: String
    let email: String
    let password: String
    let confirmPassword: String
    let location: LocationData?
    let preferences: UserPreferences?
    let deviceInfo: DeviceInfo?
    let termsAccepted: Bool
    let privacyAccepted: Bool
    
    init(name: String, email: String, password: String, confirmPassword: String, termsAccepted: Bool, privacyAccepted: Bool, location: LocationData? = nil, preferences: UserPreferences? = nil) {
        self.name = name
        self.email = email
        self.password = password
        self.confirmPassword = confirmPassword
        self.location = location
        self.preferences = preferences
        self.deviceInfo = DeviceInfo()
        self.termsAccepted = termsAccepted
        self.privacyAccepted = privacyAccepted
    }
}

struct DeviceInfo: Codable {
    let deviceId: String?
    let platform: String
    let appVersion: String?
    
    init() {
        self.deviceId = UIDevice.current.identifierForVendor?.uuidString
        self.platform = "ios"
        self.appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
    }
}

struct LocationData: Codable {
    let coordinates: Coordinates
    let address: String?
    
    struct Coordinates: Codable {
        let latitude: Double
        let longitude: Double
    }
}

struct UserPreferences: Codable {
    let categories: [String]
    let notifications: Bool
    let radius: Int
    
    init(categories: [String] = [], notifications: Bool = true, radius: Int = 25) {
        self.categories = categories
        self.notifications = notifications
        self.radius = radius
    }
}

// MARK: - Authentication Response Models

struct AuthResponse: Codable {
    let success: Bool
    let message: String
    let data: AuthData?
    let error: String?
    let code: String?
}

struct AuthData: Codable {
    let user: User
    let token: String
    let refreshToken: String?
    let expiresIn: Int
}

struct User: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let profileImage: ProfileImage?
    let location: UserLocation?
    let role: String
    let preferences: UserPreferencesResponse?
    let stats: UserStats?
    let deviceInfo: DeviceInfoResponse?
    let joinedAt: String?
    let lastLogin: String?
    
    struct ProfileImage: Codable {
        let url: String
    }
    
    struct UserLocation: Codable {
        let coordinates: Coordinates?
        let address: String?
        
        struct Coordinates: Codable {
            let latitude: Double
            let longitude: Double
        }
    }
    
    struct UserPreferencesResponse: Codable {
        let categories: [String]
        let notifications: Bool
        let radius: Int?
    }
    
    struct UserStats: Codable {
        let postsCount: Int
        let followersCount: Int
        let followingCount: Int
        let savedPostsCount: Int
        let likedPostsCount: Int
    }
    
    struct DeviceInfoResponse: Codable {
        let platform: String?
        let appVersion: String?
        let lastSeen: String?
    }
}

// MARK: - Onboarding Models

struct OnboardingData: Codable {
    let interests: [String]
    let useCase: String
    let travelRadius: Int
    let budget: String
    let location: LocationData?
    let notificationSettings: NotificationSettings
    
    init(interests: [String] = [], useCase: String = "explorer", travelRadius: Int = 25, budget: String = "moderate", location: LocationData? = nil, notificationSettings: NotificationSettings = NotificationSettings()) {
        self.interests = interests
        self.useCase = useCase
        self.travelRadius = travelRadius
        self.budget = budget
        self.location = location
        self.notificationSettings = notificationSettings
    }
}

struct NotificationSettings: Codable {
    let pushNotifications: Bool
    let emailNotifications: Bool
    let locationUpdates: Bool
    
    init(pushNotifications: Bool = true, emailNotifications: Bool = true, locationUpdates: Bool = true) {
        self.pushNotifications = pushNotifications
        self.emailNotifications = emailNotifications
        self.locationUpdates = locationUpdates
    }
}

// MARK: - Onboarding Options

struct InterestCategory {
    let id: String
    let name: String
    let icon: String
    let description: String
    
    static let allCategories = [
        InterestCategory(id: "dining", name: "Dining", icon: "fork.knife", description: "Restaurants & Food"),
        InterestCategory(id: "nightlife", name: "Nightlife", icon: "moon.stars", description: "Bars & Entertainment"),
        InterestCategory(id: "outdoor", name: "Outdoor", icon: "mountain.2", description: "Nature & Adventure"),
        InterestCategory(id: "culture", name: "Culture", icon: "building.columns", description: "Museums & Arts"),
        InterestCategory(id: "shopping", name: "Shopping", icon: "bag", description: "Retail & Markets"),
        InterestCategory(id: "wellness", name: "Wellness", icon: "heart", description: "Health & Spa"),
        InterestCategory(id: "sports", name: "Sports", icon: "sportscourt", description: "Fitness & Recreation"),
        InterestCategory(id: "coffee", name: "Coffee", icon: "cup.and.saucer", description: "Cafes & Coffee Shops"),
        InterestCategory(id: "events", name: "Events", icon: "calendar", description: "Festivals & Gatherings"),
        InterestCategory(id: "historic", name: "Historic", icon: "clock", description: "Historical Sites")
    ]
}

struct UseCaseOption {
    let id: String
    let title: String
    let subtitle: String
    let icon: String
    
    static let allUseCases = [
        UseCaseOption(id: "explorer", title: "Explorer", subtitle: "Discover new places and hidden gems", icon: "map"),
        UseCaseOption(id: "local", title: "Local Guide", subtitle: "Share favorite spots with others", icon: "location"),
        UseCaseOption(id: "traveler", title: "Traveler", subtitle: "Find authentic experiences while traveling", icon: "airplane"),
        UseCaseOption(id: "socializer", title: "Socializer", subtitle: "Connect with like-minded people", icon: "person.2"),
        UseCaseOption(id: "planner", title: "Event Planner", subtitle: "Organize gatherings and activities", icon: "calendar.badge.plus")
    ]
}

struct TravelRadiusOption {
    let id: Int
    let title: String
    let subtitle: String
    
    static let allOptions = [
        TravelRadiusOption(id: 5, title: "5 miles", subtitle: "Walking distance"),
        TravelRadiusOption(id: 15, title: "15 miles", subtitle: "Short drive"),
        TravelRadiusOption(id: 25, title: "25 miles", subtitle: "Day trip"),
        TravelRadiusOption(id: 50, title: "50 miles", subtitle: "Weekend adventure"),
        TravelRadiusOption(id: 100, title: "100+ miles", subtitle: "Extended travel")
    ]
}

struct BudgetOption {
    let id: String
    let title: String
    let subtitle: String
    let icon: String
    
    static let allOptions = [
        BudgetOption(id: "budget", title: "Budget", subtitle: "Free to $20 activities", icon: "dollarsign.circle"),
        BudgetOption(id: "moderate", title: "Moderate", subtitle: "$20-50 experiences", icon: "dollarsign.circle.fill"),
        BudgetOption(id: "premium", title: "Premium", subtitle: "$50+ luxury experiences", icon: "crown"),
        BudgetOption(id: "mixed", title: "Mixed", subtitle: "All price ranges", icon: "infinity")
    ]
}

// MARK: - Error Models

struct APIError: Error, LocalizedError {
    let message: String
    let code: String?
    
    var errorDescription: String? {
        return message
    }
    
    static let networkError = APIError(message: "Network connection failed", code: "NETWORK_ERROR")
    static let invalidCredentials = APIError(message: "Invalid email or password", code: "INVALID_CREDENTIALS")
    static let userExists = APIError(message: "An account with this email already exists", code: "USER_EXISTS")
    static let validationError = APIError(message: "Please check your input", code: "VALIDATION_ERROR")
    static let serverError = APIError(message: "Server error occurred", code: "SERVER_ERROR")
} 