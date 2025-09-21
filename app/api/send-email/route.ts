import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, template, data } = await request.json()

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      )
    }

    // For now, we'll use a simple email service
    // In production, you might want to use SendGrid, Resend, or similar
    const emailContent = generateEmailContent(template, data)

    // Log the email (in production, send actual email)
    console.log('📧 Email to be sent:')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Content:', emailContent)

    // TODO: Implement actual email sending service
    // For now, we'll just log it
    // await sendEmail(to, subject, emailContent)

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully' 
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

function generateEmailContent(template: string, data: any): string {
  switch (template) {
    case 'business-claim-notification':
      return `
        <h2>New Business Claim Request</h2>
        <p>A new business claim has been submitted and requires your approval.</p>
        
        <h3>Location Details:</h3>
        <ul>
          <li><strong>Location Name:</strong> ${data.locationName}</li>
          <li><strong>Location ID:</strong> ${data.locationId}</li>
          <li><strong>Location URL:</strong> <a href="${data.locationUrl}">${data.locationUrl}</a></li>
        </ul>
        
        <h3>Claimant Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${data.claimantName}</li>
          <li><strong>Email:</strong> ${data.claimantEmail}</li>
          <li><strong>Claim Method:</strong> ${data.claimMethod}</li>
        </ul>
        
        <h3>Business Information:</h3>
        <ul>
          <li><strong>Business Name:</strong> ${data.businessName || 'Not provided'}</li>
          <li><strong>Description:</strong> ${data.businessDescription || 'Not provided'}</li>
          <li><strong>Address:</strong> ${data.businessAddress ? JSON.stringify(data.businessAddress) : 'Not provided'}</li>
          <li><strong>Website:</strong> ${data.businessWebsite || 'Not provided'}</li>
          <li><strong>Owner Name:</strong> ${data.ownerName || 'Not provided'}</li>
          <li><strong>Owner Phone:</strong> ${data.ownerPhone || 'Not provided'}</li>
        </ul>
        
        <h3>Actions Required:</h3>
        <p>Please review this claim and approve or reject it through the admin panel.</p>
        <p><a href="${data.claimUrl}">Review Claim</a></p>
        
        <p>Best regards,<br>Sacavia Team</p>
      `
    
    case 'claim-decision-notification':
      return `
        <h2>Business Claim ${data.action === 'approve' ? 'Approved' : 'Rejected'}</h2>
        <p>Your business claim for <strong>${data.locationName}</strong> has been ${data.action === 'approve' ? 'approved' : 'rejected'}.</p>
        
        ${data.action === 'approve' ? `
          <h3>🎉 Congratulations!</h3>
          <p>You are now the verified owner of this business listing. You can now:</p>
          <ul>
            <li>Edit your business information</li>
            <li>Add photos and updates</li>
            <li>Respond to reviews</li>
            <li>Manage your business profile</li>
          </ul>
          <p><a href="${data.locationUrl}">View Your Business Listing</a></p>
        ` : `
          <h3>Claim Rejected</h3>
          <p>Unfortunately, your claim for this business has been rejected.</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          <p>If you believe this is an error, please contact our support team.</p>
        `}
        
        <p>Best regards,<br>Sacavia Team</p>
      `
    
    default:
      return `
        <h2>${data.subject || 'Notification'}</h2>
        <p>${JSON.stringify(data, null, 2)}</p>
      `
  }
}
