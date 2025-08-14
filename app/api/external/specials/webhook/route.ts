import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '../../../../../payload.config';

interface WebhookSpecial {
  title: string;
  description: string;
  shortDescription?: string;
  specialType: 'discount' | 'happy_hour' | 'bundle' | 'other';
  discountValue?: {
    amount: number;
    type: 'percentage' | 'fixed';
  };
  startDate: string;
  endDate?: string;
  isOngoing?: boolean;
  daysAvailable?: string[];
  timeRestrictions?: {
    startTime?: string;
    endTime?: string;
  };
  termsAndConditions?: string;
  restrictions?: string[];
  imageUrl?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface WebhookRequest {
  businessId: string;
  apiKey: string;
  specials: WebhookSpecial[];
}

interface WebhookResponse {
  success: boolean;
  message: string;
  data?: {
    processed: number;
    created: number;
    errors: Array<{
      index: number;
      error: string;
    }>;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<WebhookResponse>> {
  try {
    const payload = await getPayload({ config });
    
    const body: WebhookRequest = await request.json();

    // Validate required fields
    if (!body.businessId || !body.apiKey || !body.specials) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate API key
    const businessOwner = await payload.find({
      collection: 'users',
      where: {
        businessApiKey: { equals: body.apiKey },
        isBusinessOwner: { equals: true }
      },
      depth: 0
    });

    if (businessOwner.docs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }

    const owner = businessOwner.docs[0];

    // Check if location exists and is owned by this business owner
    const location = await payload.findByID({
      collection: 'locations',
      id: body.businessId,
    });

    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Location not found' },
        { status: 404 }
      );
    }

    if (location.ownership?.ownerId !== owner?.id || location.ownership?.claimStatus !== 'approved') {
      return NextResponse.json(
        { success: false, message: 'You do not own this location' },
        { status: 403 }
      );
    }

    // Check if location allows specials
    if (!location.businessSettings?.allowSpecials) {
      return NextResponse.json(
        { success: false, message: 'This location does not allow specials' },
        { status: 403 }
      );
    }

    let processed = 0;
    let created = 0;
    const errors: Array<{ index: number; error: string }> = [];

    // Process each special
    for (let i = 0; i < body.specials.length; i++) {
      const special = body.specials[i];
      processed++;

      try {
        // Validate special data
        if (!special?.title || !special?.description || !special?.startDate) {
          errors.push({
            index: i,
            error: 'Missing required fields (title, description, startDate)'
          });
          continue;
        }

        // Validate date format
        const startDate = new Date(special.startDate);
        if (isNaN(startDate.getTime())) {
          errors.push({
            index: i,
            error: 'Invalid startDate format'
          });
          continue;
        }

        if (special.endDate) {
          const endDate = new Date(special.endDate);
          if (isNaN(endDate.getTime())) {
            errors.push({
              index: i,
              error: 'Invalid endDate format'
            });
            continue;
          }
        }

        // Create the special
        const newSpecial = await payload.create({
          collection: 'specials',
          data: {
            title: special.title,
            slug: special.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            description: special.description,
            shortDescription: special.shortDescription,
            specialType: special.specialType || 'other',
            discountValue: special.discountValue,
            startDate: special.startDate,
            endDate: special.endDate,
            isOngoing: special.isOngoing,
            daysAvailable: special.daysAvailable,
            timeRestrictions: special.timeRestrictions,
            termsAndConditions: special.termsAndConditions,
            restrictions: special.restrictions,
            location: body.businessId,
            businessOwner: owner?.id,
            createdBy: owner?.id,
            status: 'pending', // Requires admin approval
            notificationSettings: {
              sendPushNotification: true,
              sendEmailNotification: false,
              targetAudience: 'all'
            },
            approvalHistory: [
              {
                action: 'submitted',
                timestamp: new Date().toISOString(),
                notes: 'Submitted via webhook'
              }
            ]
          }
        });

        created++;

        // Create notification for admins
        try {
          const admins = await payload.find({
            collection: 'users',
            where: { role: { equals: 'admin' } },
            depth: 0
          });

          for (const admin of admins.docs) {
            await payload.create({
              collection: 'notifications',
              data: {
                recipient: admin.id,
                type: 'special_review',
                title: 'New Special via Webhook',
                message: `${owner?.name} submitted a new special "${special.title}" for "${location.name}" via webhook`,
                priority: 'normal',
                relatedTo: {
                  relationTo: 'specials',
                  value: newSpecial.id
                },
                read: false,
              },
            });
          }
        } catch (error) {
          console.error('Error creating admin notifications:', error);
        }

      } catch (error) {
        console.error(`Error processing special ${i}:`, error);
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} specials`,
      data: {
        processed,
        created,
        errors
      }
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint is active',
    data: {
      endpoint: '/api/external/specials/webhook',
      method: 'POST',
      requiredFields: ['businessId', 'apiKey', 'specials'],
      documentation: 'Send specials data from N8N or other external systems'
    }
  });
} 