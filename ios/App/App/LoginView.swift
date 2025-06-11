import SwiftUI

struct LoginView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @FocusState private var focusedField: Field?
    
    enum Field {
        case email, password
    }
    
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 0) {
                    // Header Section
                    VStack(spacing: 24) {
                        Spacer()
                            .frame(height: geometry.safeAreaInsets.top + 20)
                        
                        // Logo and Welcome
                        VStack(spacing: 16) {
                            // App Logo
                            Image(systemName: "map.circle.fill")
                                .font(.system(size: 64))
                                .foregroundStyle(SacaviaColors.primaryGradient)
                            
                            VStack(spacing: 8) {
                                Text("Welcome back")
                                    .font(.largeTitle)
                                    .fontWeight(.bold)
                                    .foregroundColor(SacaviaColors.textPrimary)
                                
                                Text("Discover authentic places guided by local wisdom")
                                    .font(.body)
                                    .foregroundColor(SacaviaColors.textSecondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal)
                            }
                        }
                        
                        Spacer()
                            .frame(height: 20)
                    }
                    .frame(maxWidth: .infinity)
                    .background(SacaviaColors.backgroundGradient)
                    
                    // Login Form Section
                    VStack(spacing: 24) {
                        VStack(spacing: 20) {
                            // Error Alert
                            if let errorMessage = authViewModel.errorMessage {
                                HStack {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .foregroundColor(SacaviaColors.error)
                                    Text(errorMessage)
                                        .font(.footnote)
                                        .foregroundColor(SacaviaColors.error)
                                    Spacer()
                                    Button("Dismiss") {
                                        authViewModel.clearError()
                                    }
                                    .font(.footnote)
                                    .foregroundColor(SacaviaColors.coral)
                                }
                                .padding()
                                .background(SacaviaColors.error.opacity(0.1))
                                .cornerRadius(8)
                                .accessibilityLabel("Error: \(errorMessage)")
                            }
                            
                            // Email Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(SacaviaColors.textPrimary)
                                
                                HStack {
                                    Image(systemName: "envelope")
                                        .foregroundColor(SacaviaColors.textTertiary)
                                        .frame(width: 16)
                                    
                                    TextField("your@email.com", text: $authViewModel.loginEmail)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .keyboardType(.emailAddress)
                                        .textContentType(.emailAddress)
                                        .autocapitalization(.none)
                                        .autocorrectionDisabled()
                                        .focused($focusedField, equals: .email)
                                        .accessibilityLabel("Email address")
                                }
                                .padding()
                                .background(SacaviaColors.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(
                                            focusedField == .email ? SacaviaColors.coral : Color.gray.opacity(0.3),
                                            lineWidth: focusedField == .email ? 2 : 1
                                        )
                                )
                                .cornerRadius(8)
                            }
                            
                            // Password Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(SacaviaColors.textPrimary)
                                
                                HStack {
                                    Image(systemName: "lock")
                                        .foregroundColor(SacaviaColors.textTertiary)
                                        .frame(width: 16)
                                    
                                    if authViewModel.showLoginPassword {
                                        TextField("Enter your password", text: $authViewModel.loginPassword)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .focused($focusedField, equals: .password)
                                    } else {
                                        SecureField("Enter your password", text: $authViewModel.loginPassword)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .textContentType(.password)
                                            .focused($focusedField, equals: .password)
                                    }
                                    
                                    Button(action: {
                                        authViewModel.showLoginPassword.toggle()
                                    }) {
                                        Image(systemName: authViewModel.showLoginPassword ? "eye.slash" : "eye")
                                            .foregroundColor(SacaviaColors.textTertiary)
                                    }
                                    .accessibilityLabel(authViewModel.showLoginPassword ? "Hide password" : "Show password")
                                }
                                .padding()
                                .background(SacaviaColors.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(
                                            focusedField == .password ? SacaviaColors.coral : Color.gray.opacity(0.3),
                                            lineWidth: focusedField == .password ? 2 : 1
                                        )
                                )
                                .cornerRadius(8)
                                .accessibilityLabel("Password")
                            }
                            
                            // Remember Me & Forgot Password
                            HStack {
                                Toggle(isOn: $authViewModel.rememberMe) {
                                    Text("Remember me")
                                        .font(.footnote)
                                        .foregroundColor(SacaviaColors.textSecondary)
                                }
                                .toggleStyle(CheckboxToggleStyle())
                                
                                Spacer()
                                
                                Button("Forgot password?") {
                                    // Handle forgot password
                                }
                                .font(.footnote)
                                .foregroundColor(SacaviaColors.coral)
                            }
                        }
                        
                        // Login Button
                        Button(action: {
                            Task {
                                await authViewModel.login()
                            }
                        }) {
                            HStack {
                                if authViewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Text("Sign In")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(
                                authViewModel.isLoading ? 
                                    SacaviaColors.coral.opacity(0.6) : SacaviaColors.coral
                            )
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .disabled(authViewModel.isLoading)
                        .accessibilityLabel("Sign in")
                        .accessibilityHint("Double tap to sign in with your email and password")
                        
                        // Divider
                        HStack {
                            Rectangle()
                                .frame(height: 1)
                                .foregroundColor(Color.gray.opacity(0.3))
                            
                            Text("or")
                                .font(.footnote)
                                .foregroundColor(SacaviaColors.textSecondary)
                                .padding(.horizontal, 16)
                            
                            Rectangle()
                                .frame(height: 1)
                                .foregroundColor(Color.gray.opacity(0.3))
                        }
                        
                        // Social Login Buttons
                        VStack(spacing: 12) {
                            // Apple Sign In
                            Button(action: {
                                // Handle Apple Sign In
                            }) {
                                HStack {
                                    Image(systemName: "apple.logo")
                                        .font(.title3)
                                    Text("Continue with Apple")
                                        .fontWeight(.medium)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.black)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                            }
                            .accessibilityLabel("Sign in with Apple")
                            
                            // Google Sign In
                            Button(action: {
                                // Handle Google Sign In
                            }) {
                                HStack {
                                    Image(systemName: "globe")
                                        .font(.title3)
                                    Text("Continue with Google")
                                        .fontWeight(.medium)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.white)
                                .foregroundColor(.black)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                                .cornerRadius(8)
                            }
                            .accessibilityLabel("Sign in with Google")
                        }
                        
                        // Sign Up Link
                        HStack {
                            Text("Don't have an account?")
                                .font(.footnote)
                                .foregroundColor(SacaviaColors.textSecondary)
                            
                            NavigationLink("Sign up") {
                                SignupView()
                            }
                            .font(.footnote)
                            .fontWeight(.medium)
                            .foregroundColor(SacaviaColors.coral)
                        }
                        .padding(.top, 8)
                    }
                    .padding(24)
                    .background(Color.white)
                    .cornerRadius(16, corners: [.topLeft, .topRight])
                    .shadow(color: SacaviaColors.shadowMedium, radius: 16, x: 0, y: -4)
                }
            }
            .background(SacaviaColors.backgroundGradient)
            .ignoresSafeArea()
        }
        .onSubmit {
            if focusedField == .email {
                focusedField = .password
            } else {
                Task {
                    await authViewModel.login()
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

// MARK: - Custom Toggle Style

struct CheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            Button(action: {
                configuration.isOn.toggle()
            }) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .foregroundColor(configuration.isOn ? SacaviaColors.coral : Color.gray)
                    .font(.title3)
            }
            .buttonStyle(PlainButtonStyle())
            
            configuration.label
        }
    }
}

// MARK: - Corner Radius Extension

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Preview

#Preview {
    NavigationView {
        LoginView()
    }
} 