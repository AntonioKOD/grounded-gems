import SwiftUI

struct ContentView: View {
    @StateObject private var tokenManager = TokenManager.shared
    @StateObject private var authViewModel = AuthViewModel()
    @State private var isAppLaunched = false
    
    var body: some View {
        Group {
            if !isAppLaunched {
                // Splash Screen
                SplashView()
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            withAnimation(.easeInOut(duration: 0.5)) {
                                isAppLaunched = true
                            }
                        }
                    }
            } else {
                // Main App Content
                if tokenManager.isAuthenticated {
                    AuthenticatedContentView()
                        .environmentObject(tokenManager)
                        .environmentObject(authViewModel)
                } else {
                    UnauthenticatedContentView()
                        .environmentObject(tokenManager)
                        .environmentObject(authViewModel)
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: tokenManager.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: isAppLaunched)
    }
}

// MARK: - Splash View

struct SplashView: View {
    var body: some View {
        ZStack {
            SacaviaColors.backgroundGradient
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // App Logo
                Image(systemName: "map.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(SacaviaColors.primaryGradient)
                
                // App Name
                VStack(spacing: 8) {
                    Text("Sacavia")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    Text("Discover. Connect. Explore.")
                        .font(.subheadline)
                        .foregroundColor(SacaviaColors.textSecondary)
                }
                
                // Loading Indicator
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: SacaviaColors.coral))
                    .scaleEffect(1.2)
            }
        }
    }
}

// MARK: - Unauthenticated Content

struct UnauthenticatedContentView: View {
    var body: some View {
        NavigationView {
            LoginView()
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

// MARK: - Authenticated Content

struct AuthenticatedContentView: View {
    @EnvironmentObject var tokenManager: TokenManager
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var selectedTab = 0
    @State private var showingOnboarding = false
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Home/Feed Tab
            HomeView()
                .tabItem {
                    Image(systemName: selectedTab == 0 ? "house.fill" : "house")
                    Text("Home")
                }
                .tag(0)
            
            // Explore Tab
            ExploreView()
                .tabItem {
                    Image(systemName: selectedTab == 1 ? "safari.fill" : "safari")
                    Text("Explore")
                }
                .tag(1)
            
            // Map Tab
            MapView()
                .tabItem {
                    Image(systemName: selectedTab == 2 ? "map.fill" : "map")
                    Text("Map")
                }
                .tag(2)
            
            // Bucket List Tab
            BucketListView()
                .tabItem {
                    Image(systemName: selectedTab == 3 ? "heart.fill" : "heart")
                    Text("Saved")
                }
                .tag(3)
            
            // Profile Tab
            ProfileView()
                .tabItem {
                    Image(systemName: selectedTab == 4 ? "person.fill" : "person")
                    Text("Profile")
                }
                .tag(4)
        }
        .accentColor(SacaviaColors.coral)
        .onAppear {
            setupTabBarAppearance()
            checkOnboardingStatus()
        }
        .fullScreenCover(isPresented: $showingOnboarding) {
            OnboardingView()
        }
    }
    
    private func setupTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.white
        
        // Selected item appearance
        appearance.stackedLayoutAppearance.selected.iconColor = UIColor(SacaviaColors.coral)
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: UIColor(SacaviaColors.coral)
        ]
        
        // Normal item appearance
        appearance.stackedLayoutAppearance.normal.iconColor = UIColor.systemGray
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor.systemGray
        ]
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    
    private func checkOnboardingStatus() {
        // Check if user needs onboarding
        if let user = tokenManager.currentUser {
            // You can check user's onboarding status here
            // For now, we'll assume all new users need onboarding
            showingOnboarding = false // Set to true if onboarding is needed
        }
    }
}

// MARK: - Placeholder Views

