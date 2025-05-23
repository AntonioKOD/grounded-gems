import SwiftUI

struct ProfileView: View {
    @StateObject private var viewModel = UserViewModel()
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var selectedTab = 0
    @State private var showingEditProfile = false
    @State private var showingImagePicker = false
    @State private var selectedImage: UIImage?
    
    var body: some View {
        NavigationView {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let error = viewModel.error {
                    ErrorView(error: error) {
                        if let userId = authViewModel.currentUser?.id {
                            Task {
                                await viewModel.fetchUserProfile(userId)
                            }
                        }
                    }
                } else if let user = viewModel.user {
                    ScrollView {
                        VStack(spacing: 20) {
                            profileHeader(user: user)
                            profileTabs
                        }
                    }
                } else {
                    VStack {
                        Text("Please sign in to view your profile")
                            .font(.headline)
                        Button("Sign In") {
                            // Navigate to sign in
                        }
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                }
            }
            .navigationTitle("Profile")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if viewModel.user != nil {
                        Menu {
                            Button(action: { showingEditProfile = true }) {
                                Label("Edit Profile", systemImage: "pencil")
                            }
                            Button(action: { showingImagePicker = true }) {
                                Label("Change Photo", systemImage: "photo")
                            }
                            Button(role: .destructive, action: logout) {
                                Label("Logout", systemImage: "arrow.right.square")
                            }
                        } label: {
                            Image(systemName: "ellipsis")
                        }
                    }
                }
            }
            .sheet(isPresented: $showingEditProfile) {
                if let user = viewModel.user {
                    ProfileEditView(user: user)
                }
            }
            .sheet(isPresented: $showingImagePicker) {
                ImagePicker(image: $selectedImage)
            }
            .onChange(of: selectedImage) { newImage in
                if let image = newImage {
                    Task {
                        do {
                            try await viewModel.uploadProfileImage(image)
                            if let userId = viewModel.user?.id {
                                await viewModel.fetchUserProfile(userId)
                            }
                        } catch {
                            // Handle error
                        }
                    }
                }
            }
            .onAppear {
                if let userId = authViewModel.currentUser?.id {
                    Task {
                        await viewModel.fetchUserProfile(userId)
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private func profileHeader(user: User) -> some View {
        VStack(spacing: 16) {
            // Profile Image
            AsyncImageView(url: user.profileImage?.url)
                .frame(width: 100, height: 100)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(Color.blue, lineWidth: 2)
                )
                .onTapGesture {
                    showingImagePicker = true
                }
            
            // Name and Bio
            VStack(spacing: 8) {
                Text(user.name ?? "")
                    .font(.title2)
                    .fontWeight(.bold)
                
                if let bio = user.bio {
                    Text(bio)
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                
                if let location = user.userLocation {
                    HStack {
                        Image(systemName: "mappin.and.ellipse")
                            .foregroundColor(.gray)
                        Text([location.city, location.country].compactMap { $0 }.joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                }
            }
            
            // Stats
            profileStats
            
            // Creator Badge
            if user.isCreator == true {
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundColor(.yellow)
                    Text("Creator")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.yellow.opacity(0.1))
                .cornerRadius(20)
            }
        }
        .padding()
    }
    
    private var profileStats: some View {
        HStack(spacing: 40) {
            VStack {
                Text("\(viewModel.getFollowerCount())")
                    .font(.headline)
                Text("Followers")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            VStack {
                Text("\(viewModel.getFollowingCount())")
                    .font(.headline)
                Text("Following")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            VStack {
                Text("\(viewModel.getPostCount())")
                    .font(.headline)
                Text("Posts")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
    }
    
    private var profileTabs: some View {
        VStack {
            Picker("Content", selection: $selectedTab) {
                Text("Events").tag(0)
                Text("Posts").tag(1)
                Text("Reviews").tag(2)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding(.horizontal)
            TabView(selection: $selectedTab) {
                eventsTab.tag(0)
                postsTab.tag(1)
                reviewsTab.tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
    }
    
    private var eventsTab: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if viewModel.userEvents.isEmpty {
                    EmptyStateView(
                        title: "No Events",
                        message: "You haven't created or joined any events yet.",
                        systemImage: "calendar"
                    )
                } else {
                    ForEach(viewModel.userEvents) { event in
                        NavigationLink(destination: EventDetailView(event: event)) {
                            EventCard(event: event)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding()
        }
    }
    
    private var postsTab: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if viewModel.userPosts.isEmpty {
                    EmptyStateView(
                        title: "No Posts",
                        message: "You haven't created any posts yet.",
                        systemImage: "text.bubble"
                    )
                } else {
                    ForEach(viewModel.userPosts) { post in
                        NavigationLink(destination: PostDetailView(post: post)) {
                            PostCard(post: post)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding()
        }
    }
    
    private var reviewsTab: some View {
        ScrollView {
            if viewModel.getReviewCount() == 0 {
                EmptyStateView(
                    title: "No Reviews",
                    message: "You haven't written any reviews yet.",
                    systemImage: "star"
                )
            } else {
                Text("Reviews coming soon...")
            }
        }
    }
    
    private func logout() {
        Task {
            do {
                try await authViewModel.logout()
            } catch {
                // Handle error
            }
        }
    }
}

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

struct EmptyStateView: View {
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
    ProfileView()
        .environmentObject(AuthViewModel())
} 