# Payout and Revenue System Documentation

## Overview

This document explains how creators get paid and how the platform generates revenue through the guide marketplace system.

## Revenue Flow

### 1. Guide Purchase Process

When a user purchases a guide, the following happens:

```
User Payment ($10.00)
├── Stripe Processing Fee ($0.59) → Stripe
├── Platform Commission ($1.50) → Platform Revenue
└── Creator Earnings ($7.91) → Creator's Available Balance
```

**Fee Breakdown:**
- **Platform Commission**: 15% of total amount
- **Stripe Processing Fee**: 2.9% + $0.30 per transaction
- **Creator Earnings**: Remaining amount after fees

### 2. Revenue Distribution

| Component | Amount | Recipient | Purpose |
|-----------|--------|-----------|---------|
| Total Payment | $10.00 | Platform | User's payment |
| Stripe Fee | $0.59 | Stripe | Payment processing |
| Platform Fee | $1.50 | Platform | Platform revenue |
| Creator Earnings | $7.91 | Creator | Creator's income |

## Creator Payout System

### 1. Earnings Tracking

Creators have two types of balances:
- **Available Balance**: Ready for payout
- **Pending Balance**: In processing or hold period

### 2. Payout Methods

#### Stripe Connect (Recommended)
- **Setup**: Creators connect their Stripe account
- **Processing**: Instant transfers to creator's bank account
- **Timing**: 1-2 business days
- **Fees**: No additional fees

#### Manual Payouts
- **Methods**: PayPal, Bank Transfer, Check
- **Processing**: Manual processing by admin
- **Timing**: 3-5 business days
- **Fees**: May incur additional fees

### 3. Payout Requirements

- **Minimum Payout**: $25.00
- **Available Balance**: Must have sufficient funds
- **Stripe Account**: Must be verified and active
- **Tax Information**: Must be complete

## Platform Revenue Sources

### 1. Guide Sales Commission
- **Rate**: 15% of each guide sale
- **Example**: $10 guide = $1.50 platform revenue

### 2. Premium Features (Future)
- **Creator Verification**: One-time fees
- **Featured Listings**: Monthly subscription
- **Advanced Analytics**: Premium tier

### 3. Advertising (Future)
- **Sponsored Guides**: Promoted content
- **Banner Ads**: Display advertising
- **Affiliate Marketing**: Commission from partners

## Technical Implementation

### 1. Purchase Flow

```typescript
// When guide is purchased
const totalAmount = 1000 // $10.00 in cents
const stripeFee = Math.round(totalAmount * 0.029 + 30) // $0.59
const platformFee = Math.round(totalAmount * 0.15) // $1.50
const creatorEarnings = totalAmount - stripeFee - platformFee // $7.91
```

### 2. Payout Processing

```typescript
// When creator requests payout
const transfer = await stripe.transfers.create({
  amount: Math.round(amount * 100), // Convert to cents
  currency: 'usd',
  destination: creator.stripeAccountId,
  description: `Payout for ${creator.name}`
})
```

### 3. Balance Management

```typescript
// Update creator balances
await payload.update({
  collection: 'users',
  id: creatorId,
  data: {
    'creatorProfile.earnings.availableBalance': newAvailableBalance,
    'creatorProfile.earnings.pendingBalance': newPendingBalance,
    'creatorProfile.earnings.totalPayouts': totalPayouts
  }
})
```

## Admin Revenue Dashboard

### 1. Revenue Metrics
- **Total Revenue**: All guide sales
- **Platform Fees**: Commission collected
- **Stripe Fees**: Processing costs
- **Net Revenue**: Platform fees minus Stripe fees
- **Average Order Value**: Revenue per transaction

### 2. Creator Analytics
- **Top Earning Creators**: Highest revenue generators
- **Top Selling Guides**: Most popular content
- **Conversion Rates**: Sales per view ratios
- **Monthly Trends**: Revenue growth patterns

### 3. Financial Reports
- **Monthly Revenue**: Revenue by month
- **Creator Payouts**: Total paid to creators
- **Platform Profit**: Net revenue after costs
- **Growth Metrics**: Month-over-month changes

## Security and Compliance

### 1. Payment Security
- **PCI Compliance**: Stripe handles sensitive data
- **Encryption**: All payment data encrypted
- **Fraud Protection**: Stripe's built-in protection

### 2. Tax Compliance
- **1099-K Forms**: Automatic generation for creators
- **Tax Reporting**: Platform reports to IRS
- **International Tax**: Handles different jurisdictions

### 3. Data Protection
- **GDPR Compliance**: European data protection
- **Data Retention**: Secure storage policies
- **Access Control**: Role-based permissions

## Future Enhancements

### 1. Advanced Payout Features
- **Scheduled Payouts**: Automatic monthly payments
- **Multiple Currencies**: International support
- **Split Payments**: Multiple creator collaborations

### 2. Revenue Optimization
- **Dynamic Pricing**: AI-powered pricing
- **Bundle Deals**: Multiple guide packages
- **Subscription Models**: Recurring revenue

### 3. Creator Tools
- **Revenue Analytics**: Detailed earnings insights
- **Tax Calculators**: Estimated tax obligations
- **Financial Planning**: Budgeting and forecasting

## API Endpoints

### Creator Endpoints
- `GET /api/creators/[id]/earnings` - Get earnings data
- `POST /api/creators/[id]/payout` - Request payout
- `GET /api/creators/[id]/payout` - Get payout history
- `POST /api/creators/[id]/stripe-connect` - Setup Stripe Connect
- `GET /api/creators/[id]/stripe-connect` - Check Stripe status

### Admin Endpoints
- `GET /api/admin/platform-revenue` - Get platform revenue stats
- `GET /api/payouts` - Get all payout records
- `PUT /api/payouts/[id]` - Update payout status

### Purchase Endpoints
- `POST /api/guides/[id]/purchase` - Purchase guide
- `GET /api/guides/[id]/purchase` - Check purchase status

## Database Collections

### 1. GuidePurchases
Tracks all guide purchases with fee breakdowns

### 2. Payouts
Records all payout transactions and status

### 3. Users (Creator Profile)
Stores creator earnings and payout information

### 4. Guides
Contains guide pricing and sales statistics

## Monitoring and Alerts

### 1. Revenue Monitoring
- **Daily Revenue**: Track daily sales
- **Anomaly Detection**: Unusual transaction patterns
- **Growth Tracking**: Revenue trend analysis

### 2. Payout Monitoring
- **Failed Payouts**: Automatic retry logic
- **Large Payouts**: Manual review for high amounts
- **Creator Alerts**: Notifications for issues

### 3. System Health
- **API Performance**: Response time monitoring
- **Error Tracking**: Failed transaction logging
- **Uptime Monitoring**: Service availability

## Support and Documentation

### 1. Creator Support
- **Payout FAQ**: Common questions and answers
- **Setup Guides**: Step-by-step instructions
- **Troubleshooting**: Common issues and solutions

### 2. Admin Support
- **Revenue Reports**: Detailed financial analysis
- **Creator Management**: Tools for managing creators
- **System Administration**: Platform maintenance

### 3. Technical Support
- **API Documentation**: Developer resources
- **Integration Guides**: Third-party integrations
- **Best Practices**: Recommended implementations

---

This system provides a complete, secure, and scalable solution for managing creator payouts and platform revenue while ensuring compliance with financial regulations and providing excellent user experience for both creators and platform administrators. 