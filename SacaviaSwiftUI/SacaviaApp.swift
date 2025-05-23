import SwiftUI
import CoreLocation

@main
struct SacaviaApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var locationManager = LocationManager()
    
    // Register AppDelegate for URL handling
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
                .environmentObject(locationManager)
                .onOpenURL { url in
                    // Handle deep links and authentication callbacks
                    print("App opened with URL: \(url)")
                    
                    // Parse URL and handle authentication callback
                    if url.absoluteString.contains("auth/callback") || url.absoluteString.contains("oauth") {
                        handleAuthURL(url)
                    }
                }
        }
    }
    
    // Handle authentication URL callback
    private func handleAuthURL(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            print("Invalid authentication URL or missing code")
            return
        }
        
        print("Processing authentication with code: \(code)")
        
        // Process the authentication in your view model
        Task {
            do {
                // Call appropriate authentication method with the code
                // This is a placeholder - implement the actual method in your AuthViewModel
                try await authViewModel.processAuthCallback(code: code)
            } catch {
                print("Authentication error: \(error.localizedDescription)")
            }
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showingError = false
    @State private var errorMessage = ""
    
    var body: some View {
        Group {
            if authViewModel.isLoading {
                LoadingView(message: "Loading...")
            } else if authViewModel.isAuthenticated {
                MainTabView()
            } else {
                AuthenticationView()
            }
        }
        .onReceive(authViewModel.$error.compactMap { $0 }) { error in
            errorMessage = error.localizedDescription
            showingError = true
        }
        .alert("Authentication Error", isPresented: $showingError) {
            Button("OK", role: .cancel) {
                // Clear the error
                authViewModel.error = nil
            }
        } message: {
            Text(errorMessage)
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            FeedView()
                .tabItem {
                    Label("Feed", systemImage: "list.bullet")
                }
            
            EventsView()
                .tabItem {
                    Label("Events", systemImage: "calendar")
                }
            
            LocationMapView()
                .tabItem {
                    Label("Map", systemImage: "map")
                }
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person")
                }
        }
    }
}

// MARK: - Profile View
struct ProfileView: View {
    @EnvironmentObject var userViewModel: UserViewModel
    
    var body: some View {
        Group {
            if userViewModel.isLoading {
                LoadingView()
            } else if let error = userViewModel.error {
                ErrorView(error: error) {
                    // Retry loading user
                    if let userId = userViewModel.currentUser?.id {
                        userViewModel.fetchCurrentUser(userId: userId)
                    }
                }
            } else if let user = userViewModel.currentUser {
                ScrollView {
                    VStack(spacing: 20) {
                        // Profile Header
                        VStack {
                            AsyncImageView(url: user.profileImage)
                                .frame(width: 120, height: 120)
                                .clipShape(Circle())
                            
                            Text(user.name)
                                .font(.title)
                            
                            if let bio = user.bio {
                                Text(bio)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal)
                            }
                            
                            if let location = userViewModel.formattedLocation {
                                HStack {
                                    Image(systemName: "location.fill")
                                    Text(location)
                                }
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        
                        // Creator Status
                        if user.isCreator {
                            VStack(alignment: .leading) {
                                Text("Creator Status")
                                    .font(.headline)
                                
                                HStack {
                                    Image(systemName: "star.fill")
                                        .foregroundColor(.yellow)
                                    Text(user.creatorLevel?.rawValue.capitalized ?? "Explorer")
                                }
                            }
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(10)
                            .padding(.horizontal)
                        }
                        
                        // Sports Preferences
                        if let sports = user.sportsPreferences?.sports, !sports.isEmpty {
                            VStack(alignment: .leading) {
                                Text("Sports")
                                    .font(.headline)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack {
                                        ForEach(sports, id: \.self) { sport in
                                            Text(sport.capitalized)
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 6)
                                                .background(Color.green.opacity(0.1))
                                                .cornerRadius(15)
                                        }
                                    }
                                }
                            }
                            .padding()
                        }
                        
                        // Social Links
                        if let socialLinks = user.socialLinks, !socialLinks.isEmpty {
                            VStack(alignment: .leading) {
                                Text("Social Links")
                                    .font(.headline)
                                
                                ForEach(socialLinks, id: \.url) { link in
                                    HStack {
                                        Image(systemName: socialIcon(for: link.platform))
                                        Text(link.platform.rawValue.capitalized)
                                        Spacer()
                                        Image(systemName: "arrow.right")
                                    }
                                    .padding()
                                    .background(Color.gray.opacity(0.1))
                                    .cornerRadius(10)
                                }
                            }
                            .padding()
                        }
                    }
                }
            } else {
                VStack {
                    Text("Please sign in to view your profile")
                        .font(.headline)
                    
                    Button("Sign In") {
                        // Handle sign in
                    }
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            }
        }
        .navigationTitle("Profile")
    }
    
    private func socialIcon(for platform: User.SocialLink.Platform) -> String {
        switch platform {
        case .instagram: return "camera"
        case .twitter: return "bird"
        case .facebook: return "person.2.square.stack"
        case .linkedin: return "network"
        case .website: return "globe"
        case .other: return "link"
        }
    }
} 