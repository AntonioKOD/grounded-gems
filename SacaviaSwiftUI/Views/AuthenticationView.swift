import SwiftUI
import SafariServices
import Combine

struct AuthenticationView: View {
    @State private var isShowingLogin = true
    
    var body: some View {
        NavigationView {
            VStack {
                // Logo and Title
                Image("AppLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 120, height: 120)
                    .padding(.top, 50)
                
                Text("Sacavia")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(Color(red: 0.545, green: 0.271, blue: 0.075)) // #8B4513
                    .padding(.bottom, 30)
                
                // Segmented Control
                Picker("Authentication", selection: $isShowingLogin) {
                    Text("Login").tag(true)
                    Text("Sign Up").tag(false)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)
                
                if isShowingLogin {
                    LoginView()
                        .transition(.opacity)
                } else {
                    SignupView()
                        .transition(.opacity)
                }
                
                Spacer()
            }
            .background(Color(.systemBackground))
        }
    }
}

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showingWebAuth = false
    @State private var authURL = URL(string: "https://grounded-gems.vercel.app")!
    @State private var isTestingConnection = false
    @State private var connectionStatus = ""
    @State private var selectedEnvironment = 0
    @State private var customURL = ""
    @State private var showCustomURL = false
    @State private var showBiometricButton = false
    
    private let environments = ["Production", "Staging", "Development", "Custom"]
    