struct HomeView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Good morning")
                                    .font(.subheadline)
                                    .foregroundColor(SacaviaColors.textSecondary)
                                
                                Text("Ready to explore?")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(SacaviaColors.textPrimary)
                            }
                            
                            Spacer()
                            
                            Button(action: {}) {
                                Image(systemName: "bell")
                                    .font(.title3)
                                    .foregroundColor(SacaviaColors.textSecondary)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top)
                    }
                    
                    // Quick Actions
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 16) {
                        QuickActionCard(
                            icon: "location.magnifyingglass",
                            title: "Discover",
                            subtitle: "Find new places",
                            color: SacaviaColors.coral
                        )
                        
                        QuickActionCard(
                            icon: "map",
                            title: "Explore",
                            subtitle: "See what's nearby",
                            color: SacaviaColors.teal
                        )
                    }
                    .padding(.horizontal)
                    
                    // Recent Activity
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Recent Activity")
                                .font(.headline)
                                .foregroundColor(SacaviaColors.textPrimary)
                            
                            Spacer()
                            
                            Button("See All") {}
                                .font(.footnote)
                                .foregroundColor(SacaviaColors.coral)
                        }
                        .padding(.horizontal)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 16) {
                                ForEach(0..<5, id: \.self) { _ in
                                    ActivityCard()
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    
                    Spacer()
                }
            }
            .navigationBarHidden(true)
        }
    }
}

struct ExploreView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("Explore")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(SacaviaColors.textPrimary)
                
                Text("Discover amazing places around you")
                    .font(.body)
                    .foregroundColor(SacaviaColors.textSecondary)
                    .multilineTextAlignment(.center)
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
}

struct MapView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("Map")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(SacaviaColors.textPrimary)
                
                Text("Interactive map of places")
                    .font(.body)
                    .foregroundColor(SacaviaColors.textSecondary)
                    .multilineTextAlignment(.center)
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
}

struct BucketListView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("Saved Places")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(SacaviaColors.textPrimary)
                
                Text("Your bucket list and saved locations")
                    .font(.body)
                    .foregroundColor(SacaviaColors.textSecondary)
                    .multilineTextAlignment(.center)
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
}

struct ProfileView: View {
    @EnvironmentObject var tokenManager: TokenManager
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Profile Header
                VStack(spacing: 16) {
                    AsyncImage(url: URL(string: tokenManager.currentUser?.profileImage?.url ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(SacaviaColors.textTertiary)
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(Circle())
                    
                    VStack(spacing: 4) {
                        Text(tokenManager.currentUser?.name ?? "User")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(SacaviaColors.textPrimary)
                        
                        Text(tokenManager.currentUser?.email ?? "")
                            .font(.subheadline)
                            .foregroundColor(SacaviaColors.textSecondary)
                    }
                }
                
                // Profile Options
                VStack(spacing: 12) {
                    ProfileOptionRow(icon: "gearshape", title: "Settings", action: {})
                    ProfileOptionRow(icon: "heart", title: "Saved Places", action: {})
                    ProfileOptionRow(icon: "person.2", title: "Friends", action: {})
                    ProfileOptionRow(icon: "questionmark.circle", title: "Help & Support", action: {})
                    
                    Divider()
                    
                    ProfileOptionRow(
                        icon: "rectangle.portrait.and.arrow.right",
                        title: "Sign Out",
                        action: {
                            tokenManager.logout()
                        },
                        isDestructive: true
                    )
                }
                .padding(.horizontal)
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
}

// MARK: - Supporting Views

struct QuickActionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        Button(action: {}) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                
                VStack(spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(SacaviaColors.textSecondary)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 100)
            .background(SacaviaColors.cardBackground)
            .cornerRadius(12)
            .shadow(color: SacaviaColors.shadowLight, radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ActivityCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 8)
                .fill(SacaviaColors.coral.opacity(0.3))
                .frame(width: 120, height: 80)
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Coffee Shop")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(SacaviaColors.textPrimary)
                
                Text("Downtown")
                    .font(.caption2)
                    .foregroundColor(SacaviaColors.textSecondary)
            }
        }
        .frame(width: 120)
    }
}

struct ProfileOptionRow: View {
    let icon: String
    let title: String
    let action: () -> Void
    var isDestructive: Bool = false
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(isDestructive ? SacaviaColors.error : SacaviaColors.textSecondary)
                    .frame(width: 24)
                
                Text(title)
                    .font(.body)
                    .foregroundColor(isDestructive ? SacaviaColors.error : SacaviaColors.textPrimary)
                
                Spacer()
                
                if !isDestructive {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(SacaviaColors.textTertiary)
                }
            }
            .padding()
            .background(SacaviaColors.cardBackground)
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview

#Preview {
    ContentView()
} 