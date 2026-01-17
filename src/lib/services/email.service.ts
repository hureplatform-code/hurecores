// Brevo Email Service (Client-Side)
// WARNING: This implementation exposes the API Key to the client.
// This is done to bypass Firebase Cloud Functions limitations on the Spark plan.

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailParams {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
}

const API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const SENDER_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL;
const SENDER_NAME = import.meta.env.VITE_BREVO_SENDER_NAME;

// Helper to send email directly via Brevo API
async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!API_KEY || !SENDER_EMAIL) {
    console.error('Brevo API Key or Sender Email not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME || 'HURE Core',
          email: SENDER_EMAIL
        },
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Email sent successfully:', data.messageId);
      return true;
    } else {
      console.error('Failed to send email:', data);
      return false;
    }
  } catch (error) {
    console.error('Network error sending email:', error);
    return false;
  }
}

// Email Templates
const templates = {
  staffInvitation: (data: { orgName: string; inviteLink: string; recipientName: string }) => ({
    subject: `You've been invited to join ${data.orgName} on HURE Core`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🏥 HURE Core</h1>
          </div>
          <div class="content">
            <h2>Welcome to ${data.orgName}!</h2>
            <p>Hi ${data.recipientName},</p>
            <p>You've been invited to join <strong>${data.orgName}</strong> on HURE Core.</p>
            <center>
              <a href="${data.inviteLink}" class="button">Accept Invitation</a>
            </center>
          </div>
          <div class="footer">
            <p>© 2026 HURE Core. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (data: { resetLink: string; recipientName: string }) => ({
    subject: 'Reset Your HURE Core Password',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Reset Password</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Click below to reset your password:</p>
          <a href="${data.resetLink}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
      </body>
      </html>
    `
  }),

  verificationStatus: (data: { status: 'Verified' | 'Rejected'; entityType: string; entityName: string; reason?: string; recipientName: string }) => ({
    subject: `${data.entityType} Verification ${data.status}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Verification ${data.status}</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Your ${data.entityType} <strong>${data.entityName}</strong> has been ${data.status.toLowerCase()}.</p>
          ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
        </div>
      </body>
      </html>
    `
  }),

  welcomeEmail: (data: { orgName: string; recipientName: string }) => ({
    subject: `Welcome to HURE Core!`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome!</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Welcome to HURE Core. Your organization <strong>${data.orgName}</strong> is ready.</p>
        </div>
      </body>
      </html>
    `
  }),

  otpEmail: (data: { otp: string; recipientName: string }) => ({
    subject: 'Your HURE Core Verification Code',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
          <h2 style="color: #2563eb;">Verification Code</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0;">${data.otp}</div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      </body>
      </html>
    `
  })
};

// Export email service functions
export const emailService = {
  async sendStaffInvitation(email: string, name: string, orgName: string, inviteLink: string): Promise<boolean> {
    const template = templates.staffInvitation({ orgName, inviteLink, recipientName: name });
    return sendEmail({
      to: [{ email, name }],
      subject: template.subject,
      htmlContent: template.htmlContent
    });
  },

  async sendPasswordReset(email: string, name: string, resetLink: string): Promise<boolean> {
    const template = templates.passwordReset({ resetLink, recipientName: name });
    return sendEmail({
      to: [{ email, name }],
      subject: template.subject,
      htmlContent: template.htmlContent
    });
  },

  async sendVerificationNotification(
    email: string,
    name: string,
    status: 'Verified' | 'Rejected',
    entityType: string,
    entityName: string,
    reason?: string
  ): Promise<boolean> {
    const template = templates.verificationStatus({ status, entityType, entityName, reason, recipientName: name });
    return sendEmail({
      to: [{ email, name }],
      subject: template.subject,
      htmlContent: template.htmlContent
    });
  },

  async sendWelcomeEmail(email: string, name: string, orgName: string): Promise<boolean> {
    const template = templates.welcomeEmail({ orgName, recipientName: name });
    return sendEmail({
      to: [{ email, name }],
      subject: template.subject,
      htmlContent: template.htmlContent
    });
  },

  // Handled locally since no backend functions
  async sendOTP(email: string, firstName: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Identify user session/browser (Simplistic: Store in localStorage for MVP demo)
      // In a real app without backend, you'd store this in Firestore with an expiration
      // But for total client-side demo, localStorage is the only "state" we have shared
      // SECURITY WARNING: This allows users to find the OTP in their own browser storage. 
      // It is NOT secure.
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins
      localStorage.setItem(`otp_${email}`, JSON.stringify({ otp, expiresAt }));

      // 3. Send Email
      const template = templates.otpEmail({ otp, recipientName: firstName || 'User' });
      const sent = await sendEmail({
        to: [{ email, name: firstName }],
        subject: template.subject,
        htmlContent: template.htmlContent
      });

      if (!sent) throw new Error('Failed to send email via Brevo');

      return { success: true };
    } catch (err: any) {
      console.error('Send OTP Error:', err);
      return { success: false, error: err.message || 'Failed to send OTP' };
    }
  },

  async verifyOTP(email: string, otp: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
    try {
      const storedData = localStorage.getItem(`otp_${email}`);
      if (!storedData) {
        return { success: false, error: 'No OTP found. Please request a new one.' };
      }

      const { otp: correctOtp, expiresAt } = JSON.parse(storedData);

      if (Date.now() > expiresAt) {
        localStorage.removeItem(`otp_${email}`);
        return { success: false, error: 'OTP expired' };
      }

      if (otp === correctOtp) {
        localStorage.removeItem(`otp_${email}`);
        return { success: true, verified: true };
      } else {
        return { success: true, verified: false, error: 'Invalid OTP' };
      }
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      return { success: false, error: err.message || 'Error verifying OTP' };
    }
  }
};
