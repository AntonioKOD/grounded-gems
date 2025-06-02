# 💎 Grounded Gems

**Discover Hidden Treasures in Your Local Area**

Grounded Gems is a community-driven platform that helps you discover authentic experiences and hidden gems in your local area. Connect with your community through meaningful events and places that matter.

## ✨ Features

- 🗺️ **Explore Map** - Discover hidden gems near you with our interactive map
- 🎉 **Local Events** - Find and create authentic community events
- 📱 **Community Feed** - Stay connected with local highlights and activities
- 👥 **Social Connection** - Connect with like-minded people in your area
- 📍 **Location Sharing** - Share your favorite spots with the community
- 🔔 **Smart Notifications** - Get notified about events and activities you care about
- 📱 **PWA Support** - Install as an app for the best experience

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/grounded-gems.git
cd grounded-gems
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
- MongoDB connection string
- NextAuth configuration
- Email service settings
- Other required environment variables

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Payload CMS
- **Database**: MongoDB
- **Authentication**: NextAuth.js
- **Maps**: Mapbox/Google Maps
- **Notifications**: Web Push API
- **PWA**: Service Workers, Web App Manifest

## 📱 Progressive Web App

Grounded Gems is built as a Progressive Web App (PWA) with:

- ✅ Offline functionality
- ✅ Push notifications
- ✅ App-like experience
- ✅ Install prompts
- ✅ Background sync

## 🎨 Design System

The app uses a cohesive design system with:

- **Primary Colors**: Coral (#FF6B6B) and Teal (#4ECDC4)
- **Typography**: Modern, readable fonts
- **Components**: Reusable UI components
- **Responsive**: Mobile-first design

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for local communities
- Inspired by the need for authentic local connections
- Thanks to all contributors and community members

---

**Grounded Gems** - *Discover Hidden Treasures* 💎

## Recent Updates

### Mobile API Enhancements (Latest)
- ✅ Fixed image upload integration with Payload CMS
- ✅ Improved mobile app authentication with JWT token format
- ✅ Enhanced post creation with proper media handling
- ✅ Optimized API endpoints for React Native compatibility
- ✅ Added comprehensive error handling and logging
- ✅ **FIXED: "DataView offset" errors with manual file processing system**

### NEW: Manual Upload System (DataView Error Fix)
- 🔧 **Complete solution for "Offset is outside the bounds of the DataView" errors**
- 🔧 **Bypasses Payload CMS automatic file processing that triggers image-size library**
- 🔧 **Manual file validation and processing to prevent corruption issues**
- 🔧 **Direct file system storage with custom media serving endpoint**
- 🔧 **Enhanced error handling for corrupted or incomplete image files**

#### Technical Details
The DataView errors were caused by Payload CMS's `generateFileData` function using the `image-size` library to analyze uploaded images. When corrupted or incomplete image data reached this library, it would fail trying to read image dimensions with:

```
RangeError: Offset is outside the bounds of the DataView
```

**Solution implemented:**
1. **Manual file processing**: Bypass Payload's automatic upload handlers
2. **Custom validation**: Validate image headers and signatures before processing
3. **Direct storage**: Save files directly to filesystem without image-size analysis
4. **Custom serving**: Serve media files through dedicated API route
5. **Graceful handling**: Return user-friendly errors for corrupted files

This approach prevents the corruption from reaching the problematic image-size library while maintaining full upload functionality.

### Mobile App Features
- 📱 Post creation with image/video uploads
- 🗺️ Location discovery and mapping
- 👥 User authentication and profiles
- 📰 Personalized feed with real-time updates
- 💾 Offline caching and sync capabilities

## API Documentation

### Mobile Endpoints
- `POST /api/v1/mobile/auth/login` - User authentication
- `POST /api/v1/mobile/auth/register` - User registration
- `GET /api/v1/mobile/auth/me` - Get current user
- `POST /api/v1/mobile/upload/image` - Upload images
- `POST /api/v1/mobile/posts` - Create posts
- `GET /api/v1/mobile/posts/feed` - Get personalized feed
- `GET /api/v1/mobile/locations` - Search locations


