import SwiftUI
import MapKit

// Create a simple wrapper to make EventLocation identifiable for Map view
private struct IdentifiableEventLocation: Identifiable {
    let id: String
    let location: Event.EventLocation
    
    init(location: Event.EventLocation) {
        self.id = location.id
        self.location = location
    }
}

struct EventDetailView: View {
    let event: Event
    @StateObject private var viewModel = EventDetailViewModel()
    @EnvironmentObject var locationManager: LocationManager
    @Environment(\.dismiss) private var dismiss
    @State private var showingJoinSheet = false
    @State private var showingCancelAlert = false
    @State private var selectedMapRegion: MKCoordinateRegion?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
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
                                .frame(maxWidth: .infinity)
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
                }
                
                VStack(alignment: .leading, spacing: 16) {
                    // Event Name and Category
                    HStack {
                        Text(event.name)
                            .font(.title)
                            .fontWeight(.bold)
                        
                        Spacer()
                        
                        if let category = event.category {
                            Text(category)
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.blue.opacity(0.1))
                                .foregroundColor(.blue)
                                .cornerRadius(20)
                        }
                    }
                    
                    // Date and Time
                    HStack {
                        Image(systemName: "calendar")
                            .foregroundColor(.gray)
                        Text(formatDate(event.date))
                            .foregroundColor(.gray)
                    }
                    
                    // Description
                    Text(event.description)
                        .font(.body)
                        .padding(.vertical)
                    
                    // Location
                    if let location = event.eventLocation {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Location")
                                .font(.headline)
                            
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(location.name)
                                        .font(.body)
                                    if let address = location.address {
                                        Text(address)
                                            .font(.subheadline)
                                            .foregroundColor(.gray)
                                    }
                                }
                                
                                Spacer()
                                
                                if let distance = calculateDistance(to: location) {
                                    Text(formatDistance(distance))
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                }
                            }
                            
                            if let coordinates = location.coordinates {
                                let region = MKCoordinateRegion(
                                    center: CLLocationCoordinate2D(
                                        latitude: coordinates.latitude,
                                        longitude: coordinates.longitude
                                    ),
                                    span: MKCoordinateSpan(
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01
                                    )
                                )
                                
                                let annotationItem = IdentifiableEventLocation(location: location)
                                
                                Map(coordinateRegion: .constant(region), annotationItems: [annotationItem]) { item in
                                    MapMarker(
                                        coordinate: CLLocationCoordinate2D(
                                            latitude: coordinates.latitude,
                                            longitude: coordinates.longitude
                                        )
                                    )
                                }
                                .frame(height: 200)
                                .cornerRadius(12)
                            }
                        }
                    }
                    
                    // Participants
                    if let attendees = event.attendees {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Participants")
                                .font(.headline)
                            
                            HStack {
                                Text("\(attendees.count) attending")
                                
                                if let max = event.maxParticipants {
                                    Text("• \(max - attendees.count) spots left")
                                        .foregroundColor(.orange)
                                }
                            }
                            .font(.subheadline)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(attendees) { attendee in
                                        VStack {
                                            if let profileImage = attendee.user.profileImage?.url {
                                                AsyncImage(url: URL(string: profileImage)) { phase in
                                                    switch phase {
                                                    case .empty:
                                                        Circle()
                                                            .fill(Color.gray.opacity(0.2))
                                                            .frame(width: 50, height: 50)
                                                            .overlay {
                                                                ProgressView()
                                                            }
                                                    case .success(let image):
                                                        image
                                                            .resizable()
                                                            .aspectRatio(contentMode: .fill)
                                                            .frame(width: 50, height: 50)
                                                            .clipShape(Circle())
                                                    case .failure:
                                                        Circle()
                                                            .fill(Color.gray.opacity(0.2))
                                                            .frame(width: 50, height: 50)
                                                            .overlay {
                                                                Image(systemName: "person.fill")
                                                                    .foregroundColor(.gray)
                                                            }
                                                    @unknown default:
                                                        EmptyView()
                                                    }
                                                }
                                            } else {
                                                Circle()
                                                    .fill(Color.gray.opacity(0.2))
                                                    .frame(width: 50, height: 50)
                                                    .overlay {
                                                        Image(systemName: "person.fill")
                                                            .foregroundColor(.gray)
                                                    }
                                            }
                                            
                                            Text(attendee.user.name ?? "Unknown")
                                                .font(.caption)
                                                .lineLimit(1)
                                        }
                                    }
                                }
                                .padding(.vertical, 8)
                            }
                        }
                    }
                    
                    // Matchmaking Info
                    if event.isMatchmaking == true {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Matchmaking")
                                .font(.headline)
                            
                            if let skillLevel = event.skillLevel {
                                HStack {
                                    Image(systemName: "figure.run")
                                        .foregroundColor(.green)
                                    Text("Skill Level: \(skillLevel.rawValue.capitalized)")
                                        .foregroundColor(.green)
                                }
                                .font(.subheadline)
                            }
                            
                            if let minParticipants = event.minParticipants {
                                Text("Minimum participants: \(minParticipants)")
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if event.organizer?.id == viewModel.currentUserId {
                    Menu {
                        Button(role: .destructive, action: { showingCancelAlert = true }) {
                            Label("Cancel Event", systemImage: "xmark.circle")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                    }
                } else {
                    Button(action: { showingJoinSheet = true }) {
                        Text("Join")
                            .fontWeight(.semibold)
                    }
                }
            }
        }
        .sheet(isPresented: $showingJoinSheet) {
            JoinEventSheet(event: event) { status in
                Task {
                    do {
                        try await viewModel.joinEvent(event.id, status: status)
                        dismiss()
                    } catch {
                        // Handle error
                    }
                }
            }
        }
        .alert("Cancel Event", isPresented: $showingCancelAlert) {
            Button("Cancel Event", role: .destructive) {
                Task {
                    do {
                        try await viewModel.cancelEvent(event.id)
                        dismiss()
                    } catch {
                        // Handle error
                    }
                }
            }
            Button("Keep Event", role: .cancel) {}
        } message: {
            Text("Are you sure you want to cancel this event? This action cannot be undone.")
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
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
            return String(format: "%.0fm away", distance)
        } else {
            return String(format: "%.1fkm away", kilometers)
        }
    }
}

