# 🏔️ Sacavia

*Guided Discovery. Authentic Journeys. Connected Communities.*

Sacavia is a community-driven platform that helps you discover authentic experiences and meaningful places in your local area. Named after the legendary guide Sacagawea, our platform honors the spirit of exploration and community connection, helping you navigate to hidden treasures and create lasting memories with your tribe.

## 🌟 Overview

Sacavia empowers you to:
- **Discover** hidden gems and authentic local experiences
- **Connect** with like-minded explorers in your community  
- **Share** your own discoveries and sacred places
- **Plan** meaningful journeys with friends and family
- **Experience** places through the eyes of local guides

Whether you're seeking adventure on new trails, gathering places for community events, or simply want to explore your area with the wisdom of local knowledge, Sacavia guides your path to discovery.

## ✨ Key Features

### 🗺️ **Guided Discovery**
- Interactive map with curated locations
- Location verification by community members
- Insider tips and cultural context
- Accessibility information and inclusive spaces

### 🎯 **Smart Matching**  
- AI-powered recommendations based on your interests
- Event matchmaking for group activities
- Community-driven content curation
- Personalized journey suggestions

### 🤝 **Community Connection**
- Create and join local events
- Share experiences through stories and photos
- Follow trusted local guides and explorers
- Build your network of adventure companions

### 📱 **Native Mobile Experience**
- Progressive Web App (PWA) for all devices
- Offline functionality for remote adventures
- Push notifications for event updates
- Location-based proximity alerts

## 🛠️ Technology

Sacavia is built as a Progressive Web App (PWA) with:

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Leaflet/MapLibre** - Interactive mapping
- **PWA** - Native app experience on web

### Backend  
- **Payload CMS** - Headless content management
- **MongoDB** - Flexible document database
- **Vercel** - Serverless deployment
- **Resend** - Transactional emails
- **JWT** - Secure authentication

### Mobile
- **Capacitor** - Native mobile app wrapper
- **iOS/Android** - Cross-platform deployment
- **Push Notifications** - Real-time engagement
- **Geolocation** - Location-aware features

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB database
- Vercel account (for deployment)

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/sacavia.git
cd sacavia

# Install dependencies
npm install

# Create environment variables file
touch .env.local

# Configure your environment variables in .env.local
# PAYLOAD_SECRET, MONGODB_URI, RESEND_API_KEY, etc.
# FOURSQUARE_API_KEY (optional - for place discovery features)

# Run development server
npm run dev
```

### Foursquare Integration (Optional)

To enable the Foursquare place discovery features:

1. **Get a Foursquare API Key**:
   - Visit [Foursquare Developer Portal](https://developer.foursquare.com/)
   - Create an account and register a new app
   - Copy your API key

2. **Configure Environment Variables**:
   ```bash
   # Add to your .env.local file
   FOURSQUARE_API_KEY=your_foursquare_api_key_here
   ```

3. **Features Enabled**:
   - Admin place import from Foursquare database
   - Discovery of nearby places for users
   - Rich place data including hours, ratings, and tips
   - Automatic location data mapping

> **Note**: The app will work without Foursquare integration, but place discovery features will be disabled.

**Sacavia** - *Your Guide to Authentic Discovery* 🏔️

## 🎨 Design Philosophy

Inspired by the wisdom of indigenous navigation and the spirit of Sacagawea's guidance, Sacavia embraces:

- **Respect for Place** - Honor the land and communities you visit
- **Authentic Connection** - Build genuine relationships with people and places
- **Guided Wisdom** - Learn from those who know the land best
- **Sustainable Exploration** - Discover responsibly and give back
- **Inclusive Community** - Welcome all travelers on their journey

## 🌐 API Documentation

### Mobile API Endpoints

Sacavia provides a comprehensive REST API for mobile applications:

#### Authentication
```typescript
POST /api/v1/mobile/auth/login
POST /api/v1/mobile/auth/register  
GET  /api/v1/mobile/auth/me
POST /api/v1/mobile/auth/logout
```

#### Discovery & Places
```typescript
GET  /api/v1/mobile/locations
POST /api/v1/mobile/locations
GET  /api/v1/mobile/locations/[id]
POST /api/v1/mobile/locations/[id]/interact
```

#### Community & Events
```typescript
GET  /api/v1/mobile/events
POST /api/v1/mobile/events
POST /api/v1/mobile/events/[id]/rsvp
```

#### Stories & Content
```typescript
GET  /api/v1/mobile/posts
POST /api/v1/mobile/posts  
GET  /api/v1/mobile/posts/[id]
POST /api/v1/mobile/posts/comments
```

#### Search & Navigation
```typescript
GET  /api/v1/mobile/search
POST /api/v1/mobile/search/suggestions
```

## 🤝 Contributing

We welcome contributions from fellow explorers! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- Inspired by the courage and wisdom of Sacagawea
- Built with respect for indigenous knowledge and land stewardship
- Powered by the open-source community

## 📞 Connect With Us

- **Website**: [sacavia.com](https://sacavia.com)
- **Email**: hello@sacavia.com
- **Community**: Join our Discord server
- **Updates**: Follow us on social media

---

*"The land knows you, even when you are lost."* - Robin Wall Kimmerer

**Sacavia** - Where every journey begins with wisdom. 🏔️✨

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

## Project Structure

```
sacavia/
├── app/                     # Next.js App Router
├── components/              # React components
├── lib/                     # Utilities and configurations
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript type definitions
├── public/                  # Static assets
├── ios/                     # Native iOS project (generated)
├── android/                 # Native Android project (generated)
├── capacitor.config.ts      # Capacitor configuration
└── next.config.ts          # Next.js configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both web and mobile
5. Submit a pull request

## License

[MIT License](LICENSE)


