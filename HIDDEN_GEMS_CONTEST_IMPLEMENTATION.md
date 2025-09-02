# Hidden Gems Contest - Complete Implementation

## 🎯 Contest Overview

The Hidden Gems Contest is a comprehensive competition where users submit their favorite local spots on sacavia.com and compete for $50,000+ in prizes. The contest integrates seamlessly between the main Sacavia app and the dedicated contest platform at vote.sacavia.com.

## 🏆 Prize Structure

### **Major Prizes**
- **Grand Prize**: $25,000 (best overall)
- **City Winners**: $2,000 each (up to 10 cities)
- **Category Minis**: $1,000 each (Food, Outdoors, Art, Nightlife, "Weird & Wonderful")

### **Weekly & Engagement Prizes**
- **Weekly Trending**: $100-$500 to top entry of the week
- **Voter Raffles**: 10 random voters/week get $20
- **Referral Bonus**: Get $20 back when 5 friends enter

## 🔄 Contest Flow

### **1. Entry Submission (sacavia.com)**
- User creates location entry using existing add-location form
- Clicks "Enter Contest" button (new addition)
- Age verification (18+ required)
- $20 entry fee via Stripe checkout
- Location automatically becomes contest eligible

### **2. Contest Integration (vote.sacavia.com)**
- All contest entries appear on voting hub
- Public voting with rate limiting and anti-fraud measures
- 50% public votes + 50% expert judge scoring
- Real-time leaderboard and trending entries

### **3. Winner Selection**
- Public voting throughout submission window + 1 week
- Expert judging (1 week)
- Winners announced on fixed date

## 🏗️ Technical Implementation

### **Backend (sacavia.com)**

#### **Contest Checkout API** (`/app/api/contest/checkout/route.ts`)
- **Functionality**: Creates experiences from location form data
- **Payment**: $20 entry fee via Stripe
- **Data Flow**: Location form → Experience creation → Stripe checkout → Contest eligibility
- **Security**: User authentication, data validation, age verification

#### **Stripe Webhook** (`/app/api/stripe/webhook/route.ts`)
- **Event Handling**: `checkout.session.completed` for contest entries
- **Database Updates**: Sets `contestEligible: true` and `status: 'PUBLISHED'`
- **Notifications**: Sends success notifications to users

#### **Contest Entries API** (`/app/api/contest/entries/route.ts`)
- **Public Access**: Serves contest entries to contest app
- **CORS**: Restricted to contest app domain
- **Caching**: Strategic caching for performance
- **Pagination**: Cursor-based pagination support

#### **Upvote API** (`/app/api/contest/upvote/route.ts`)
- **Voting System**: Toggle upvotes (add/remove)
- **Rate Limiting**: Built-in protection against abuse
- **Real-time Updates**: Immediate count updates

### **Frontend (sacavia.com)**

#### **Add Location Form Updates**
- **New Button**: "Enter Contest" button with trophy icon
- **Contest Dialog**: Age verification and process explanation
- **Integration**: Seamless contest entry without breaking existing flow
- **Validation**: Ensures required fields before contest entry

#### **Contest Entry Process**
- **Form Data**: Maps location form to contest entry format
- **Payment Flow**: Redirects to Stripe checkout
- **Success Handling**: Automatic contest eligibility after payment

### **Contest App (vote.sacavia.com)**

#### **Updated Components**
- **Hero Section**: Reflects new contest structure and prizes
- **Stats Display**: Shows prize pool and contest timeline
- **Features**: Anti-fraud, multiple prize tiers, fair scoring
- **Navigation**: New navigation with contest-specific pages

#### **New Pages**
- **How to Enter** (`/how-to-enter`): Complete contest entry guide
- **Leaderboard** (`/leaderboard`): Voting hub for all entries
- **Navigation**: Sticky navigation with contest entry CTA

#### **Voting System**
- **Authentication**: SSO integration with main app
- **Rate Limiting**: Prevents voting abuse
- **Real-time Updates**: Live vote counts and leaderboard
- **Mobile Optimized**: Responsive design for all devices

## 🔐 Security & Anti-Fraud

### **Authentication**
- **SSO Integration**: Seamless login between apps
- **Session Management**: Iron-session with secure cookies
- **User Verification**: Ensures legitimate contest participants

### **Voting Protection**
- **Rate Limiting**: 60 votes/hour/user maximum
- **Duplicate Prevention**: One vote per entry per user
- **Anomaly Detection**: Flags suspicious voting patterns
- **Wilson Score**: Prevents early snowball bias

### **Content Moderation**
- **Pre-approval**: Entries reviewed before contest eligibility
- **Rights Verification**: Ensures original content and media
- **Location Validation**: Permitted geographies only

## 📱 User Experience

### **Entry Process**
1. **Familiar Interface**: Uses existing location creation form
2. **Clear Options**: Choose between regular submission or contest entry
3. **Transparent Pricing**: $20 fee clearly displayed
4. **Age Verification**: Simple checkbox for 18+ requirement
5. **Secure Payment**: Stripe integration with multiple payment methods

