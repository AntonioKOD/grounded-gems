import SwiftUI
import MapKit

struct LocationDetailSheet: View {
    let location: Location
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = LocationDetailViewModel()
    @State private var selectedImageIndex = 0
    @State private var mapRegion: MKCoordinateRegion
    
    init(location: Location) {
        self.location = location
        let coordinates = CLLocationCoordinate2D(
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude
        )
        let span = MKCoordinateSpan(
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
        )
        _mapRegion = State(initialValue: MKCoordinateRegion(center: coordinates, span: span))
    }
    
    var body: some View {
        NavigationView {
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 20) {
                    // Image Gallery
                    LocationImageGallery(
                        gallery: location.gallery,
                        featuredImage: location.featuredImage,
                        selectedIndex: $selectedImageIndex
                    )
                    
                    VStack(alignment: .leading, spacing: 16) {
                        // Header
                        LocationHeaderView(location: location)
                        
                        // Description
                        LocationDescriptionView(location: location)
                        
                        // Address and Contact
                        AddressContactView(location: location)
                        
                        // Business Hours
                        if let businessHours = location.businessHours {
                            BusinessHoursView(businessHours: businessHours)
                        }
                        
                        // Price Range
                        if let priceRange = location.priceRange {
                            PriceRangeView(priceRange: priceRange)
                        }
                        
                        // Additional Info
                        AdditionalInfoView(location: location)
                        
                        // Map
                        LocationMapView(location: location, region: $mapRegion)
                    }
                    .padding()
                }
            }
            .navigationTitle("Location Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Image Gallery View
struct LocationImageGallery: View {
    let gallery: [Location.GalleryItem]?
    let featuredImage: Media?
    @Binding var selectedIndex: Int
    
    var body: some View {
        Group {
            if let gallery = gallery, !gallery.isEmpty {
                TabView(selection: $selectedIndex) {
                    ForEach(gallery.indices, id: \.self) { index in
                        if let url = gallery[index].image.url {
                            AsyncImage(url: URL(string: url)) { phase in
                                switch phase {
                                case .empty:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.2))
                                        .overlay {
                                            ProgressView()
                                        }
                                case .success(let image):
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                case .failure:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.2))
                                        .overlay {
                                            Image(systemName: "photo")
                                                .foregroundColor(.gray)
                                        }
                                @unknown default:
                                    EmptyView()
                                }
                            }
                        }
                    }
                }
                .tabViewStyle(PageTabViewStyle())
                .frame(height: 250)
            } else if let featuredImage = featuredImage {
                AsyncImage(url: URL(string: featuredImage.url ?? "")) { phase in
                    switch phase {
                    case .empty:
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .overlay {
                                ProgressView()
                            }
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .overlay {
                                Image(systemName: "photo")
                                    .foregroundColor(.gray)
                            }
                    @unknown default:
                        EmptyView()
                    }
                }
                .frame(height: 250)
            }
        }
    }
}

// MARK: - Location Header View
struct LocationHeaderView: View {
    let location: Location
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(location.name)
                    .font(.title2)
                    .fontWeight(.bold)
                
                if let categories = location.categories {
                    CategoryTagsView(categories: categories)
                }
            }
            
            Spacer()
            
            if location.isVerified == true {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundColor(.blue)
                    .font(.title2)
            }
        }
    }
}

// MARK: - Category Tags View
struct CategoryTagsView: View {
    let categories: [Category]
    
    var body: some View {
        HStack {
            ForEach(categories) { category in
                Text(category.name)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .foregroundColor(.blue)
                    .cornerRadius(8)
            }
        }
    }
}

// MARK: - Location Description View
struct LocationDescriptionView: View {
    let location: Location
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(location.description)
                .font(.body)
            
            if let shortDescription = location.shortDescription {
                Text(shortDescription)
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Address Contact View
struct AddressContactView: View {
    let location: Location
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "mappin.and.ellipse")
                    .foregroundColor(.gray)
                Text(location.address.formatted())
                    .font(.subheadline)
            }
            
            if let contactInfo = location.contactInfo {
                ContactInfoView(contactInfo: contactInfo)
            }
        }
    }
}

// MARK: - Contact Info View
struct ContactInfoView: View {
    let contactInfo: Location.ContactInfo
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let phone = contactInfo.phone {
                HStack {
                    Image(systemName: "phone")
                        .foregroundColor(.gray)
                    Text(phone)
                        .font(.subheadline)
                }
            }
            
