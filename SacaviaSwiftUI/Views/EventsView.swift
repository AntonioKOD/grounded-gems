import SwiftUI

struct EventsView: View {
    @StateObject private var viewModel = EventsViewModel()
    @State private var searchText = ""
    @State private var selectedCategory: String?
    @State private var selectedEventType: String?
    @State private var showOnlyMatchmaking = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Search bar
                SearchBar(text: $searchText)
                    .padding(.horizontal)
                
                // Filters
                VStack(spacing: 12) {
                    // Categories
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            CategoryButton(
                                title: "All",
                                isSelected: selectedCategory == nil,
                                action: { selectedCategory = nil }
                            )
                            
                            ForEach(EventCategory.allCases, id: \.self) { category in
                                CategoryButton(
                                    title: category.displayName,
                                    isSelected: selectedCategory == category.rawValue,
                                    action: { selectedCategory = category.rawValue }
                                )
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Event Types
                    if selectedCategory == EventCategory.sports.rawValue {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                EventTypeButton(
                                    title: "All",
                                    isSelected: selectedEventType == nil,
                                    action: { selectedEventType = nil }
                                )
                                
                                ForEach(EventType.allCases, id: \.self) { type in
                                    EventTypeButton(
                                        title: type.displayName,
                                        isSelected: selectedEventType == type.rawValue,
                                        action: { selectedEventType = type.rawValue }
                                    )
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                
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
                        title: "No Events Found",
                        message: "There are no events matching your criteria.",
                        systemImage: "calendar.badge.exclamationmark"
                    )
                } else {
                    LazyVStack(spacing: 16) {
                        ForEach(viewModel.events) { event in
                            NavigationLink(destination: EventDetailView(event: event)) {
                                EventCard(event: event)
                                    .padding(.horizontal)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(.vertical)
                }
            }
        }
        .navigationTitle("Events")
        .onChange(of: searchText) { newValue in
            viewModel.filters.searchQuery = newValue
            Task {
                await viewModel.fetchEvents()
            }
        }
        .onChange(of: selectedCategory) { newValue in
            viewModel.filters.category = newValue
            if selectedCategory != EventCategory.sports.rawValue {
                selectedEventType = nil
                viewModel.filters.eventType = nil
            }
            Task {
                await viewModel.fetchEvents()
            }
        }
        .onChange(of: selectedEventType) { newValue in
            viewModel.filters.eventType = newValue
            Task {
                await viewModel.fetchEvents()
            }
        }
        .onAppear {
            Task {
                await viewModel.fetchEvents()
            }
        }
    }
}

// MARK: - Supporting Views

private struct SearchBar: View {
    @Binding var text: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)
            
            TextField("Search events...", text: $text)
                .textFieldStyle(RoundedBorderTextFieldStyle())
        }
    }
}

private struct CategoryButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.1))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

private struct EventTypeButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.green : Color.gray.opacity(0.1))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

private struct LoadingView: View {
    var body: some View {
        VStack {
            ProgressView()
                .padding()
            Text("Loading events...")
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

// MARK: - Enums

enum EventCategory: String, CaseIterable {
    case sports
    case entertainment
    case education
    case social
    case business
    case other
    
    var displayName: String {
        switch self {
        case .sports: return "Sports"
        case .entertainment: return "Entertainment"
        case .education: return "Education"
        case .social: return "Social"
        case .business: return "Business"
        case .other: return "Other"
        }
    }
}

enum EventType: String, CaseIterable {
    case matchmaking = "sports_matchmaking"
    case tournament = "sports_tournament"
    case training = "sports_training"
    case casual = "sports_casual"
    
    var displayName: String {
        switch self {
        case .matchmaking: return "Matchmaking"
        case .tournament: return "Tournament"
        case .training: return "Training"
        case .casual: return "Casual"
        }
    }
} 