struct JoinEventSheet: View {
    let event: Event
    let onJoin: (Event.AttendeeStatus) -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    Button(action: { onJoin(.going); dismiss() }) {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("Going")
                        }
                    }
                    
                    Button(action: { onJoin(.interested); dismiss() }) {
                        HStack {
                            Image(systemName: "questionmark.circle.fill")
                                .foregroundColor(.orange)
                            Text("Maybe")
                        }
                    }
                    
                    Button(action: { onJoin(.notGoing); dismiss() }) {
                        HStack {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.red)
                            Text("Not Going")
                        }
                    }
                }
            }
            .navigationTitle("Join Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

class EventDetailViewModel: ObservableObject {
    @Published var currentUserId: String?
    @Published var error: Error?
    
    private let apiService = APIService.shared
    
    init() {
        Task {
            do {
                let user = try await apiService.getCurrentUser()
                await MainActor.run {
                    self.currentUserId = user.id
                }
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
    
    func joinEvent(_ eventId: String, status: Event.AttendeeStatus) async throws {
        try await apiService.joinEvent(eventId, status: status)
    }
    
    func cancelEvent(_ eventId: String) async throws {
        try await apiService.deleteEvent(eventId)
    }
}

#Preview {
    NavigationView {
        EventDetailView(event: Event(
            id: "1",
            name: "Basketball Game",
            description: "Join us for a friendly basketball game! All skill levels welcome.",
            date: Date(),
            eventLocation: Event.EventLocation(
                id: "1",
                name: "Local Court",
                address: "123 Main St, City",
                coordinates: Event.EventLocation.Coordinates(
                    latitude: 37.7749,
                    longitude: -122.4194
                )
            ),
            category: "Sports",
            status: .published,
            isMatchmaking: true,
            skillLevel: .intermediate,
            maxParticipants: 10,
            minParticipants: 4,
            attendees: [
                Event.Attendee(
                    id: "1",
                    user: User(
                        id: "1",
                        name: "John Doe",
                        email: "john@example.com",
                        joinDate: Date()
                    ),
                    status: .going
                )
            ],
            createdAt: Date(),
            updatedAt: Date()
        ))
        .environmentObject(LocationManager())
    }
} 