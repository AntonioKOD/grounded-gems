import SwiftUI
import CoreLocation

@MainActor
class AuthViewModel: ObservableObject {
    // MARK: - Authentication State
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // MARK: - Login Form
    @Published var loginEmail = ""
    @Published var loginPassword = ""
    @Published var rememberMe = false
    @Published var showLoginPassword = false
    
    // MARK: - Signup Form
    @Published var signupName = ""
    @Published var signupEmail = ""
    @Published var signupPassword = ""
    @Published var confirmPassword = ""
    @Published var showSignupPassword = false
    @Published var showConfirmPassword = false
    @Published var termsAccepted = false
    @Published var privacyAccepted = false
    
    // MARK: - Onboarding State
    @Published var onboardingStep = 0
    @Published var selectedInterests: Set<String> = []
    @Published var selectedUseCase = "explorer"
    @Published var selectedRadius = 25
    @Published var selectedBudget = "moderate"
    @Published var notificationSettings = NotificationSettings()
    @Published var locationPermissionGranted = false
    @Published var currentLocation: LocationData?
    
    // MARK: - Form Validation
    @Published var passwordStrength: PasswordStrength = .weak
    
    enum PasswordStrength: String, CaseIterable {
        case weak = "Weak"
        case fair = "Fair"
        case good = "Good"
        case strong = "Strong"
        
        var color: Color {
            switch self {
            case .weak: return SacaviaColors.error
            case .fair: return SacaviaColors.warning
            case .good: return SacaviaColors.info
            case .strong: return SacaviaColors.success
            }
        }
        
        var progress: Double {
            switch self {
            case .weak: return 0.25
            case .fair: return 0.5
            case .good: return 0.75
            case .strong: return 1.0
            }
        }
    }
    
    private let tokenManager = TokenManager.shared
    private let apiService = APIService.shared
    private let locationManager = LocationManager()
    
    init() {
        // Observe token manager changes
        tokenManager.$isAuthenticated
            .assign(to: &$isAuthenticated)
        
        tokenManager.$currentUser
            .assign(to: &$currentUser)
    }
    
    // MARK: - Authentication Methods
    
