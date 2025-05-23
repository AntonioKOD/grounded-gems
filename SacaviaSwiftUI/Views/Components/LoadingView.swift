import SwiftUI

struct LoadingView: View {
    let text: String
    
    init(_ text: String = "Loading...") {
        self.text = text
    }
    
    var body: some View {
        VStack(spacing: 8) {
            ProgressView()
                .scaleEffect(1.5)
            Text(text)
                .foregroundColor(.secondary)
        }
    }
} 