            if let email = contactInfo.email {
                HStack {
                    Image(systemName: "envelope")
                        .foregroundColor(.gray)
                    Text(email)
                        .font(.subheadline)
                }
            }
            
            if let website = contactInfo.website {
                HStack {
                    Image(systemName: "globe")
                        .foregroundColor(.gray)
                    Text(website)
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
        }
    }
}

// MARK: - Business Hours View
struct BusinessHoursView: View {
    let businessHours: [Location.BusinessHour]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Business Hours")
                .font(.headline)
            
            ForEach(businessHours) { hours in
                HStack {
                    Text(hours.day.rawValue)
                        .font(.subheadline)
                        .frame(width: 100, alignment: .leading)
                    
                    if hours.isClosed {
                        Text("Closed")
                            .font(.subheadline)
                            .foregroundColor(.red)
                    } else if let open = hours.open, let close = hours.close {
                        Text("\(open) - \(close)")
                            .font(.subheadline)
                    }
                }
            }
        }
        .padding(.vertical)
    }
}

// MARK: - Price Range View
struct PriceRangeView: View {
    let priceRange: Location.PriceRange
    
    var body: some View {
        HStack {
            Text("Price Range:")
                .font(.subheadline)
            Text(String(repeating: "$", count: priceRange.intValue))
                .font(.subheadline)
                .foregroundColor(.green)
        }
    }
}

// MARK: - Additional Info View
struct AdditionalInfoView: View {
    let location: Location
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let bestTimeToVisit = location.bestTimeToVisit {
                BestTimeToVisitView(bestTimeToVisit: bestTimeToVisit)
            }
            
            if let insiderTips = location.insiderTips {
                InsiderTipsView(insiderTips: insiderTips)
            }
            
            if let accessibility = location.accessibility {
                AccessibilityFeaturesView(accessibility: accessibility)
            }
        }
    }
}

// MARK: - Best Time To Visit View
struct BestTimeToVisitView: View {
    let bestTimeToVisit: [Location.Season]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Best Time to Visit")
                .font(.headline)
            
            HStack {
                ForEach(bestTimeToVisit, id: \.season) { season in
                    Text(season.season)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.1))
                        .foregroundColor(.green)
                        .cornerRadius(8)
                }
            }
        }
        .padding(.vertical)
    }
}

// MARK: - Insider Tips View
struct InsiderTipsView: View {
    let insiderTips: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Insider Tips")
                .font(.headline)
            Text(insiderTips)
                .font(.subheadline)
        }
        .padding(.vertical)
    }
}

// MARK: - Accessibility Features View
struct AccessibilityFeaturesView: View {
    let accessibility: Location.Accessibility
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Accessibility")
                .font(.headline)
            
            ForEach(accessibility.features, id: \.self) { feature in
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text(feature)
                        .font(.subheadline)
                }
            }
        }
        .padding(.vertical)
    }
}

// MARK: - Location Map View
struct LocationMapView: View {
    let location: Location
    @Binding var region: MKCoordinateRegion
    
    var body: some View {
        Map(coordinateRegion: $region, annotationItems: [location]) { loc in
            MapMarker(coordinate: CLLocationCoordinate2D(
                latitude: loc.coordinates.latitude,
                longitude: loc.coordinates.longitude
            ))
        }
        .frame(height: 200)
        .cornerRadius(12)
    }
}

class LocationDetailViewModel: ObservableObject {
    @Published var error: Error?
    private let apiService = APIService.shared
}

#Preview {
    LocationDetailSheet(location: Location(
        id: "1",
        name: "Local Sports Center",
        description: "A modern sports facility with multiple courts and equipment.",
        shortDescription: "Modern sports facility",
        address: Location.Address(
            street: "123 Main St",
            city: "San Francisco",
            state: "CA",
            country: "USA",
            postalCode: "94105"
        ),
        coordinates: Location.Coordinates(
            latitude: 37.7749,
            longitude: -122.4194
        ),
        categories: [
            Category(
                id: "1",
                name: "Sports",
                type: .location
            )
        ],
        status: .published,
        createdAt: Date(),
        updatedAt: Date(),
        isVerified: true
    ))
} 