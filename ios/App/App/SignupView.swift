import SwiftUI

struct SignupView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Field?
    
    enum Field {
        case name, email, password, confirmPassword
    }
    
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 0) {
                    // Header Section
                    VStack(spacing: 24) {
                        HStack {
                            Button(action: { dismiss() }) {
                                Image(systemName: "xmark")
                                    .font(.title3)
                                    .foregroundColor(SacaviaColors.textSecondary)
                                    .frame(width: 32, height: 32)
                                    .background(Color.white.opacity(0.1))
                                    .clipShape(Circle())
                            }
                            
                            Spacer()
                        }
                        .padding(.top, geometry.safeAreaInsets.top + 10)
                        .padding(.horizontal, 24)
                        
                        // Welcome Content
                        VStack(spacing: 16) {
                            Image(systemName: "map.circle.fill")
                                .font(.system(size: 56))
                                .foregroundStyle(SacaviaColors.primaryGradient)
                            
                            VStack(spacing: 8) {
                                Text("Join Sacavia")
                                    .font(.largeTitle)
                                    .fontWeight(.bold)
                                    .foregroundColor(SacaviaColors.textPrimary)
                                
                                Text("Connect with your community and explore authentic places together")
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
                    
                    // Signup Form Section
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
                            
                            // Name Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Full Name")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(SacaviaColors.textPrimary)
                                
                                HStack {
                                    Image(systemName: "person")
                                        .foregroundColor(SacaviaColors.textTertiary)
                                        .frame(width: 16)
                                    
                                    TextField("What should we call you?", text: $authViewModel.signupName)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .textContentType(.name)
                                        .focused($focusedField, equals: .name)
                                        .accessibilityLabel("Full name")
                                        .onChange(of: authViewModel.signupName) { _ in
                                            authViewModel.updatePasswordStrength()
                                        }
                                }
                                .padding()
                                .background(SacaviaColors.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(
                                            focusedField == .name ? SacaviaColors.coral : Color.gray.opacity(0.3),
                                            lineWidth: focusedField == .name ? 2 : 1
                                        )
                                )
                                .cornerRadius(8)
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
                                    
                                    TextField("your@email.com", text: $authViewModel.signupEmail)
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
                                    
                                    if authViewModel.showSignupPassword {
                                        TextField("Create a secure password", text: $authViewModel.signupPassword)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .focused($focusedField, equals: .password)
                                            .onChange(of: authViewModel.signupPassword) { _ in
                                                authViewModel.updatePasswordStrength()
                                            }
                                    } else {
                                        SecureField("Create a secure password", text: $authViewModel.signupPassword)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .textContentType(.newPassword)
                                            .focused($focusedField, equals: .password)
                                            .onChange(of: authViewModel.signupPassword) { _ in
                                                authViewModel.updatePasswordStrength()
                                            }
                                    }
                                    
                                    Button(action: {
                                        authViewModel.showSignupPassword.toggle()
                                    }) {
                                        Image(systemName: authViewModel.showSignupPassword ? "eye.slash" : "eye")
                                            .foregroundColor(SacaviaColors.textTertiary)
                                    }
                                    .accessibilityLabel(authViewModel.showSignupPassword ? "Hide password" : "Show password")
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
                                
                                // Password Strength Indicator
                                if !authViewModel.signupPassword.isEmpty {
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            ForEach(0..<4, id: \.self) { index in
                                                RoundedRectangle(cornerRadius: 2)
                                                    .frame(height: 4)
                                                    .foregroundColor(
                                                        index < Int(authViewModel.passwordStrength.progress * 4) ? 
                                                            authViewModel.passwordStrength.color : Color.gray.opacity(0.3)
                                                    )
                                            }
                                        }
                                        
                                        Text("Password strength: \(authViewModel.passwordStrength.rawValue)")
                                            .font(.caption)
                                            .foregroundColor(authViewModel.passwordStrength.color)
                                    }
                                }
                            }
                            
                            // Confirm Password Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Confirm Password")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(SacaviaColors.textPrimary)
                                
                                HStack {
                                    Image(systemName: "lock.fill")
                                        .foregroundColor(SacaviaColors.textTertiary)
                                        .frame(width: 16)
                                    
                                    if authViewModel.showConfirmPassword {
                                        TextField("Confirm your password", text: $authViewModel.confirmPassword)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .focused($focusedField, equals: .confirmPassword)
                                    } else {
                                        SecureField("Confirm your password", text: $authViewModel.confirmPassword)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .textContentType(.newPassword)
                                            .focused($focusedField, equals: .confirmPassword)
                                    }
                                    
                                    Button(action: {
                                        authViewModel.showConfirmPassword.toggle()
                                    }) {
                                        Image(systemName: authViewModel.showConfirmPassword ? "eye.slash" : "eye")
                                            .foregroundColor(SacaviaColors.textTertiary)
                                    }
                                    .accessibilityLabel(authViewModel.showConfirmPassword ? "Hide password" : "Show password")
                                }
                                .padding()
                                .background(SacaviaColors.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(
                                            focusedField == .confirmPassword ? SacaviaColors.coral : Color.gray.opacity(0.3),
                                            lineWidth: focusedField == .confirmPassword ? 2 : 1
                                        )
                                )
                                .cornerRadius(8)
                                
                                // Password Match Indicator
                                if !authViewModel.confirmPassword.isEmpty {
                                    HStack {
                                        Image(systemName: authViewModel.signupPassword == authViewModel.confirmPassword ? "checkmark.circle.fill" : "xmark.circle.fill")
                                            .foregroundColor(authViewModel.signupPassword == authViewModel.confirmPassword ? SacaviaColors.success : SacaviaColors.error)
                                        
                                        Text(authViewModel.signupPassword == authViewModel.confirmPassword ? "Passwords match" : "Passwords don't match")
                                            .font(.caption)
                                            .foregroundColor(authViewModel.signupPassword == authViewModel.confirmPassword ? SacaviaColors.success : SacaviaColors.error)
                                    }
                                }
                            }
                            
                            // Location Permission Section
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Location Access")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(SacaviaColors.textPrimary)
                                
                                Button(action: {
                                    authViewModel.requestLocationPermission()
                                }) {
                                    HStack {
                                        Image(systemName: authViewModel.locationPermissionGranted ? "location.fill" : "location")
                                            .foregroundColor(authViewModel.locationPermissionGranted ? SacaviaColors.success : SacaviaColors.coral)
                                        
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(authViewModel.locationPermissionGranted ? "Location enabled" : "Enable location")
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                                .foregroundColor(SacaviaColors.textPrimary)
                                            
                                            Text("Get personalized recommendations for places near you")
                                                .font(.caption)
                                                .foregroundColor(SacaviaColors.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        if authViewModel.locationPermissionGranted {
                                            Image(systemName: "checkmark")
                                                .foregroundColor(SacaviaColors.success)
                                        } else {
                                            Image(systemName: "chevron.right")
                                                .foregroundColor(SacaviaColors.textTertiary)
                                        }
                                    }
                                    .padding()
                                    .background(SacaviaColors.cardBackground)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(
                                                authViewModel.locationPermissionGranted ? SacaviaColors.success : Color.gray.opacity(0.3),
                                                lineWidth: 1
                                            )
                                    )
                                    .cornerRadius(8)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                            
                            // Terms and Privacy
                            VStack(spacing: 12) {
                                Toggle(isOn: $authViewModel.termsAccepted) {
                                    HStack {
                                        Text("I agree to the ")
                                            .font(.footnote)
                                            .foregroundColor(SacaviaColors.textSecondary)
                                        +
                                        Text("Terms of Service")
                                            .font(.footnote)
                                            .fontWeight(.medium)
                                            .foregroundColor(SacaviaColors.coral)
                                    }
                                }
                                .toggleStyle(CheckboxToggleStyle())
                                
                                Toggle(isOn: $authViewModel.privacyAccepted) {
                                    HStack {
                                        Text("I agree to the ")
                                            .font(.footnote)
                                            .foregroundColor(SacaviaColors.textSecondary)
                                        +
                                        Text("Privacy Policy")
                                            .font(.footnote)
                                            .fontWeight(.medium)
                                            .foregroundColor(SacaviaColors.coral)
                                    }
                                }
                                .toggleStyle(CheckboxToggleStyle())
                            }
                        }
                        
                        // Sign Up Button
                        Button(action: {
                            Task {
                                await authViewModel.register()
                            }
                        }) {
                            HStack {
                                if authViewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Text("Create Account")
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
                        .disabled(authViewModel.isLoading || !canCreateAccount)
                        .accessibilityLabel("Create account")
                        .accessibilityHint("Double tap to create your Sacavia account")
                        
                        // Sign In Link
                        HStack {
                            Text("Already have an account?")
                                .font(.footnote)
                                .foregroundColor(SacaviaColors.textSecondary)
                            
                            Button("Sign in") {
                                dismiss()
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
            switch focusedField {
            case .name:
                focusedField = .email
            case .email:
                focusedField = .password
            case .password:
                focusedField = .confirmPassword
            case .confirmPassword:
                if canCreateAccount {
                    Task {
                        await authViewModel.register()
                    }
                }
            case .none:
                break
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .fullScreenCover(isPresented: .constant(authViewModel.isAuthenticated && authViewModel.onboardingStep == 0)) {
            OnboardingView()
        }
    }
    
    private var canCreateAccount: Bool {
        !authViewModel.signupName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !authViewModel.signupEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        authViewModel.signupPassword.count >= 8 &&
        authViewModel.signupPassword == authViewModel.confirmPassword &&
        authViewModel.termsAccepted &&
        authViewModel.privacyAccepted
    }
}

// MARK: - Preview

#Preview {
    SignupView()
} 