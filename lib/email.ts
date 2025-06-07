/* eslint-disable @typescript-eslint/no-explicit-any */
import { resend } from "./resend"

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<any> {
  // 1. Build the verification link
  const verifyLink = `${process.env.PAYLOAD_SERVER_URL}/verify?token=${token}`

  // 2. Create the HTML email content
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Verify Your Email</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f7f7f7;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7;">
        <tr>
          <td align="center" style="padding:40px 0;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background:#4a90e2;padding:20px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">Verify Your Email</h1>
                </td>
              </tr>
              
              <!-- Greeting & Message -->
              <tr>
                <td style="padding:30px;">
                  <p style="font-size:16px;color:#333333;margin:0 0 20px;">
                    Hi ${name},
                  </p>
                  <p style="font-size:16px;color:#333333;margin:0 0 30px;">
                    Welcome to Sacavia! Please verify your email address by clicking the button below:
                  </p>
                  
                  <!-- CTA Button -->
                  <p style="text-align:center;margin:0 0 30px;">
                    <a href="${verifyLink}" 
                       style="background-color:#4a90e2;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
                      Verify Email
                    </a>
                  </p>
                  
                  <p style="font-size:14px;color:#666666;margin:0;">
                    If the button above doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="font-size:14px;color:#4a90e2;word-break:break-all;">
                    ${verifyLink}
                  </p>
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
  `

  // 3. Send the email via Resend
  return resend.emails.send({
    from: `Sacavia <info@sacavia.com>`,
    to: email,
    subject: `Please verify your email, ${name}`, 
    html,
  })
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    await resend.emails.send({
      from: `Sacavia <info@sacavia.com>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    console.log('Email sent successfully to:', options.to)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

// Email templates
export const eventRequestEmailTemplate = {
  toOwner: (data: {
    ownerName: string
    requesterName: string
    eventTitle: string
    locationName: string
    eventDescription: string
    contactEmail: string
    dashboardUrl: string
  }) => ({
    subject: `New Event Request for ${data.locationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b6b;">New Event Request</h2>
        <p>Hi ${data.ownerName},</p>
        <p>You have received a new event request for your location <strong>${data.locationName}</strong>.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Event Details</h3>
          <p><strong>Event Title:</strong> ${data.eventTitle}</p>
          <p><strong>Description:</strong> ${data.eventDescription}</p>
          <p><strong>Requested by:</strong> ${data.requesterName}</p>
          <p><strong>Contact Email:</strong> ${data.contactEmail}</p>
        </div>
        
        <p>
          <a href="${data.dashboardUrl}" 
             style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Request
          </a>
        </p>
        
        <p>You can approve or deny this request from your location dashboard.</p>
        
        <p>Best regards,<br>The Sacavia Team</p>
      </div>
    `,
  }),

  approvalNotification: (data: {
    requesterName: string
    eventTitle: string
    locationName: string
    ownerEmail: string
    createEventUrl: string
    approvalNotes?: string
  }) => ({
    subject: `Event Request Approved: ${data.eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Event Request Approved! 🎉</h2>
        <p>Hi ${data.requesterName},</p>
        <p>Great news! Your event request has been approved.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #333;">Approved Event</h3>
          <p><strong>Event:</strong> ${data.eventTitle}</p>
          <p><strong>Location:</strong> ${data.locationName}</p>
          ${data.approvalNotes ? `<p><strong>Notes from owner:</strong> ${data.approvalNotes}</p>` : ''}
        </div>
        
        <p>
          <a href="${data.createEventUrl}" 
             style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Create Your Event
          </a>
        </p>
        
        <p>You can now create your event and start inviting guests! You can also contact the location owner directly at ${data.ownerEmail} if you need to coordinate any details.</p>
        
        <p>Best regards,<br>The Sacavia Team</p>
      </div>
    `,
  }),

  denialNotification: (data: {
    requesterName: string
    eventTitle: string
    locationName: string
    ownerEmail: string
    denialReason?: string
  }) => ({
    subject: `Event Request Update: ${data.eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Event Request Update</h2>
        <p>Hi ${data.requesterName},</p>
        <p>Thank you for your interest in hosting an event at ${data.locationName}. Unfortunately, your request could not be accommodated at this time.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #333;">Request Details</h3>
          <p><strong>Event:</strong> ${data.eventTitle}</p>
          <p><strong>Location:</strong> ${data.locationName}</p>
          ${data.denialReason ? `<p><strong>Reason:</strong> ${data.denialReason}</p>` : ''}
        </div>
        
        <p>If you have questions or would like to discuss alternative arrangements, feel free to contact the location owner directly at ${data.ownerEmail}.</p>
        
        <p>Don't give up! There are many other great venues on Sacavia that might be perfect for your event.</p>
        
        <p>Best regards,<br>The Sacavia Team</p>
      </div>
    `,
  }),
}

export const journeyInviteEmailTemplate = (data: {
  inviteeName: string
  inviteeEmail: string
  journeyTitle: string
  journeySummary: string
  inviterName: string
  journeyUrl: string
}) => ({
  subject: `You're invited to join a Gem Journey: ${data.journeyTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #FF6B6B;">You've been invited to a Gem Journey!</h2>
      <p>Hi ${data.inviteeName || data.inviteeEmail},</p>
      <p><strong>${data.inviterName}</strong> has invited you to join the journey <strong>"${data.journeyTitle}"</strong> on Sacavia.</p>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Journey Details</h3>
        <p><strong>Title:</strong> ${data.journeyTitle}</p>
        <p><strong>Summary:</strong> ${data.journeySummary}</p>
      </div>
      <p>
        <a href="${data.journeyUrl}" 
           style="background: #4ECDC4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Journey & Accept Invite
        </a>
      </p>
      <p>We hope you enjoy planning and sharing your adventures together!</p>
      <p style="margin-top: 32px; color: #888; font-size: 13px;">— The Sacavia Team</p>
    </div>
  `,
})