    var body: some View {
        VStack(spacing: 20) {
            // Environment Picker
            VStack(alignment: .leading) {
                Text("API Environment")
                    .font(.caption)
                    .foregroundColor(.gray)
                
                Picker("Environment", selection: $selectedEnvironment) {
                    ForEach(0..<environments.count, id: \.self) { index in
                        Text(environments[index]).tag(index)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .onChange(of: selectedEnvironment) { _ in
                    updateAPIEnvironment()
                    showCustomURL = selectedEnvironment == 3 // Show custom URL field if "Custom" is selected
                }
            }
            
            if showCustomURL {
                TextField("Custom API URL", text: $customURL)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.URL)
                    .onSubmit {
                        updateAPIEnvironment()
                    }
            }
            
            TextField("Email", text: $email)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)
                .accessibilityIdentifier("emailField")
                .disabled(isTestingConnection)
            
            SecureField("Password", text: $password)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .textContentType(.password)
                .accessibilityIdentifier("passwordField")
                .disabled(isTestingConnection)
            
            Button(action: login) {
                if authViewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Login")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(authViewModel.isLoading || !isFormValid || isTestingConnection)
            .accessibilityIdentifier("loginButton")
            
            // Add a "Login with Web" button
            Button(action: startWebAuthentication) {
                HStack {
                    Image(systemName: "globe")
                    Text("Login with Web")
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.gray.opacity(0.2))
            .foregroundColor(.primary)
            .cornerRadius(10)
            .disabled(authViewModel.isLoading || isTestingConnection)
            .accessibilityIdentifier("webLoginButton")
            
            // Add a Test Server Connection button
            Button(action: testServerConnection) {
                if isTestingConnection {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                } else {
                    Text("Test Server Connection")
                        .fontWeight(.medium)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.green.opacity(0.2))
            .foregroundColor(.primary)
            .cornerRadius(10)
            .disabled(authViewModel.isLoading)
            
            if showBiometricButton {
                Button(action: authenticateWithBiometrics) {
                    HStack {
                        Image(systemName: BiometricAuthManager.shared.getBiometricIconName())
                            .font(.title2)
                        Text("Log in with \(BiometricAuthManager.shared.getBiometricTypeName())")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.secondary.opacity(0.1))
                .foregroundColor(.primary)
                .cornerRadius(10)
                .padding(.top, 10)
            }
            
            if !connectionStatus.isEmpty {
                Text(connectionStatus)
                    .font(.caption)
                    .foregroundColor(connectionStatus.contains("successful") ? .green : .red)
                    .padding(.top, 5)
            }
            
            if !isFormValid {
                Text("Please enter a valid email and password")
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
        .padding()
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .sheet(isPresented: $showingWebAuth) {
            SafariView(url: authURL)
                .edgesIgnoringSafeArea(.all)
        }
        .onAppear {
            // Listen for authentication callback notification
            NotificationCenter.default.addObserver(forName: Notification.Name("AuthenticationCallback"), object: nil, queue: .main) { notification in
                if let code = notification.userInfo?["code"] as? String {
                    processAuthCode(code)
                }
            }
            
            // Listen for authentication error notification
            NotificationCenter.default.addObserver(forName: Notification.Name("AuthenticationError"), object: nil, queue: .main) { notification in
                if let error = notification.userInfo?["error"] as? String {
                    errorMessage = "Authentication error: \(error)"
                    showError = true
                    showingWebAuth = false
                }
            }
            
            // Test server connection on appear
            testServerConnection()
            
            setupBiometricAuthentication()
        }
        .onReceive(authViewModel.$error) { newError in
            if let error = newError {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
    
    private var isFormValid: Bool {
        !email.isEmpty && email.contains("@") && !password.isEmpty && password.count >= 6
    }
    
    private func login() {
        Task {
            do {
                // Clear any previous errors
                errorMessage = ""
                showError = false
                
                try await authViewModel.login(email: email, password: password)
                // Successfully logged in
                print("Login successful!")
                
                // Prompt user to enable biometric auth if available but not enabled
                promptForBiometricSetup()
            } catch let apiError as APIError {
                // Handle API errors specifically
                switch apiError {
                case .validationError(let errors):
                    // Handle validation errors (APIError code 5)
                    let errorMessages = errors.values.joined(separator: "\n")
                    errorMessage = "Validation error: \(errorMessages)"
                    showError = true
                case .networkError(let error):
                    // Handle network connectivity issues
                    if let urlError = error as? URLError {
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
                    } else {
                        errorMessage = "Network error: \(error.localizedDescription)"
                    }
                    showError = true
                case .unauthorized:
                    errorMessage = "Invalid email or password. Please try again."
                    showError = true
                case .serverError(let message):
                    errorMessage = "Server error: \(message)"
                    showError = true
                default:
                    // Error is already handled in AuthViewModel, display it
                    if let error = authViewModel.error {
                        errorMessage = error.localizedDescription
                        showError = true
                    } else {
                        errorMessage = "Login failed: \(apiError.localizedDescription)"
                        showError = true
                    }
                }
            } catch {
                errorMessage = "Login failed: \(error.localizedDescription)"
                showError = true
            }
        }
    }
    
    private func promptForBiometricSetup() {
        let biometricManager = BiometricAuthManager.shared
        
        // Only prompt if biometrics are available but not enabled
        if biometricManager.canUseBiometricAuthentication() && !biometricManager.isBiometricEnabled() {
            // Show alert asking user if they want to enable biometric authentication
            let biometricType = biometricManager.getBiometricTypeName()
            
            // Create an alert to ask the user
            let alert = UIAlertController(
                title: "Enable \(biometricType)",
                message: "Would you like to use \(biometricType) for faster login next time?",
                preferredStyle: .alert
            )
            
            alert.addAction(UIAlertAction(title: "Enable", style: .default) { _ in
                // Enable biometric authentication and save credentials
                biometricManager.setBiometricEnabled(true)
                KeychainService.shared.saveCredentials(email: self.email, password: self.password)
                print("Biometric authentication enabled and credentials saved")
            })
            
            alert.addAction(UIAlertAction(title: "Not Now", style: .cancel))
            
            // Present the alert
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                rootViewController.present(alert, animated: true)
            }
        }
    }
    
    private func startWebAuthentication() {
        // Construct the authentication URL for PayloadCMS
        let baseURL = "https://grounded-gems.vercel.app/login"
        let redirectURI = "groundedgems://auth/callback"
        
        // Build the full auth URL with all required parameters
        var components = URLComponents(string: baseURL)!
        
        // PayloadCMS uses a standard login page with a redirect parameter
        components.queryItems = [
            URLQueryItem(name: "redirect", value: redirectURI)
        ]
        
        guard let url = components.url else {
            errorMessage = "Failed to create authentication URL"
            showError = true
            return
        }
        
        authURL = url
        showingWebAuth = true
    }
    
    private func processAuthCode(_ code: String) {
        Task {
            do {
                try await authViewModel.processAuthCallback(code: code)
                showingWebAuth = false
                print("Web login successful!")
            } catch {
                errorMessage = "Authentication failed: \(error.localizedDescription)"
                showError = true
            }
        }
    }
    
    private func testServerConnection() {
        isTestingConnection = true
        connectionStatus = "Testing connection..."
        
        // First, validate URL format
        if !APIService.shared.validateURL() {
            DispatchQueue.main.async {
                self.connectionStatus = "Error: Invalid API URL format"
                self.isTestingConnection = false
            }
            return
        }
        
        // Print API configuration for diagnostics
        APIService.shared.printAPIConfiguration()
        
        Task {
            let (success, message) = await APIService.shared.testServerConnection()
            
            DispatchQueue.main.async {
                self.connectionStatus = message
                self.isTestingConnection = false
            }
        }
    }
    
    private func updateAPIEnvironment() {
        let apiService = APIService.shared
        
        switch selectedEnvironment {
        case 0:
            apiService.setEnvironment(.production)
        case 1:
            apiService.setEnvironment(.staging)
        case 2:
            apiService.setEnvironment(.development)
        case 3:
            if !customURL.isEmpty {
                apiService.setEnvironment(.custom, customURL: customURL)
            }
        default:
            apiService.setEnvironment(.production)
        }
        
        // After changing environment, test the connection
        testServerConnection()
    }
    
    private func setupBiometricAuthentication() {
        // Check if biometric authentication is available and enabled
        let biometricManager = BiometricAuthManager.shared
        showBiometricButton = biometricManager.canUseBiometricAuthentication() && biometricManager.isBiometricEnabled()
    }
    
    private func authenticateWithBiometrics() {
        Task {
            let result = await BiometricAuthManager.shared.authenticateWithBiometrics(
                reason: "Authenticate to access your Sacavia journey"
            )
            
            switch result {
            case .success(true):
                // Successful authentication - use stored credentials to log in
                if let storedEmail = KeychainService.shared.getStoredEmail(),
                   let storedPassword = KeychainService.shared.getStoredPassword() {
                    email = storedEmail
                    password = storedPassword
                    login()
                } else {
                    errorMessage = "No stored credentials found. Please log in with email and password."
                    showError = true
                }
            case .success(false):
                // User canceled or failed authentication
                print("Biometric authentication canceled or failed")
            case .failure(let error):
                // Authentication error
                errorMessage = "Biometric authentication failed: \(error.localizedDescription)"
                showError = true
            }
        }
    }
}

// Safari View Controller wrapper for in-app web authentication
struct SafariView: UIViewControllerRepresentable {
    let url: URL
    
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let safariViewController = SFSafariViewController(url: url)
        safariViewController.dismissButtonStyle = .close
        safariViewController.preferredControlTintColor = .blue
        return safariViewController
    }
    
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

struct SignupView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var locationManager: LocationManager
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showingWebAuth = false
    @State private var authURL = URL(string: "https://grounded-gems.vercel.app")!
    
    var body: some View {
        VStack(spacing: 20) {
            TextField("Name", text: $name)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .textContentType(.name)
            
            TextField("Email", text: $email)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)
            
            SecureField("Password", text: $password)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .textContentType(.newPassword)
            
            Button(action: signup) {
                if authViewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Sign Up")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(authViewModel.isLoading)
            
            // Add web signup button
            Button(action: startWebSignup) {
                HStack {
                    Image(systemName: "globe")
                    Text("Sign Up with Web")
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.gray.opacity(0.2))
            .foregroundColor(.primary)
            .cornerRadius(10)
            .disabled(authViewModel.isLoading)
        }
        .padding()
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .sheet(isPresented: $showingWebAuth) {
            SafariView(url: authURL)
                .edgesIgnoringSafeArea(.all)
        }
    }
    
    private func signup() {
        Task {
            do {
                var coords: [String: Double] = [:]
                if let location = locationManager.location {
                    coords = [
                        "latitude": location.coordinate.latitude,
                        "longitude": location.coordinate.longitude
                    ]
                }
                
                try await authViewModel.signup(
                    email: email,
                    password: password,
                    name: name,
                    coords: coords
                )
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
    
    private func startWebSignup() {
        // Construct the signup URL for PayloadCMS
        let baseURL = "https://grounded-gems.vercel.app/signup"
        let redirectURI = "groundedgems://auth/callback"
        
        // Build the signup URL
        var components = URLComponents(string: baseURL)!
        components.queryItems = [
            URLQueryItem(name: "redirect", value: redirectURI)
        ]
        
        authURL = components.url!
        showingWebAuth = true
    }
}

#Preview {
    AuthenticationView()
        .environmentObject(AuthViewModel())
        .environmentObject(LocationManager())
} 