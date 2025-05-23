import SwiftUI

struct ProfileEditView: View {
    let user: User
    @StateObject private var viewModel = UserViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var bio: String
    @State private var city: String
    @State private var country: String
    @State private var interests: [String]
    @State private var socialLinks: [SocialLink]
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var isLoading = false
    
    struct SocialLink: Identifiable {
        let id = UUID()
        var platform: String
        var url: String
    }
    
    init(user: User) {
        self.user = user
        _name = State(initialValue: user.name ?? "")
        _bio = State(initialValue: user.bio ?? "")
        _city = State(initialValue: user.userLocation?.city ?? "")
        _country = State(initialValue: user.userLocation?.country ?? "")
        _interests = State(initialValue: user.interests?.map { $0.interest } ?? [])
        _socialLinks = State(initialValue: user.socialLinks?.map {
            SocialLink(platform: $0.platform.rawValue, url: $0.url)
        } ?? [])
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Basic Information")) {
                    TextField("Name", text: $name)
                        .textContentType(.name)
                    
                    TextField("Bio", text: $bio, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section(header: Text("Location")) {
                    TextField("City", text: $city)
                        .textContentType(.addressCity)
                    TextField("Country", text: $country)
                        .textContentType(.countryName)
                }
                
                Section(header: Text("Interests")) {
                    ForEach(interests, id: \.self) { interest in
                        HStack {
                            Text(interest)
                            Spacer()
                            Button(action: { removeInterest(interest) }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    
                    Button(action: addInterest) {
                        Label("Add Interest", systemImage: "plus.circle.fill")
                    }
                }
                
                Section(header: Text("Social Links")) {
                    ForEach($socialLinks) { $link in
                        HStack {
                            TextField("Platform", text: $link.platform)
                                .textContentType(.URL)
                            TextField("URL", text: $link.url)
                                .textContentType(.URL)
                                .keyboardType(.URL)
                            Button(action: { removeSocialLink(link) }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    
                    Button(action: addSocialLink) {
                        Label("Add Social Link", systemImage: "plus.circle.fill")
                    }
                }
                
                if user.isCreator == true {
                    Section(header: Text("Creator Profile")) {
                        // Add creator-specific fields here
                        Text("Creator settings coming soon...")
                            .foregroundColor(.gray)
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .disabled(isLoading)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveProfile()
                    }
                    .disabled(isLoading || !isValid)
                }
            }
            .overlay {
                if isLoading {
                    ProgressView()
                }
            }
            .alert("Error", isPresented: $showingAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !country.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    private func addInterest() {
        let newInterest = "New Interest"
        interests.append(newInterest)
    }
    
    private func removeInterest(_ interest: String) {
        interests.removeAll { $0 == interest }
    }
    
    private func addSocialLink() {
        let newLink = SocialLink(platform: "", url: "")
        socialLinks.append(newLink)
    }
    
    private func removeSocialLink(_ link: SocialLink) {
        socialLinks.removeAll { $0.id == link.id }
    }
    
    private func saveProfile() {
        isLoading = true
        
        Task {
            do {
                let updateRequest = UpdateProfileRequest(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    bio: bio.trimmingCharacters(in: .whitespacesAndNewlines),
                    location: UpdateProfileRequest.LocationInfo(
                        city: city.trimmingCharacters(in: .whitespacesAndNewlines),
                        state: nil,
                        country: country.trimmingCharacters(in: .whitespacesAndNewlines)
                    ),
                    interests: interests.map { UpdateProfileRequest.Interest(interest: $0) },
                    socialLinks: socialLinks.map {
                        UpdateProfileRequest.SocialLink(platform: $0.platform, url: $0.url)
                    }
                )
                try await viewModel.updateProfile(userId: user.id, data: updateRequest)
                await MainActor.run {
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    alertMessage = error.localizedDescription
                    showingAlert = true
                    isLoading = false
                }
            }
        }
    }
}

#Preview {
    ProfileEditView(user: User(
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        bio: "Sports enthusiast",
        userLocation: User.UserLocation(
            city: "San Francisco",
            state: nil,
            country: "USA",
            coordinates: nil
        ),
        interests: [
            User.Interest(interest: "Basketball"),
            User.Interest(interest: "Tennis")
        ],
        isCreator: true,
        joinDate: Date()
    ))
} 