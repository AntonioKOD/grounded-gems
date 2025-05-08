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
                    Welcome to Grounded Gems! Please verify your email address by clicking the button below:
                  </p>
                  
                  <!-- CTA Button -->
                  <p style="text-align:center;margin:0 0 30px;">
                    <a href="${verifyLink}" 
                       style="background-color:#4a90e2;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
                      Verify Email
                    </a>
                  </p>
                  
                  <p style="font-size:14px;color:#666666;margin:0;">
                    If the button above doesn’t work, copy and paste this link into your browser:
                  </p>
                  <p style="font-size:14px;color:#4a90e2;word-break:break-all;">
                    ${verifyLink}
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color:#f2f2f2;padding:20px;text-align:center;font-size:12px;color:#666666;">
                  <p style="margin:0;">© ${new Date().getFullYear()} Grounded Gems. All rights reserved.</p>
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
    from: `Grounded Gems <info@groundedgems.com>`,
    to: email,
    subject: `Please verify your email, ${name}`, 
    html,
  })
}