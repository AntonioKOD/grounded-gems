import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

// PayPal SDK
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'ATJ9T3M-nmctumSZAIXVqs1TJfwCky7-2YZiPOB__rYJwJw7dpk3PGkEv_S1XB8jZAGGDzT1i7QRn480';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'EO0QAx6SeLRP0BIY493VDH4Ti_z3__Ni81n81PV5Lw1xM9ff9Sznaka_Y9C4s3d5RMpxKIf0NPNVK5nC';
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

const CONTEST_ENTRY_PRICE = 20.00;

interface CreateOrderRequest {
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
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const { locationData, amount }: CreateOrderRequest = await request.json();

    if (!locationData || !locationData.name) {
      return NextResponse.json(
        { success: false, error: 'Location data is required' },
        { status: 400 }
      );
    }

    if (amount !== CONTEST_ENTRY_PRICE) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      throw new Error('Failed to get PayPal access token');
    }

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
          description: `Contest Entry: ${locationData.name}`,
          custom_id: `contest_entry_${Date.now()}`,
          soft_descriptor: 'Sacavia Contest',
        },
      ],
      application_context: {
        brand_name: 'Sacavia',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_CONTEST_APP_URL || 'https://vote.sacavia.com'}/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_CONTEST_APP_URL || 'https://vote.sacavia.com'}/cancel`,
      },
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `contest_entry_${Date.now()}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await response.json();

    if (!response.ok) {
      console.error('PayPal order creation failed:', order);
      throw new Error(order.message || 'Failed to create PayPal order');
    }

    // Store order data temporarily (you might want to store this in a database)
    const orderId = order.id;
    
    console.log('✅ PayPal order created:', orderId);

    return NextResponse.json({
      success: true,
      orderId: orderId,
      order: order,
    });

  } catch (error) {
    console.error('❌ PayPal create order error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create PayPal order',
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
