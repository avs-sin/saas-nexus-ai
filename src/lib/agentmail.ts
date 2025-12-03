/**
 * AgentMail client for sending email notifications.
 * 
 * Configuration:
 * - Inbox ID: nexus-inbound@lexiesevents.com
 * - Display Name: Nexus Alert | SF
 */

interface EmailOptions {
  to: string[];
  subject: string;
  text: string;
  html: string;
  labels?: string[];
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

const AGENTMAIL_API_URL = "https://api.agentmail.to/v1";

/**
 * Send an email via AgentMail API.
 * Always provides both HTML and text versions for best deliverability.
 */
export async function sendEmail(options: EmailOptions): Promise<SendEmailResponse> {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX_ID || "nexus-inbound@lexiesevents.com";

  if (!apiKey) {
    console.error("AgentMail API key not configured");
    return { success: false, error: "API key not configured" };
  }

  try {
    const response = await fetch(`${AGENTMAIL_API_URL}/inboxes/${inboxId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        labels: options.labels || [],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AgentMail API error:", error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, messageId: data.message_id };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Pre-built notification templates for common alerts.
 */
export const notifications = {
  /**
   * Send a low stock alert notification.
   */
  lowStockAlert: async (
    recipientEmail: string,
    itemName: string,
    currentStock: number,
    threshold: number
  ) => {
    return sendEmail({
      to: [recipientEmail],
      subject: `⚠️ Low Stock Alert: ${itemName}`,
      text: `
Low Stock Alert

Item: ${itemName}
Current Stock: ${currentStock}
Threshold: ${threshold}

Please review and reorder as needed.

---
Nexus Alert | Standard Fiber
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .alert-title { color: #92400e; font-weight: bold; font-size: 18px; margin-bottom: 12px; }
    .detail { margin: 8px 0; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: 600; color: #1f2937; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-box">
      <div class="alert-title">⚠️ Low Stock Alert</div>
      <div class="detail">
        <span class="label">Item:</span>
        <span class="value">${itemName}</span>
      </div>
      <div class="detail">
        <span class="label">Current Stock:</span>
        <span class="value">${currentStock}</span>
      </div>
      <div class="detail">
        <span class="label">Threshold:</span>
        <span class="value">${threshold}</span>
      </div>
    </div>
    <p>Please review and reorder as needed.</p>
    <div class="footer">
      Nexus Alert | Standard Fiber
    </div>
  </div>
</body>
</html>
      `.trim(),
      labels: ["low-stock-alert"],
    });
  },

  /**
   * Send an order status update notification.
   */
  orderStatusUpdate: async (
    recipientEmail: string,
    orderId: string,
    status: string,
    details?: string
  ) => {
    return sendEmail({
      to: [recipientEmail],
      subject: `📦 Order ${orderId} - ${status}`,
      text: `
Order Status Update

Order ID: ${orderId}
Status: ${status}
${details ? `\nDetails: ${details}` : ""}

---
Nexus Alert | Standard Fiber
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .status-box { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .status-title { color: #065f46; font-weight: bold; font-size: 18px; margin-bottom: 12px; }
    .detail { margin: 8px 0; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: 600; color: #1f2937; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-box">
      <div class="status-title">📦 Order Status Update</div>
      <div class="detail">
        <span class="label">Order ID:</span>
        <span class="value">${orderId}</span>
      </div>
      <div class="detail">
        <span class="label">Status:</span>
        <span class="value">${status}</span>
      </div>
      ${details ? `<div class="detail"><span class="label">Details:</span> <span class="value">${details}</span></div>` : ""}
    </div>
    <div class="footer">
      Nexus Alert | Standard Fiber
    </div>
  </div>
</body>
</html>
      `.trim(),
      labels: ["order-update"],
    });
  },

  /**
   * Send a welcome email to new organization members.
   */
  welcomeToOrganization: async (
    recipientEmail: string,
    userName: string,
    organizationName: string,
    inviterName: string
  ) => {
    return sendEmail({
      to: [recipientEmail],
      subject: `Welcome to ${organizationName} on Nexus AI`,
      text: `
Welcome to ${organizationName}!

Hi ${userName},

${inviterName} has invited you to join ${organizationName} on Nexus AI.

You can now access the platform and start managing inventory, orders, and warehouses.

Get started: https://nexus-ai.vercel.app

---
Nexus Alert | Standard Fiber
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .welcome-box { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px; padding: 30px; margin: 20px 0; color: white; }
    .welcome-title { font-weight: bold; font-size: 24px; margin-bottom: 8px; }
    .welcome-subtitle { opacity: 0.9; font-size: 16px; }
    .content { margin: 20px 0; }
    .cta-button { display: inline-block; background: #1f2937; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="welcome-box">
      <div class="welcome-title">Welcome to ${organizationName}!</div>
      <div class="welcome-subtitle">You've been invited by ${inviterName}</div>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>You can now access the Nexus AI platform and start managing inventory, orders, and warehouses for ${organizationName}.</p>
      <a href="https://nexus-ai.vercel.app" class="cta-button">Get Started →</a>
    </div>
    <div class="footer">
      Nexus Alert | Standard Fiber
    </div>
  </div>
</body>
</html>
      `.trim(),
      labels: ["welcome"],
    });
  },
};

export default notifications;










