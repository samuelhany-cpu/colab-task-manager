import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "samuelhany500@gmail.com",
    pass: process.env.APP_PASSWORD,
  },
});

/**
 * Utility for sending emails using Gmail SMTP.
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

  try {
    const info = await transporter.sendMail({
      from: '"Colab Team" <samuelhany500@gmail.com>',
      to,
      subject,
      html,
    });

    return { success: true, info };
  } catch (err) {
    console.error("[MAIL_EXCEPTION]", err);
    return { success: false, error: err };
  }
}

export function getInvitationHtml(workspaceName: string, inviteLink: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #3b82f6;">You've been invited!</h2>
      <p>Hello,</p>
      <p>You have been invited to join the <strong>${workspaceName}</strong> workspace on Colab.</p>
      <p>Click the button below to accept the invitation and start collaborating:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
      </div>
      <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 10px;">&copy; 2026 Colab Task Manager</p>
    </div>
  `;
}