### **Contest Platform**
1. **Clear Navigation**: Easy access to all contest features
2. **Voting Interface**: Intuitive upvote/downvote system
3. **Leaderboard**: Real-time rankings and trending entries
4. **Mobile First**: Optimized for all device sizes

### **Information & Guidance**
1. **How to Enter**: Step-by-step contest entry guide
2. **Prize Structure**: Clear breakdown of all prize categories
3. **Rules & Eligibility**: Comprehensive contest guidelines
4. **Timeline**: Clear contest schedule and deadlines

## 🔗 Integration Points

### **Data Flow**
```
sacavia.com (Entry) → Contest Checkout → Stripe Payment → 
Webhook → Database Update → Contest Eligibility → 
vote.sacavia.com (Voting) → Real-time Updates
```

### **Authentication Flow**
```
sacavia.com (Login) → SSO Token → vote.sacavia.com → 
Session Creation → Seamless Voting Experience
```

### **API Integration**
- **Contest Entries**: Real-time data from main app
- **User Authentication**: Shared SSO system
- **Voting Results**: Immediate updates across platforms

## 📊 Performance & Scalability

### **Caching Strategy**
- **API Responses**: Strategic caching for contest entries
- **Static Content**: Optimized contest pages and assets
- **Database Queries**: Efficient indexing for voting queries

### **Load Handling**
- **Rate Limiting**: Prevents API abuse
- **Pagination**: Handles large numbers of entries
- **Real-time Updates**: Efficient vote counting and updates

## 🚀 Deployment & Configuration

### **Environment Variables**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Contest App URLs
NEXT_PUBLIC_CONTEST_APP_URL=https://vote.sacavia.com
NEXT_PUBLIC_MAIN_APP_URL=https://sacavia.com

# Session & SSO
SESSION_PASSWORD=secure_session_password
SSO_JWT_SECRET=secure_sso_secret
```

### **Database Requirements**
- **Experiences Collection**: Must include contest fields
- **ContestUpvotes Collection**: For voting functionality
- **Proper Indexes**: Performance optimization for queries

## 📈 Growth & Engagement Features

### **Referral System**
- **Entry Referrals**: Track referral codes during checkout
- **Cashback Rewards**: $20 back when 5 friends enter
- **Social Sharing**: Easy sharing of contest entries

### **Community Features**
- **City Badges**: "🔥 Trending in Boston" indicators
- **Category Rankings**: Specialized leaderboards
- **Weekly Highlights**: Featured entries and trends

### **Content Marketing**
- **Share Cards**: Beautiful OG images for social media
- **Creator Showcase**: Weekly highlights and newsletters
- **TikTok Integration**: Short-form content promotion

## 🎯 Success Metrics

### **Entry Goals**
- **Target**: 5,000+ contest entries
- **Revenue**: $100,000+ from entry fees
- **Coverage**: 10+ major cities represented

### **Engagement Goals**
- **Voter Participation**: 10,000+ active voters
- **Vote Volume**: 100,000+ total votes
- **Social Sharing**: High engagement on social platforms

### **Quality Metrics**
- **Content Quality**: High-quality photos and descriptions
- **Geographic Diversity**: Broad city and category coverage
- **User Satisfaction**: Positive feedback and repeat participation

## 🔮 Future Enhancements

### **Immediate (Next 30 days)**
1. **Success Pages**: Better post-payment user experience
2. **Email Notifications**: Contest entry confirmations
3. **Progress Tracking**: Real-time entry status updates

### **Short-term (Next 90 days)**
1. **Multiple Contest Types**: Different entry categories
2. **Tiered Pricing**: Premium contest entry options
3. **Advanced Analytics**: Detailed contest performance metrics

### **Long-term (Next 6 months)**
1. **Mobile App**: Native contest app experience
2. **AI Judging**: Automated content quality assessment
3. **Sponsorship Integration**: Business partnerships and prizes

## ✅ Implementation Status

### **Completed**
- ✅ Contest checkout API with Stripe integration
- ✅ Add location form contest entry integration
- ✅ Contest app with updated UI and messaging
- ✅ Navigation and page structure
- ✅ How to enter guide and contest information
- ✅ Voting system and leaderboard
- ✅ SSO authentication and session management

### **Ready for Production**
- 🚀 Complete contest entry flow
- 🚀 Secure payment processing
- 🚀 Anti-fraud voting system
- 🚀 Real-time contest updates
- 🚀 Mobile-optimized experience

## 🎉 Ready to Launch!

The Hidden Gems Contest is fully implemented and ready for production launch. The system provides:

- **Seamless Integration**: Between main app and contest platform
- **Secure Payments**: $20 entry fees via Stripe
- **Fair Voting**: 50/50 public and judge scoring
- **Anti-Fraud Protection**: Comprehensive security measures
- **Engaging Experience**: Multiple prize tiers and community features
- **Scalable Architecture**: Ready for thousands of entries and voters

**Total Prize Pool**: $50,000+  
**Entry Fee**: $20  
**Timeline**: 4-6 weeks submission + 1 week voting + 1 week judging  
**Expected Entries**: 5,000+  
**Revenue Potential**: $100,000+  

The contest is designed to be self-funding through entry fees while providing significant value to participants and the community. 🏆✨
