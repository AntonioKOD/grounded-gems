import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

// PayPal SDK - Hardcoded for sandbox
const PAYPAL_CLIENT_ID = 'ATJ9T3M-nmctumSZAIXVqs1TJfwCky7-2YZiPOB__rYJwJw7dpk3PGkEv_S1XB8jZAGGDzT1i7QRn480';
const PAYPAL_CLIENT_SECRET = 'EO0QAx6SeLRP0BIY493VDH4Ti_z3__Ni81n81PV5Lw1xM9ff9Sznaka_Y9C4s3d5RMpxKIf0NPNVK5nC';
const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com'; // Always use sandbox for now

interface CaptureOrderRequest {
  orderID: string;
  locationData: {
    name: string;
    description: string;
    address: {
      city: string;
      state: string;
      country: string;
    };
    featuredImage?: string;
    categories: string[];
    tags?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { orderID, locationData }: CaptureOrderRequest = await request.json();

    if (!orderID) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!locationData || !locationData.name) {
      return NextResponse.json(
        { success: false, error: 'Location data is required' },
        { status: 400 }
      );
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      throw new Error('Failed to get PayPal access token');
    }

    // Capture the PayPal order
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `capture_${Date.now()}`,
      },
    });

    const captureData = await response.json();

    if (!response.ok) {
      console.error('PayPal capture failed:', captureData);
      throw new Error(captureData.message || 'Failed to capture PayPal payment');
    }

    // Check if capture was successful
    if (captureData.status !== 'COMPLETED') {
      throw new Error('Payment was not completed');
    }

    console.log('✅ PayPal payment captured:', orderID);

    // Get the payload instance
    const payload = await getPayload({ config });

    // Create the experience/location in the database
    const experienceData = {
      name: locationData.name,
      description: locationData.description,
      shortDescription: locationData.description.substring(0, 200),
      address: {
        street: '',
        city: locationData.address.city,
        state: locationData.address.state,
        country: locationData.address.country,
        zip: '',
      },
      categories: locationData.categories,
      tags: locationData.tags || [],
      featuredImage: locationData.featuredImage,
      status: 'published',
      contestEligible: true,
      upvotesCount: 0,
      createdBy: 'system', // You might want to get this from the authenticated user
      // Add other required fields as needed
    };

    const experience = await payload.create({
      collection: 'experiences',
      data: experienceData,
    });

    console.log('✅ Experience created for contest:', experience.id);

    // Create a payment record
    const paymentRecord = await payload.create({
      collection: 'contest-payments',
      data: {
        experienceId: experience.id,
        orderId: orderID,
        amount: 20.00,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'paypal',
        paypalOrderId: orderID,
        paypalCaptureId: captureData.id,
        locationName: locationData.name,
        city: locationData.address.city,
        createdAt: new Date().toISOString(),
      },
    });

    console.log('✅ Payment record created:', paymentRecord.id);

    return NextResponse.json({
      success: true,
      orderID: orderID,
      captureData: captureData,
      experienceId: experience.id,
      paymentId: paymentRecord.id,
      message: 'Payment captured and location created successfully',
    });

  } catch (error) {
    console.error('❌ PayPal capture order error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to capture PayPal payment',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

async function getPayPalAccessToken(): Promise<string | null> {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal auth failed:', data);
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    return null;
  }
}
