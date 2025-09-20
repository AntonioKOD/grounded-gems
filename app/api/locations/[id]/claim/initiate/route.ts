import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { resend } from '@/lib/resend';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config });
    
    // Get the request body
    const body = await request.json();
    const { email } = body;
    
    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Get the location
    const location = await payload.findByID({
      collection: 'locations',
      id: params.id,
    });
    
    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }
    
    // Guard: Check if location is already claimed or pending
    if (location.ownership?.claimStatus && location.ownership.claimStatus !== 'unclaimed') {
      return NextResponse.json(
        { error: 'Location is already claimed or pending claim' },
        { status: 409 }
      );
    }
    
    // Generate claim token (32 characters)
    const claimToken = Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    // Generate expiration date (24 hours from now)
    const claimTokenExpires = new Date();
    claimTokenExpires.setHours(claimTokenExpires.getHours() + 24);
    
    // Update the location with claim data
    await payload.update({
      collection: 'locations',
      id: params.id,
      data: {
        ownership: {
          ...location.ownership,
          claimEmail: email,
          claimStatus: 'pending',
          claimToken,
          claimTokenExpires: claimTokenExpires.toISOString(),
        },
      },
    });
    
    // Send magic link email
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.sacavia.com' 
      : 'http://localhost:3000';
    
    const claimLink = `${baseUrl}/api/locations/${params.id}/claim/verify?token=${claimToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Claim Your Location</title>
      </head>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f7f7f7;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7;">
          <tr>
            <td align="center" style="padding:40px 0;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background:#4a90e2;padding:20px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:24px;">Claim Your Location</h1>
                  </td>
                </tr>
                
                <!-- Greeting & Message -->
                <tr>
                  <td style="padding:30px;">
                    <p style="font-size:16px;color:#333333;margin:0 0 20px;">
                      Hello,
                    </p>
                    <p style="font-size:16px;color:#333333;margin:0 0 20px;">
                      You've requested to claim the location "<strong>${location.name}</strong>" on Sacavia.
                    </p>
                    <p style="font-size:16px;color:#333333;margin:0 0 30px;">
                      Click the button below to verify your ownership and complete the claim process:
                    </p>
                    
                    <!-- CTA Button -->
                    <p style="text-align:center;margin:0 0 30px;">
                      <a href="${claimLink}" 
                         style="background-color:#4a90e2;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
                        Claim Location
                      </a>
                    </p>
                    
                    <p style="font-size:14px;color:#666666;margin:0;">
                      If the button above doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="font-size:14px;color:#4a90e2;word-break:break-all;">
                      ${claimLink}
                    </p>
                    
                    <div style="background-color:#fff3cd;border:1px solid #ffeaa7;border-radius:5px;padding:15px;margin:20px 0;">
                      <p style="margin:0;font-weight:bold;color:#856404;">⏰ Important:</p>
                      <p style="margin:10px 0 0 0;color:#856404;">
                        This link will expire in 24 hours. If you didn't request to claim this location, please ignore this email.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color:#f2f2f2;padding:20px;text-align:center;font-size:12px;color:#666666;">
                    <p style="margin:0;">© ${new Date().getFullYear()} Sacavia. All rights reserved.</p>
                    <p style="margin:5px 0 0;">This is an automated message. Please do not reply.</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    try {
      await resend.emails.send({
        from: `Sacavia <info@sacavia.com>`,
        to: email,
        subject: `Claim Your Location: ${location.name}`,
        html: emailHtml,
      });
      
      console.log(`Claim initiation email sent to ${email} for location ${location.name}`);
    } catch (emailError) {
      console.error('Error sending claim email:', emailError);
      // Don't fail the request if email fails, but log it
    }
    
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error('Error in claim initiation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


