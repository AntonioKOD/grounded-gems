import SwiftUI

struct LocationsView: View {
    @StateObject private var viewModel = LocationsViewModel()
    @State private var searchText = ""
    @State private var selectedCategory: String?
    
    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Search bar
                SearchBar(text: $searchText)
                    .padding(.horizontal)
                
                // Category filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        CategoryButton(
                            title: "All",
                            isSelected: selectedCategory == nil,
                            action: { selectedCategory = nil }
                        )
                        
                        CategoryButton(
                            title: "Sports",
                            isSelected: selectedCategory == "sports",
                            action: { selectedCategory = "sports" }
                        )
                        
                        CategoryButton(
                            title: "Entertainment",
                            isSelected: selectedCategory == "entertainment",
                            action: { selectedCategory = "entertainment" }
                        )
                        
                        CategoryButton(
                            title: "Education",
                            isSelected: selectedCategory == "education",
                            action: { selectedCategory = "education" }
                        )
                    }
                    .padding(.horizontal)
                }
                
                if viewModel.isLoading {
                    LoadingView()
                } else if let error = viewModel.error {
                    ErrorView(error: error) {
                        Task {
                            await viewModel.fetchLocations()
                        }
                    }
                } else {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(viewModel.locations) { location in
                            LocationCard(location: location)
                                .onTapGesture {
                                    // Navigate to location detail
                                }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Locations")
        .onChange(of: searchText) { _ in
            updateFilters()
        }
        .onChange(of: selectedCategory) { _ in
            updateFilters()
        }
        .onAppear {
            Task {
                await viewModel.fetchLocations()
            }
        }
    }
    
    private func updateFilters() {
        Task {
            // Update filters based on search text and category
            var newFilters = viewModel.filters
            newFilters.searchQuery = searchText
            newFilters.category = selectedCategory
            
            await viewModel.applyFilters(newFilters)
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
            
            TextField("Search locations...", text: $text)
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
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
} 