import LocalAuthentication
import Foundation
import SwiftUI

class BiometricAuthManager {
    static let shared = BiometricAuthManager()
    
    // UserDefaults key for biometric authentication preference
    private let biometricEnabledKey = "biometricAuthEnabled"
    
    private init() {}
    
    // Check if biometric authentication is available on the device
    func canUseBiometricAuthentication() -> Bool {
        let context = LAContext()
        var error: NSError?
        
        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        
        if let error = error {
            print("BiometricAuthManager: Cannot use biometric authentication - \(error.localizedDescription)")
        }
        
        return canEvaluate
    }
    
    // Get the type of biometric authentication available (Face ID, Touch ID, or none)
    func getBiometricType() -> LABiometryType {
        let context = LAContext()
        var error: NSError?
        
        // This call is needed to set the biometryType property
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        
        return context.biometryType
    }
    
    // Get a user-friendly description of the biometric type
    func getBiometricTypeName() -> String {
        switch getBiometricType() {
        case .faceID:
            return "Face ID"
        case .touchID:
            return "Touch ID"
        case .opticID:
            if #available(iOS 17.0, *) {
                return "Optic ID"
            } else {
                return "Biometric Authentication"
            }
        default:
            return "Biometric Authentication"
        }
    }
    
    // Authenticate using biometrics
    func authenticateWithBiometrics(reason: String = "Authenticate to access your account") async -> Result<Bool, Error> {
        return await withCheckedContinuation { continuation in
            let context = LAContext()
            
            // Evaluate the policy
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                if let error = error {
                    print("BiometricAuthManager: Authentication failed - \(error.localizedDescription)")
                    continuation.resume(returning: .failure(error))
                } else if success {
                    print("BiometricAuthManager: Authentication successful")
                    continuation.resume(returning: .success(true))
                } else {
                    print("BiometricAuthManager: Authentication failed")
                    continuation.resume(returning: .success(false))
                }
            }
        }
    }
    
    // Check if the user has enabled biometric authentication in app settings
    func isBiometricEnabled() -> Bool {
        return UserDefaults.standard.bool(forKey: biometricEnabledKey)
    }
    
    // Enable or disable biometric authentication in app settings
    func setBiometricEnabled(_ enabled: Bool) {
        UserDefaults.standard.set(enabled, forKey: biometricEnabledKey)
    }
    
    // Get the system icon name for the current biometric type
    func getBiometricIconName() -> String {
        switch getBiometricType() {
        case .faceID:
            return "faceid"
        case .touchID:
            return "touchid"
        case .opticID:
            if #available(iOS 17.0, *) {
                return "opticid"
            } else {
                return "lock.shield"
            }
        default:
            return "lock.shield"
        }
    }
} 