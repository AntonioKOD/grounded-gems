import SwiftUI
import CoreLocation

struct EventCard: View {
    let event: Event
    @EnvironmentObject var locationManager: LocationManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Event Image
            if let imageURL = event.image?.url {
                AsyncImage(url: URL(string: imageURL)) { phase in
                    switch phase {
                    case .empty:
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .aspectRatio(16/9, contentMode: .fit)
                            .overlay {
                                ProgressView()
                            }
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(16/9, contentMode: .fill)
                            .clipped()
                    case .failure:
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .aspectRatio(16/9, contentMode: .fit)
                            .overlay {
                                Image(systemName: "photo")
                                    .foregroundColor(.gray)
                            }
                    @unknown default:
                        EmptyView()
                    }
                }
                .cornerRadius(12)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                // Event Name and Category
                HStack {
                    Text(event.name)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    if let category = event.category {
                        Text(category)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                    }
                }
                
                // Date and Time
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.gray)
                    Text(formatDate(event.date))
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                
                // Location
                if let location = event.eventLocation {
                    HStack {
                        Image(systemName: "mappin.and.ellipse")
                            .foregroundColor(.gray)
                        Text(location.name)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                            .lineLimit(1)
                        
                        if let distance = calculateDistance(to: location) {
                            Text("• \(formatDistance(distance))")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                    }
                }
                
                // Participants
                if let attendees = event.attendees {
                    HStack {
                        Image(systemName: "person.2")
                            .foregroundColor(.gray)
                        Text("\(attendees.count) attending")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                        
                        if let max = event.maxParticipants {
                            Text("• \(max - attendees.count) spots left")
                                .font(.subheadline)
                                .foregroundColor(.orange)
                        }
                    }
                }
                
                // Matchmaking Info
                if event.isMatchmaking == true {
                    HStack {
                        Image(systemName: "figure.run")
                            .foregroundColor(.green)
                        Text("Matchmaking")
                            .font(.subheadline)
                            .foregroundColor(.green)
                        
                        if let skillLevel = event.skillLevel {
                            Text("• \(skillLevel.rawValue)")
                                .font(.subheadline)
                                .foregroundColor(.green)
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func calculateDistance(to location: Event.EventLocation) -> Double? {
        guard let coordinates = location.coordinates,
              let userLocation = locationManager.location else {
            return nil
        }
        
        let eventLocation = CLLocation(
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
        )
        
        return userLocation.distance(from: eventLocation)
    }
    
    private func formatDistance(_ distance: Double) -> String {
        let kilometers = distance / 1000
        if kilometers < 1 {
            return String(format: "%.0fm", distance)
        } else {
            return String(format: "%.1fkm", kilometers)
        }
    }
}

#Preview {
    EventCard(event: Event(
        id: "1",
        name: "Basketball Game",
        description: "Friendly basketball game",
        date: Date(),
        eventLocation: Event.EventLocation(
            id: "1",
            name: "Local Court",
            coordinates: Event.EventLocation.Coordinates(
                latitude: 37.7749,
                longitude: -122.4194
            )
        ),
        category: "Sports",
        status: .published,
        isMatchmaking: true,
        skillLevel: .intermediate,
        createdAt: Date(),
        updatedAt: Date()
    ))
    .environmentObject(LocationManager())
    .padding()
} 