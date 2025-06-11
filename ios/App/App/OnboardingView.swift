import SwiftUI

struct OnboardingView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var currentStep = 1
    
    private let totalSteps = 4
    
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                // Progress Header
                VStack(spacing: 16) {
                    HStack {
                        Button(action: { 
                            if currentStep > 1 {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    currentStep -= 1
                                }
                            } else {
                                dismiss() 
                            }
                        }) {
                            Image(systemName: currentStep > 1 ? "chevron.left" : "xmark")
                                .font(.title3)
                                .foregroundColor(SacaviaColors.textSecondary)
                                .frame(width: 32, height: 32)
                                .background(Color.white.opacity(0.1))
                                .clipShape(Circle())
                        }
                        
                        Spacer()
                        
                        Button("Skip") {
                            completeOnboarding()
                        }
                        .font(.subheadline)
                        .foregroundColor(SacaviaColors.textSecondary)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, geometry.safeAreaInsets.top + 10)
                    
                    // Progress Indicator
                    VStack(spacing: 8) {
                        HStack(spacing: 4) {
                            ForEach(1...totalSteps, id: \.self) { step in
                                RoundedRectangle(cornerRadius: 2)
                                    .frame(width: step <= currentStep ? 32 : 24, height: 4)
                                    .foregroundColor(step <= currentStep ? SacaviaColors.coral : Color.gray.opacity(0.3))
                                    .animation(.easeInOut(duration: 0.3), value: currentStep)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        
                        Text("Step \(currentStep) of \(totalSteps)")
                            .font(.caption)
                            .foregroundColor(SacaviaColors.textSecondary)
                    }
                    .padding(.horizontal, 24)
                }
                .background(SacaviaColors.backgroundGradient)
                
                // Content
                ScrollView {
                    VStack(spacing: 32) {
                        Spacer()
                            .frame(height: 20)
                        
                        // Step Content
                        Group {
                            switch currentStep {
                            case 1:
                                interestsStep
                            case 2:
                                useCaseStep
                            case 3:
                                preferencesStep
                            case 4:
                                finalStep
                            default:
                                EmptyView()
                            }
                        }
                        .padding(.horizontal, 24)
                        
                        // Continue Button
                        VStack(spacing: 16) {
                            Button(action: nextStep) {
                                HStack {
                                    if authViewModel.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                    } else {
                                        Text(currentStep == totalSteps ? "Get Started" : "Continue")
                                            .fontWeight(.semibold)
                                        
                                        if currentStep < totalSteps {
                                            Image(systemName: "arrow.right")
                                                .font(.footnote)
                                        }
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(canProceed ? SacaviaColors.coral : Color.gray.opacity(0.3))
                                .foregroundColor(.white)
                                .cornerRadius(8)
                            }
                            .disabled(!canProceed || authViewModel.isLoading)
                            .accessibilityLabel(currentStep == totalSteps ? "Complete onboarding" : "Continue to next step")
                            
                            if currentStep == totalSteps {
                                Text("You can change these preferences anytime in Settings")
                                    .font(.caption)
                                    .foregroundColor(SacaviaColors.textSecondary)
                                    .multilineTextAlignment(.center)
                            }
                        }
                        .padding(.horizontal, 24)
                        .padding(.bottom, geometry.safeAreaInsets.bottom + 20)
                    }
                }
                .background(Color.white)
            }
        }
        .ignoresSafeArea()
        .animation(.easeInOut(duration: 0.3), value: currentStep)
    }
    
    // MARK: - Step 1: Interests
    
    private var interestsStep: some View {
        VStack(spacing: 24) {
            VStack(spacing: 16) {
                Image(systemName: "heart.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(SacaviaColors.primaryGradient)
                
                VStack(spacing: 8) {
                    Text("What interests you?")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    Text("Select your favorite types of places to get personalized recommendations")
                        .font(.body)
                        .foregroundColor(SacaviaColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            VStack(spacing: 16) {
                Text("Choose at least 3 interests")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(SacaviaColors.textPrimary)
                
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 12) {
                    ForEach(authViewModel.interestCategories, id: \.id) { interest in
                        InterestCard(
                            interest: interest,
                            isSelected: authViewModel.selectedInterests.contains(interest.id),
                            action: { authViewModel.toggleInterest(interest.id) }
                        )
                    }
                }
                
                if authViewModel.selectedInterests.count > 0 {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(SacaviaColors.success)
                        Text("\(authViewModel.selectedInterests.count) interests selected")
                            .font(.caption)
                            .foregroundColor(SacaviaColors.success)
                    }
                }
            }
        }
    }
    
    // MARK: - Step 2: Use Case
    
    private var useCaseStep: some View {
        VStack(spacing: 24) {
            VStack(spacing: 16) {
                Image(systemName: "target")
                    .font(.system(size: 64))
                    .foregroundStyle(SacaviaColors.primaryGradient)
                
                VStack(spacing: 8) {
                    Text("How will you explore?")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    Text("This helps us guide you to the experiences that matter most")
                        .font(.body)
                        .foregroundColor(SacaviaColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            VStack(spacing: 12) {
                ForEach(authViewModel.useCaseOptions, id: \.id) { useCase in
                    UseCaseCard(
                        useCase: useCase,
                        isSelected: authViewModel.selectedUseCase == useCase.id,
                        action: { authViewModel.selectUseCase(useCase.id) }
                    )
                }
            }
        }
    }
    
    // MARK: - Step 3: Preferences
    
    private var preferencesStep: some View {
        VStack(spacing: 24) {
            VStack(spacing: 16) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 64))
                    .foregroundStyle(SacaviaColors.primaryGradient)
                
                VStack(spacing: 8) {
                    Text("Your preferences")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    Text("Customize your exploration style")
                        .font(.body)
                        .foregroundColor(SacaviaColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            VStack(spacing: 24) {
                // Travel Radius
                VStack(alignment: .leading, spacing: 12) {
                    Text("Travel Radius")
                        .font(.headline)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 8) {
                        ForEach(authViewModel.travelRadiusOptions, id: \.id) { option in
                            PreferenceOptionCard(
                                title: option.label,
                                description: option.description,
                                icon: option.icon,
                                isSelected: authViewModel.selectedTravelRadius == option.id,
                                action: { authViewModel.selectTravelRadius(option.id) }
                            )
                        }
                    }
                }
                
                // Budget Range
                VStack(alignment: .leading, spacing: 12) {
                    Text("Budget Preference")
                        .font(.headline)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 8) {
                        ForEach(authViewModel.budgetOptions, id: \.id) { option in
                            PreferenceOptionCard(
                                title: option.label,
                                description: option.description,
                                icon: option.icon,
                                isSelected: authViewModel.selectedBudget == option.id,
                                action: { authViewModel.selectBudget(option.id) }
                            )
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Step 4: Final
    
    private var finalStep: some View {
        VStack(spacing: 24) {
            VStack(spacing: 16) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 64))
                    .foregroundColor(SacaviaColors.success)
                
                VStack(spacing: 8) {
                    Text("You're all set!")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    Text("Start discovering amazing places guided by local wisdom")
                        .font(.body)
                        .foregroundColor(SacaviaColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            VStack(spacing: 16) {
                OnboardingSummaryCard(
                    icon: "heart.fill",
                    title: "Interests",
                    value: "\(authViewModel.selectedInterests.count) selected",
                    color: SacaviaColors.coral
                )
                
                OnboardingSummaryCard(
                    icon: "target",
                    title: "Exploration Style",
                    value: authViewModel.useCaseOptions.first(where: { $0.id == authViewModel.selectedUseCase })?.label ?? "Not selected",
                    color: SacaviaColors.teal
                )
                
                OnboardingSummaryCard(
                    icon: "location.circle.fill",
                    title: "Travel Distance",
                    value: authViewModel.travelRadiusOptions.first(where: { $0.id == authViewModel.selectedTravelRadius })?.label ?? "Not selected",
                    color: SacaviaColors.success
                )
                
                OnboardingSummaryCard(
                    icon: "dollarsign.circle.fill",
                    title: "Budget",
                    value: authViewModel.budgetOptions.first(where: { $0.id == authViewModel.selectedBudget })?.label ?? "Not selected",
                    color: SacaviaColors.warning
                )
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private var canProceed: Bool {
        switch currentStep {
        case 1:
            return authViewModel.selectedInterests.count >= 3
        case 2:
            return authViewModel.selectedUseCase != nil
        case 3:
            return authViewModel.selectedTravelRadius != nil && authViewModel.selectedBudget != nil
        case 4:
            return true
        default:
            return false
        }
    }
    
    private func nextStep() {
        if currentStep < totalSteps {
            withAnimation(.easeInOut(duration: 0.3)) {
                currentStep += 1
            }
        } else {
            completeOnboarding()
        }
    }
    
    private func completeOnboarding() {
        Task {
            await authViewModel.completeOnboarding()
        }
    }
}

// MARK: - Supporting Views

struct InterestCard: View {
    let interest: InterestCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: interest.icon)
                    .font(.title2)
                    .foregroundColor(isSelected ? .white : SacaviaColors.coral)
                
                Text(interest.label)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(isSelected ? .white : SacaviaColors.textPrimary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(isSelected ? SacaviaColors.coral : SacaviaColors.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? SacaviaColors.coral : Color.gray.opacity(0.3), lineWidth: 1)
            )
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(interest.label), \(isSelected ? "selected" : "not selected")")
    }
}

struct UseCaseCard: View {
    let useCase: UseCaseOption
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                VStack {
                    Text(useCase.emoji)
                        .font(.title)
                    Spacer()
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(useCase.label)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(SacaviaColors.textPrimary)
                    
                    Text(useCase.description)
                        .font(.footnote)
                        .foregroundColor(SacaviaColors.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                
                Spacer()
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(isSelected ? SacaviaColors.success : Color.gray.opacity(0.5))
            }
            .padding()
            .background(isSelected ? SacaviaColors.success.opacity(0.1) : SacaviaColors.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? SacaviaColors.success : Color.gray.opacity(0.3), lineWidth: 1)
            )
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(useCase.label), \(isSelected ? "selected" : "not selected")")
    }
}

struct PreferenceOptionCard: View {
    let title: String
    let description: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(isSelected ? .white : SacaviaColors.teal)
                
                VStack(spacing: 2) {
                    Text(title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(isSelected ? .white : SacaviaColors.textPrimary)
                    
                    Text(description)
                        .font(.caption2)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : SacaviaColors.textSecondary)
                }
                .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 70)
            .background(isSelected ? SacaviaColors.teal : SacaviaColors.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? SacaviaColors.teal : Color.gray.opacity(0.3), lineWidth: 1)
            )
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(title), \(description), \(isSelected ? "selected" : "not selected")")
    }
}

struct OnboardingSummaryCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(SacaviaColors.textPrimary)
                
                Text(value)
                    .font(.footnote)
                    .foregroundColor(SacaviaColors.textSecondary)
            }
            
            Spacer()
        }
        .padding()
        .background(SacaviaColors.cardBackground)
        .cornerRadius(12)
    }
}

// MARK: - Preview

#Preview {
    OnboardingView()
} 