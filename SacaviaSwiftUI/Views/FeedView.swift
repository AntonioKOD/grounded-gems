import SwiftUI

struct FeedView: View {
    @StateObject private var viewModel = EventsViewModel()
    @EnvironmentObject var locationManager: LocationManager
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if viewModel.isLoading {
                    LoadingView()
                } else if let error = viewModel.error {
                    ErrorView(error: error) {
                        Task {
                            await viewModel.fetchEvents()
                        }
                    }
                } else if viewModel.events.isEmpty {
                    EmptyStateView(
                        title: "No Events in Your Feed",
                        message: "Follow more people or join more events to see updates in your feed.",
                        systemImage: "newspaper"
                    )
                } else {
                    ForEach(viewModel.events) { event in
                        NavigationLink(destination: EventDetailView(event: event)) {
                            EventCard(event: event)
                                .padding(.horizontal)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding(.vertical)
        }
        .refreshable {
            await viewModel.fetchEvents()
        }
        .onAppear {
            Task {
                await viewModel.fetchEvents()
            }
        }
    }
}

private struct LoadingView: View {
    var body: some View {
        VStack {
            ProgressView()
                .padding()
            Text("Loading your feed...")
                .foregroundColor(.secondary)
        }
    }
}

private struct EmptyStateView: View {
    let title: String
    let message: String
    let systemImage: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: systemImage)
                .font(.largeTitle)
                .foregroundColor(.secondary)
            
            Text(title)
                .font(.headline)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    FeedView()
        .environmentObject(LocationManager())
} 