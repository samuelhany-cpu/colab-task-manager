import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Utility for sending emails using Resend API.
 * Fallback to console log if API key is not configured (development).
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  console.log(`[MAIL] Sending email to ${to}`);

  // Development fallback - log email instead of sending
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[MAIL] RESEND_API_KEY not configured. Email would be sent to:",
      to,
    );
    console.log("[MAIL] Subject:", subject);
    console.log("[MAIL] Preview link (dev):", extractInviteLink(html));
    return { success: true, info: { dev: true } };
  }

  try {
    const data = await resend.emails.send({
      from: "Colab Task Manager <onboarding@resend.dev>", // Update with your verified domain
      to: [to],
      subject,
      html,
    });

    console.log("[MAIL] Email sent successfully:", data);
    return { success: true, info: data };
  } catch (err) {
    console.error("[MAIL_EXCEPTION]", err);
    return { success: false, error: err };
  }
}

/**
 * Extract invite link from HTML for development logging
 */
function extractInviteLink(html: string): string {
  const match = html.match(/href="([^"]*invite[^"]*)"/);
  return match ? match[1] : "Link not found";
}

export function getInvitationHtml(workspaceName: string, inviteLink: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workspace Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
            🎉 You're Invited!
          </h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px;">
          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
            Hello,
          </p>
          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
            You have been invited to join the <strong style="color: #1f2937;">${workspaceName}</strong> workspace on Colab Task Manager. Start collaborating with your team on tasks, projects, and more!
          </p>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${inviteLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: background-color 0.3s;">
              Accept Invitation →
            </a>
          </div>
          
          <!-- Alternative Link -->
          <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <strong style="color: #374151;">Can't click the button?</strong><br>
            Copy and paste this link into your browser:<br>
            <a href="${inviteLink}" style="color: #3b82f6; word-break: break-all;" target="_blank">${inviteLink}</a>
          </p>
          
          <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
            If you didn't expect this invitation, you can safely ignore this email. The invitation will expire in 7 days.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} Colab Task Manager. All rights reserved.
          </p>
          <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
            Collaborative task management for modern teams.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate email verification template
 */
export function getVerificationHtml(verificationLink: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
            ✉️ Verify Your Email
          </h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
            Welcome to Colab Task Manager!
          </p>
          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
            Please verify your email address to complete your registration and start using Colab.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              Verify Email Address →
            </a>
          </div>
          
          <p style="margin: 30px 0 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 4px; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <strong style="color: #374151;">Alternative link:</strong><br>
            <a href="${verificationLink}" style="color: #10b981; word-break: break-all;" target="_blank">${verificationLink}</a>
          </p>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} Colab Task Manager
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
