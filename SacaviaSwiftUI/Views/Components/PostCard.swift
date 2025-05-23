import SwiftUI

struct PostCard: View {
    let post: Post
    @State private var isExpanded = false
    @State private var isLiked: Bool
    @State private var likeCount: Int
    
    init(post: Post) {
        self.post = post
        _isLiked = State(initialValue: post.isLiked ?? false)
        _likeCount = State(initialValue: post.likeCount ?? 0)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Author info
            HStack {
                AsyncImageView(url: post.author.profileImage?.url)
                    .frame(width: 40, height: 40)
                    .clipShape(Circle())
                
                VStack(alignment: .leading) {
                    Text(post.author.name ?? "Unknown")
                        .font(.headline)
                    Text(post.formattedDate)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                if post.type != .post {
                    Text(post.type.rawValue.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(8)
                }
            }
            
            // Title if available
            if let title = post.title {
                Text(title)
                    .font(.title3)
                    .fontWeight(.semibold)
            }
            
            // Location info for reviews and recommendations
            if let location = post.location {
                HStack {
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(.red)
                    Text(location.name)
                        .font(.subheadline)
                    
                    if post.type == .review, let rating = post.formattedRating {
                        Text(rating)
                            .font(.subheadline)
                            .foregroundColor(.yellow)
                    }
                }
            }
            
            // Content
            Text(post.content)
                .font(.body)
                .lineLimit(isExpanded ? nil : 3)
            
            if post.content.count > 100 {
                Button(action: { isExpanded.toggle() }) {
                    Text(isExpanded ? "Show less" : "Read more")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            
            // Image if available
            if let imageUrl = post.image?.url {
                AsyncImageView(url: imageUrl)
                    .aspectRatio(contentMode: .fill)
                    .frame(maxHeight: 200)
                    .clipped()
                    .cornerRadius(8)
            }
            
            // Interaction buttons
            HStack(spacing: 20) {
                Button(action: handleLike) {
                    HStack {
                        Image(systemName: isLiked ? "heart.fill" : "heart")
                            .foregroundColor(isLiked ? .red : .gray)
                        if likeCount > 0 {
                            Text("\(likeCount)")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                    }
                }
                
                HStack {
                    Image(systemName: "bubble.right")
                        .foregroundColor(.gray)
                    if let commentCount = post.commentCount, commentCount > 0 {
                        Text("\(commentCount)")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                }
                
                Spacer()
                
                Button(action: handleShare) {
                    Image(systemName: "square.and.arrow.up")
                        .foregroundColor(.gray)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    private func handleLike() {
        // Optimistically update UI
        isLiked.toggle()
        likeCount += isLiked ? 1 : -1
        
        // TODO: Implement actual like functionality with API
    }
    
    private func handleShare() {
        // TODO: Implement share functionality
    }
} 