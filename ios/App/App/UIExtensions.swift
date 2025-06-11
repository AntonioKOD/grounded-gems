import SwiftUI

// MARK: - View Extensions

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

// MARK: - Custom Toggle Styles

struct CheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 12) {
            Button(action: {
                configuration.isOn.toggle()
            }) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .font(.title3)
                    .foregroundColor(configuration.isOn ? SacaviaColors.coral : Color.gray.opacity(0.5))
            }
            .buttonStyle(PlainButtonStyle())
            
            configuration.label
        }
    }
}

// MARK: - Custom Button Styles

struct PrimaryButtonStyle: ButtonStyle {
    var isEnabled: Bool = true
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(
                isEnabled ? 
                    (configuration.isPressed ? SacaviaColors.darkCoral : SacaviaColors.coral) :
                    Color.gray.opacity(0.3)
            )
            .foregroundColor(.white)
            .cornerRadius(8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(SacaviaColors.coral, lineWidth: 2)
            )
            .foregroundColor(SacaviaColors.coral)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Custom View Modifiers

struct SacaviaCardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(SacaviaColors.cardBackground)
            .cornerRadius(12)
            .shadow(color: SacaviaColors.shadowLight, radius: 4, x: 0, y: 2)
    }
}

struct SacaviaTextFieldStyle: ViewModifier {
    var isFocused: Bool = false
    
    func body(content: Content) -> some View {
        content
            .padding()
            .background(SacaviaColors.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(
                        isFocused ? SacaviaColors.coral : Color.gray.opacity(0.3),
                        lineWidth: isFocused ? 2 : 1
                    )
            )
            .cornerRadius(8)
    }
}

extension View {
    func sacaviaCard() -> some View {
        modifier(SacaviaCardStyle())
    }
    
    func sacaviaTextField(isFocused: Bool = false) -> some View {
        modifier(SacaviaTextFieldStyle(isFocused: isFocused))
    }
}

// MARK: - Loading Overlay

struct LoadingOverlay: View {
    let message: String
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            
            VStack(spacing: 16) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: SacaviaColors.coral))
                    .scaleEffect(1.5)
                
                Text(message)
                    .font(.subheadline)
                    .foregroundColor(SacaviaColors.textPrimary)
            }
            .padding(24)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: SacaviaColors.shadowMedium, radius: 16, x: 0, y: 4)
        }
    }
}

// MARK: - Error Alert

struct ErrorAlert: View {
    let message: String
    let onDismiss: () -> Void
    
    var body: some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(SacaviaColors.error)
            
            Text(message)
                .font(.footnote)
                .foregroundColor(SacaviaColors.error)
                .multilineTextAlignment(.leading)
            
            Spacer()
            
            Button("Dismiss") {
                onDismiss()
            }
            .font(.footnote)
            .foregroundColor(SacaviaColors.coral)
        }
        .padding()
        .background(SacaviaColors.error.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Password Strength Indicator

struct PasswordStrengthIndicator: View {
    let password: String
    let strength: PasswordStrength
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                ForEach(0..<4, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .frame(height: 4)
                        .foregroundColor(
                            index < Int(strength.progress * 4) ? 
                                strength.color : Color.gray.opacity(0.3)
                        )
                }
            }
            
            Text("Password strength: \(strength.rawValue)")
                .font(.caption)
                .foregroundColor(strength.color)
        }
    }
}

// MARK: - Animated Gradient Background

struct AnimatedGradientBackground: View {
    @State private var animateGradient = false
    
    var body: some View {
        LinearGradient(
            colors: [
                SacaviaColors.coral.opacity(0.8),
                SacaviaColors.teal.opacity(0.8),
                SacaviaColors.coral.opacity(0.6)
            ],
            startPoint: animateGradient ? .topLeading : .bottomTrailing,
            endPoint: animateGradient ? .bottomTrailing : .topLeading
        )
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                animateGradient.toggle()
            }
        }
    }
}

// MARK: - Keyboard Responsive Modifier

struct KeyboardResponsive: ViewModifier {
    @State private var keyboardHeight: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .padding(.bottom, keyboardHeight)
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { notification in
                if let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        keyboardHeight = keyboardFrame.cgRectValue.height
                    }
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
                withAnimation(.easeInOut(duration: 0.3)) {
                    keyboardHeight = 0
                }
            }
    }
}

extension View {
    func keyboardResponsive() -> some View {
        modifier(KeyboardResponsive())
    }
}

// MARK: - Haptic Feedback

enum HapticFeedback {
    case light
    case medium
    case heavy
    case success
    case warning
    case error
    
    func trigger() {
        switch self {
        case .light:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .medium:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case .heavy:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case .success:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .warning:
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .error:
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
}

// MARK: - Network Status

class NetworkMonitor: ObservableObject {
    @Published var isConnected = true
    
    init() {
        // Add network monitoring implementation here
        // For now, assume always connected
    }
}

// MARK: - Safe Area Helper

struct SafeAreaInsetsKey: PreferenceKey {
    static var defaultValue: EdgeInsets = EdgeInsets()
    
    static func reduce(value: inout EdgeInsets, nextValue: () -> EdgeInsets) {
        value = nextValue()
    }
}

extension View {
    func readSafeAreaInsets() -> some View {
        background(
            GeometryReader { geometry in
                Color.clear.preference(
                    key: SafeAreaInsetsKey.self,
                    value: geometry.safeAreaInsets
                )
            }
        )
    }
}

// MARK: - Image Loading

struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder
    
    @State private var loadedImage: UIImage?
    @State private var isLoading = false
    
    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }
    
    var body: some View {
        Group {
            if let loadedImage = loadedImage {
                content(Image(uiImage: loadedImage))
            } else {
                placeholder()
                    .onAppear {
                        loadImage()
                    }
            }
        }
    }
    
    private func loadImage() {
        guard let url = url, !isLoading else { return }
        
        isLoading = true
        
        URLSession.shared.dataTask(with: url) { data, _, _ in
            if let data = data, let image = UIImage(data: data) {
                DispatchQueue.main.async {
                    self.loadedImage = image
                    self.isLoading = false
                }
            }
        }.resume()
    }
}

// MARK: - Conditional Modifiers

extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

// MARK: - Shimmer Effect

struct Shimmer: View {
    @State private var isAnimating = false
    
    var body: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color.gray.opacity(0.3))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.clear,
                                Color.white.opacity(0.6),
                                Color.clear
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .offset(x: isAnimating ? 300 : -300)
                    .animation(
                        .easeInOut(duration: 1.5).repeatForever(autoreverses: false),
                        value: isAnimating
                    )
            )
            .clipped()
            .onAppear {
                isAnimating = true
            }
    }
} 