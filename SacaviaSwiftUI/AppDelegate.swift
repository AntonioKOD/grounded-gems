import UIKit
import SwiftUI

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        print("AppDelegate: Application did finish launching")
        return true
    }
    
    // Handle URL scheme callbacks (for authentication)
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        print("AppDelegate: Received URL: \(url)")
        
        // Handle authentication callback URL
        if url.scheme == "groundedgems" && url.host == "auth" {
            if url.path == "/callback" {
                print("AppDelegate: Processing authentication callback")
                
                // Extract code from URL
                guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
                      let queryItems = components.queryItems else {
                    print("AppDelegate: Failed to parse URL components")
                    return false
                }
                
                if let code = queryItems.first(where: { $0.name == "code" })?.value {
                    print("AppDelegate: Extracted code: \(code)")
                    
                    // Post notification with the code for the auth view to handle
                    NotificationCenter.default.post(
                        name: Notification.Name("AuthenticationCallback"),
                        object: nil,
                        userInfo: ["code": code]
                    )
                    return true
                } else if let error = queryItems.first(where: { $0.name == "error" })?.value {
                    print("AppDelegate: Authentication error: \(error)")
                    
                    // Post notification with the error
                    NotificationCenter.default.post(
                        name: Notification.Name("AuthenticationError"),
                        object: nil,
                        userInfo: ["error": error]
                    )
                    return true
                }
            }
        }
        
        print("AppDelegate: URL not handled")
        return false
    }
} 