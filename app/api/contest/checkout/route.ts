import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import Stripe from 'stripe';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
}) : null;

// Contest entry price (in cents)
const CONTEST_ENTRY_PRICE = 2000; // $20.00

// Validation schema for contest entry data
const contestEntrySchema = z.object({
  // Location data
  name: z.string().min(1, 'Location name is required'),
  slug: z.string().min(1, 'Location slug is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDescription: z.string().optional(),
  featuredImage: z.string().optional(),
  gallery: z.array(z.object({
    image: z.string(),
    caption: z.string().optional(),
  })).optional(),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  tags: z.array(z.string()).optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zip: z.string().min(1, 'ZIP code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  neighborhood: z.string().optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    socialMedia: z.object({
      facebook: z.string().optional(),
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      linkedin: z.string().optional(),
    }).optional(),
  }).optional(),
  businessHours: z.array(z.object({
    day: z.string(),
    open: z.string(),
    close: z.string(),
    isClosed: z.boolean(),
  })).optional(),
  priceRange: z.enum(['free', 'budget', 'moderate', 'expensive', 'luxury']).optional(),
  bestTimeToVisit: z.array(z.string()).optional(),
  insiderTips: z.string().optional(),
  accessibility: z.object({
    wheelchairAccess: z.boolean().optional(),
    parking: z.boolean().optional(),
    other: z.string().optional(),
  }).optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  hasBusinessPartnership: z.boolean().optional(),
  partnershipDetails: z.object({
    partnerName: z.string().optional(),
    partnerContact: z.string().optional(),
    details: z.string().optional(),
  }).optional(),
  meta: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.string().optional(),
  }).optional(),
  privacy: z.enum(['public', 'private', 'unlisted']).default('public'),
  privateAccess: z.array(z.string()).optional(),
  
  // Contest entry specific
  attested18: z.boolean().refine(val => val === true, 'You must be 18 or older to enter contests'),
});

interface ContestCheckoutResponse {
  success: boolean;
  url?: string;
  error?: string;
  code?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('❌ Stripe is not configured');
      return NextResponse.json(
        { success: false, error: 'Payment system not available' },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = contestEntrySchema.safeParse(body);
    
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const formData = validation.data;

    // Get user from request (you'll need to implement authentication)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🎯 Contest entry request:', { 
      locationName: formData.name, 
      userId,
      city: formData.address.city 
    });

    // Initialize PayloadCMS
    const payload = await getPayload({ config });

    // Verify user exists
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Create the location/experience in the database
    const experienceData = {
      // Basic info
      title: formData.name,
      slug: formData.slug,
      description: formData.description,
      shortDescription: formData.shortDescription,
      
      // Media
      featuredImage: formData.featuredImage,
      gallery: formData.gallery,
      
      // Categories and tags
      categories: formData.categories,
      tags: formData.tags,
      
      // Address
      city: formData.address.city,
      address: formData.address,
      neighborhood: formData.neighborhood,
      
      // Contact and business
      contactInfo: formData.contactInfo,
      businessHours: formData.businessHours,
      priceRange: formData.priceRange,
      
      // Visitor info
      bestTimeToVisit: formData.bestTimeToVisit,
      insiderTips: formData.insiderTips,
      accessibility: formData.accessibility,
      
      // Status and verification
      status: 'DRAFT', // Will be updated to PUBLISHED after payment
      isFeatured: formData.isFeatured,
      isVerified: formData.isVerified,
      contestEligible: false, // Will be updated to true after payment
      
      // Business partnership
      hasBusinessPartnership: formData.hasBusinessPartnership,
      partnershipDetails: formData.partnershipDetails,
      
      // SEO and metadata
      meta: formData.meta,
      
      // Privacy settings
      privacy: formData.privacy,
      privateAccess: formData.privateAccess,
      
      // Ownership
      owner: userId,
      createdBy: userId,
    };

    // Create the experience
    const experience = await payload.create({
      collection: 'experiences',
      data: experienceData,
    });

    console.log('✅ Experience created:', experience.id);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Contest Entry',
              description: `Enter "${formData.name}" in the Sacavia Contest`,
              images: formData.featuredImage ? [formData.featuredImage] : undefined,
            },
            unit_amount: CONTEST_ENTRY_PRICE,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_CONTEST_APP_URL || 'https://vote.sacavia.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_CONTEST_APP_URL || 'https://vote.sacavia.com'}/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        experienceId: experience.id,
        userId: userId,
        type: 'contest_entry',
        locationName: formData.name,
        city: formData.address.city,
      },
      customer_email: user.email,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'], // Add more as needed
      },
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    console.log('✅ Stripe checkout session created:', session.id);

    const response: ContestCheckoutResponse = {
      success: true,
      url: session.url,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Contest checkout error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create contest entry',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET method for health check
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Contest checkout endpoint is ready',
    price: `$${(CONTEST_ENTRY_PRICE / 100).toFixed(2)}`,
  });
}
