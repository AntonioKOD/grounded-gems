import SwiftUI

struct PostDetailView: View {
    let post: Post
    @Environment(\.dismiss) private var dismiss
    @State private var isLiked: Bool
    @State private var likeCount: Int
    @State private var showingShareSheet = false
    
    init(post: Post) {
        self.post = post
        _isLiked = State(initialValue: post.isLiked ?? false)
        _likeCount = State(initialValue: post.likeCount ?? 0)
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Author info
                HStack {
                    AsyncImageView(url: post.author.profileImage?.url)
                        .frame(width: 50, height: 50)
                        .clipShape(Circle())
                    
                    VStack(alignment: .leading) {
                        Text(post.author.name ?? "Unknown")
                            .font(.headline)
                        Text(post.formattedDate)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    
                    if post.type != .post {
                        Text(post.type.rawValue.capitalized)
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(20)
                    }
                }
                
                // Title if available
                if let title = post.title {
                    Text(title)
                        .font(.title)
                        .fontWeight(.bold)
                }
                
                // Location info for reviews and recommendations
                if let location = post.location {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "mappin.circle.fill")
                                .foregroundColor(.red)
                            Text(location.name)
                                .font(.headline)
                        }
                        
                        if post.type == .review {
                            if let rating = post.formattedRating {
                                Text(rating)
                                    .font(.title2)
                                    .foregroundColor(.yellow)
                            }
                            
                            NavigationLink(destination: LocationDetailSheet(location: location)) {
                                Text("View Location")
                                    .font(.subheadline)
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                // Content
                Text(post.content)
                    .font(.body)
                
                // Image if available
                if let imageUrl = post.image?.url {
                    AsyncImageView(url: imageUrl)
                        .aspectRatio(contentMode: .fill)
                        .frame(maxHeight: 300)
                        .clipped()
                        .cornerRadius(12)
                }
                
                // Categories and tags
                if let categories = post.categories, !categories.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(categories) { category in
                                Text(category.name)
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.gray.opacity(0.1))
                                    .cornerRadius(15)
                            }
                        }
                    }
                }
                
                if let tags = post.tags, !tags.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(tags, id: \.self) { tag in
                                Text("#\(tag)")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
                
                // Interaction buttons
                HStack(spacing: 30) {
                    Button(action: handleLike) {
                        HStack {
                            Image(systemName: isLiked ? "heart.fill" : "heart")
                                .foregroundColor(isLiked ? .red : .gray)
                            if likeCount > 0 {
                                Text("\(likeCount)")
                                    .font(.headline)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    
                    HStack {
                        Image(systemName: "bubble.right")
                            .foregroundColor(.gray)
                        if let commentCount = post.commentCount, commentCount > 0 {
                            Text("\(commentCount)")
                                .font(.headline)
                                .foregroundColor(.gray)
                        }
                    }
                    
                    Spacer()
                    
                    Button(action: { showingShareSheet = true }) {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(.gray)
                    }
                }
                .padding(.vertical)
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button(action: handleReport) {
                        Label("Report", systemImage: "exclamationmark.triangle")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                }
            }
        }
        .sheet(isPresented: $showingShareSheet) {
            if let url = URL(string: "sacavia://post/\(post.id)") {
                ShareSheet(activityItems: [url])
            }
        }
    }
    
    private func handleLike() {
        // Optimistically update UI
        isLiked.toggle()
        likeCount += isLiked ? 1 : -1
        
        // TODO: Implement actual like functionality with API
    }
    
    private func handleReport() {
        // TODO: Implement report functionality
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
} 