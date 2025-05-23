import SwiftUI
import CoreLocation

struct LocationCard: View {
    let location: Location
    var userLocation: CLLocationCoordinate2D?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Location Image
            if let imageURL = location.featuredImage?.url {
                AsyncImageView(url: imageURL)
                    .aspectRatio(16/9, contentMode: .fill)
                    .frame(maxWidth: .infinity, maxHeight: 140)
                    .clipped()
                    .cornerRadius(12)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                // Name
                Text(location.name)
                    .font(.headline)
                    .lineLimit(1)
                // Address
                Text(location.address.formatted())
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .lineLimit(1)
                // Distance (if available)
                if let userLoc = userLocation {
                    Text(location.coordinates.formattedDistance(to: userLoc))
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 8)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    LocationCard(location: Location(
        id: "1",
        name: "Central Park",
        description: "A large public park in New York City.",
        address: Location.Address(street: "5th Ave", city: "New York", state: "NY", postalCode: "10022", country: "USA"),
        coordinates: Location.Coordinates(latitude: 40.785091, longitude: -73.968285),
        status: .published,
        createdAt: Date(),
        updatedAt: Date()
    ), userLocation: CLLocationCoordinate2D(latitude: 40.7808, longitude: -73.9772))
    .padding()
} 