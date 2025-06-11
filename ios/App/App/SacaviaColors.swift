import SwiftUI

struct SacaviaColors {
    // MARK: - Primary Brand Colors (Based on actual implementation)
    static let coral = Color(red: 1.0, green: 0.42, blue: 0.42) // #FF6B6B
    static let teal = Color(red: 0.31, green: 0.80, blue: 0.77) // #4ECDC4
    
    // MARK: - Supporting Colors
    static let lightCoral = Color(red: 1.0, green: 0.78, blue: 0.78) // Lighter coral
    static let darkCoral = Color(red: 0.85, green: 0.31, blue: 0.31) // Darker coral
    static let lightTeal = Color(red: 0.71, green: 0.92, blue: 0.90) // Lighter teal
    static let darkTeal = Color(red: 0.20, green: 0.65, blue: 0.62) // Darker teal
    
    // MARK: - Neutral Colors
    static let backgroundLight = Color(red: 0.98, green: 0.98, blue: 0.98) // #FAFAFA
    static let backgroundDark = Color(red: 0.11, green: 0.11, blue: 0.13) // #1C1C20
    static let cardBackground = Color(red: 1.0, green: 1.0, blue: 1.0) // White
    static let cardBackgroundDark = Color(red: 0.15, green: 0.15, blue: 0.17) // #262628
    
    // MARK: - Text Colors
    static let textPrimary = Color(red: 0.13, green: 0.13, blue: 0.13) // #212121
    static let textSecondary = Color(red: 0.45, green: 0.45, blue: 0.45) // #737373
    static let textTertiary = Color(red: 0.66, green: 0.66, blue: 0.66) // #A8A8A8
    static let textInverse = Color.white
    
    // MARK: - System Colors
    static let success = Color(red: 0.20, green: 0.78, blue: 0.35) // #34C759
    static let warning = Color(red: 1.0, green: 0.58, blue: 0.0) // #FF9500
    static let error = Color(red: 1.0, green: 0.23, blue: 0.19) // #FF3B30
    static let info = Color(red: 0.20, green: 0.68, blue: 1.0) // #34AAFF
    
    // MARK: - Gradients
    static let primaryGradient = LinearGradient(
        colors: [coral, teal],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let coralGradient = LinearGradient(
        colors: [lightCoral, coral, darkCoral],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let tealGradient = LinearGradient(
        colors: [lightTeal, teal, darkTeal],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let backgroundGradient = LinearGradient(
        colors: [backgroundLight, Color.white],
        startPoint: .top,
        endPoint: .bottom
    )
    
    // MARK: - Shadow Colors
    static let shadowLight = Color.black.opacity(0.08)
    static let shadowMedium = Color.black.opacity(0.15)
    static let shadowDark = Color.black.opacity(0.25)
}

// MARK: - Custom Button Styles

struct SacaviaButtonStyle: ButtonStyle {
    let variant: Variant
    
    enum Variant {
        case primary
        case secondary
        case outline
        case ghost
    }
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .medium))
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(backgroundColor(for: variant, isPressed: configuration.isPressed))
            .foregroundColor(textColor(for: variant))
            .cornerRadius(8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
    
    private func backgroundColor(for variant: Variant, isPressed: Bool) -> Color {
        switch variant {
        case .primary:
            return isPressed ? SacaviaColors.darkCoral : SacaviaColors.coral
        case .secondary:
            return isPressed ? SacaviaColors.darkTeal : SacaviaColors.teal
        case .outline, .ghost:
            return isPressed ? SacaviaColors.lightCoral : Color.clear
        }
    }
    
    private func textColor(for variant: Variant) -> Color {
        switch variant {
        case .primary, .secondary:
            return .white
        case .outline, .ghost:
            return SacaviaColors.coral
        }
    }
}

// MARK: - Custom Card Style

struct SacaviaCardStyle: ViewModifier {
    let elevation: Elevation
    
    enum Elevation {
        case low
        case medium
        case high
    }
    
    func body(content: Content) -> some View {
        content
            .background(SacaviaColors.cardBackground)
            .cornerRadius(12)
            .shadow(
                color: shadowColor,
                radius: shadowRadius,
                x: 0,
                y: shadowOffset
            )
    }
    
    private var shadowColor: Color {
        switch elevation {
        case .low:
            return SacaviaColors.shadowLight
        case .medium:
            return SacaviaColors.shadowMedium
        case .high:
            return SacaviaColors.shadowDark
        }
    }
    
    private var shadowRadius: CGFloat {
        switch elevation {
        case .low:
            return 2
        case .medium:
            return 8
        case .high:
            return 16
        }
    }
    
    private var shadowOffset: CGFloat {
        switch elevation {
        case .low:
            return 1
        case .medium:
            return 4
        case .high:
            return 8
        }
    }
}

// MARK: - View Extensions

extension View {
    func sacaviaButtonStyle(_ variant: SacaviaButtonStyle.Variant = .primary) -> some View {
        self.buttonStyle(SacaviaButtonStyle(variant: variant))
    }
    
    func sacaviaCard(elevation: SacaviaCardStyle.Elevation = .medium) -> some View {
        self.modifier(SacaviaCardStyle(elevation: elevation))
    }
    
    func sacaviaBackground() -> some View {
        self.background(SacaviaColors.backgroundLight)
    }
    
    func sacaviaGradientBackground() -> some View {
        self.background(SacaviaColors.backgroundGradient)
    }
}

// MARK: - Color Extensions for Dynamic Type

extension Color {
    static var sacaviaPrimary: Color {
        Color("SacaviaPrimary", bundle: nil) ?? SacaviaColors.coral
    }
    
    static var sacaviaSecondary: Color {
        Color("SacaviaSecondary", bundle: nil) ?? SacaviaColors.teal
    }
    
    static var sacaviaBackground: Color {
        Color("SacaviaBackground", bundle: nil) ?? SacaviaColors.backgroundLight
    }
    
    static var sacaviaText: Color {
        Color("SacaviaText", bundle: nil) ?? SacaviaColors.textPrimary
    }
} 