    func login() async {
        guard validateLoginForm() else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await apiService.login(
                email: loginEmail.trimmingCharacters(in: .whitespacesAndNewlines),
                password: loginPassword,
                rememberMe: rememberMe
            )
            
            if let authData = response.data {
                tokenManager.saveToken(authData.token)
                tokenManager.saveUser(authData.user)
                clearLoginForm()
            } else {
                errorMessage = response.error ?? "Login failed"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func register() async {
        guard validateSignupForm() else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await apiService.register(
                name: signupName.trimmingCharacters(in: .whitespacesAndNewlines),
                email: signupEmail.trimmingCharacters(in: .whitespacesAndNewlines),
                password: signupPassword,
                confirmPassword: confirmPassword,
                termsAccepted: termsAccepted,
                privacyAccepted: privacyAccepted,
                location: currentLocation
            )
            
            if let authData = response.data {
                tokenManager.saveToken(authData.token)
                tokenManager.saveUser(authData.user)
                clearSignupForm()
                // Navigate to onboarding
                onboardingStep = 0
            } else {
                errorMessage = response.error ?? "Registration failed"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func logout() async {
        isLoading = true
        
        do {
            try await apiService.logout()
        } catch {
            print("Logout error: \(error)")
        }
        
        tokenManager.clearToken()
        clearAllForms()
        isLoading = false
    }
    
    func completeOnboarding() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let onboardingData = OnboardingData(
                interests: Array(selectedInterests),
                useCase: selectedUseCase,
                travelRadius: selectedRadius,
                budget: selectedBudget,
                location: currentLocation,
                notificationSettings: notificationSettings
            )
            
            let updatedUser = try await apiService.updateProfile(data: onboardingData)
            tokenManager.saveUser(updatedUser)
            
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    // MARK: - Form Validation
    
    func validateLoginForm() -> Bool {
        errorMessage = nil
        
        if loginEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "Email is required"
            return false
        }
        
        if !isValidEmail(loginEmail) {
            errorMessage = "Please enter a valid email address"
            return false
        }
        
        if loginPassword.isEmpty {
            errorMessage = "Password is required"
            return false
        }
        
        return true
    }
    
    func validateSignupForm() -> Bool {
        errorMessage = nil
        
        if signupName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "Name is required"
            return false
        }
        
        if signupEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "Email is required"
            return false
        }
        
        if !isValidEmail(signupEmail) {
            errorMessage = "Please enter a valid email address"
            return false
        }
        
        if signupPassword.isEmpty {
            errorMessage = "Password is required"
            return false
        }
        
        if signupPassword.count < 8 {
            errorMessage = "Password must be at least 8 characters"
            return false
        }
        
        if signupPassword != confirmPassword {
            errorMessage = "Passwords do not match"
            return false
        }
        
        if !termsAccepted {
            errorMessage = "Please accept the terms of service"
            return false
        }
        
        if !privacyAccepted {
            errorMessage = "Please accept the privacy policy"
            return false
        }
        
        return true
    }
    
    func updatePasswordStrength() {
        passwordStrength = calculatePasswordStrength(signupPassword)
    }
    
    private func calculatePasswordStrength(_ password: String) -> PasswordStrength {
        var score = 0
        
        if password.count >= 8 { score += 1 }
        if password.count >= 12 { score += 1 }
        if password.rangeOfCharacter(from: .lowercaseLetters) != nil { score += 1 }
        if password.rangeOfCharacter(from: .uppercaseLetters) != nil { score += 1 }
        if password.rangeOfCharacter(from: .decimalDigits) != nil { score += 1 }
        if password.rangeOfCharacter(from: CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{}|;:,.<>?")) != nil { score += 1 }
        
        switch score {
        case 0...2: return .weak
        case 3...4: return .fair
        case 5: return .good
        case 6...: return .strong
        default: return .weak
        }
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    // MARK: - Location Methods
    
    func requestLocationPermission() {
        locationManager.requestPermission { [weak self] granted, location in
            DispatchQueue.main.async {
                self?.locationPermissionGranted = granted
                if let location = location {
                    self?.currentLocation = LocationData(
                        coordinates: LocationData.Coordinates(
                            latitude: location.coordinate.latitude,
                            longitude: location.coordinate.longitude
                        ),
                        address: nil // You can implement reverse geocoding here
                    )
                }
            }
        }
    }
    
    // MARK: - Onboarding Navigation
    
    func nextOnboardingStep() {
        onboardingStep += 1
    }
    
    func previousOnboardingStep() {
        onboardingStep = max(0, onboardingStep - 1)
    }
    
    func toggleInterest(_ interest: String) {
        if selectedInterests.contains(interest) {
            selectedInterests.remove(interest)
        } else {
            selectedInterests.insert(interest)
        }
    }
    
    // MARK: - Form Management
    
    func clearLoginForm() {
        loginEmail = ""
        loginPassword = ""
        rememberMe = false
        showLoginPassword = false
    }
    
    func clearSignupForm() {
        signupName = ""
        signupEmail = ""
        signupPassword = ""
        confirmPassword = ""
        showSignupPassword = false
        showConfirmPassword = false
        termsAccepted = false
        privacyAccepted = false
        passwordStrength = .weak
    }
    
    func clearOnboardingData() {
        onboardingStep = 0
        selectedInterests.removeAll()
        selectedUseCase = "explorer"
        selectedRadius = 25
        selectedBudget = "moderate"
        notificationSettings = NotificationSettings()
        locationPermissionGranted = false
        currentLocation = nil
    }
    
    func clearAllForms() {
        clearLoginForm()
        clearSignupForm()
        clearOnboardingData()
        errorMessage = nil
    }
    
    func clearError() {
        errorMessage = nil
    }
}

// MARK: - Location Manager

private class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var completion: ((Bool, CLLocation?) -> Void)?
    
    override init() {
        super.init()
        manager.delegate = self
    }
    
    func requestPermission(completion: @escaping (Bool, CLLocation?) -> Void) {
        self.completion = completion
        
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            completion(false, nil)
        @unknown default:
            completion(false, nil)
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else { return }
        completion?(true, location)
        completion = nil
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        completion?(false, nil)
        completion = nil
    }
    
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        switch status {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            completion?(false, nil)
            completion = nil
        default:
            break
        }
    }
} 