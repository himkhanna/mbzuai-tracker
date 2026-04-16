import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';

// ---------------------------------------------------------------------------
// Transporter
// ---------------------------------------------------------------------------

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ---------------------------------------------------------------------------
// Send helper
// ---------------------------------------------------------------------------

export async function sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
  try {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'MBZUAI Tracker <notifications@mbzuai.ac.ae>',
      to: recipients,
      subject,
      html,
    });
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err);
    // Do not throw — email failures should not break the API response
  }
}

// ---------------------------------------------------------------------------
// Inline email templates (Handlebars)
// ---------------------------------------------------------------------------

const BASE_STYLE = `
  body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: #1a3a5c; color: #fff; padding: 24px 32px; }
  .header h2 { margin: 0; font-size: 18px; }
  .header span { font-size: 12px; opacity: 0.8; }
  .body { padding: 24px 32px; }
  .body p { line-height: 1.6; }
  .highlight { background: #f0f7ff; border-left: 4px solid #1a3a5c; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; }
  .highlight table { width: 100%; border-collapse: collapse; }
  .highlight td { padding: 4px 0; font-size: 14px; }
  .highlight td:first-child { color: #666; width: 140px; }
  .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #1a3a5c; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; }
  .footer { padding: 16px 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; text-align: center; }
  .badge-red { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .badge-green { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .badge-yellow { background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
`;

const wrapInBase = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${BASE_STYLE}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h2>MBZUAI Delivery Tracker</h2>
      <span>${title}</span>
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      &copy; Mohamed Bin Zayed University of Artificial Intelligence &bull; This is an automated notification.
    </div>
  </div>
</body>
</html>`;

const TEMPLATES: Record<string, string> = {
  'order-created': wrapInBase(
    'New Order Created',
    `<p>A new <strong>{{orderType}}</strong> has been created in the MBZUAI Delivery Tracker.</p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Vendor:</td><td>{{vendor}}</td></tr>
        <tr><td>End User:</td><td>{{endUser}}</td></tr>
        <tr><td>Department:</td><td>{{department}}</td></tr>
        <tr><td>Total Items:</td><td>{{itemCount}}</td></tr>
        <tr><td>Total Value:</td><td>{{currency}} {{totalValue}}</td></tr>
        <tr><td>Order Date:</td><td>{{orderDate}}</td></tr>
      </table>
    </div>
    <p>Please log in to the system to review and track this order.</p>
    <a href="{{trackingUrl}}" class="btn">View Order</a>`,
  ),

  'delivery-due-today': wrapInBase(
    'Delivery Due Today',
    `<p>The following item is scheduled for delivery <strong>today</strong>. Please ensure the Store team is ready to receive.</p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Item:</td><td>{{description}}</td></tr>
        <tr><td>Vendor:</td><td>{{vendor}}</td></tr>
        <tr><td>Expected Date:</td><td>{{expectedDate}}</td></tr>
        <tr><td>Quantity:</td><td>{{quantity}}</td></tr>
      </table>
    </div>
    <a href="{{trackingUrl}}" class="btn">View Item</a>`,
  ),

  'delivery-overdue': wrapInBase(
    'Delivery Overdue',
    `<p><span class="badge-red">OVERDUE</span> The following item has not been received and is past its expected delivery date. <strong>Immediate follow-up required.</strong></p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Item:</td><td>{{description}}</td></tr>
        <tr><td>Vendor:</td><td>{{vendor}}</td></tr>
        <tr><td>Expected Date:</td><td>{{expectedDate}}</td></tr>
        <tr><td>Days Overdue:</td><td><span class="badge-red">{{daysOverdue}} days</span></td></tr>
      </table>
    </div>
    <p>Please contact <strong>{{vendor}}</strong> immediately to resolve this delay.</p>
    <a href="{{trackingUrl}}" class="btn">View Item</a>`,
  ),

  'item-received': wrapInBase(
    'Item Received & Stored',
    `<p><span class="badge-green">RECEIVED</span> The following item has been received and stored.</p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Item:</td><td>{{description}}</td></tr>
        <tr><td>Quantity:</td><td>{{quantity}}</td></tr>
        <tr><td>Received Date:</td><td>{{receivedDate}}</td></tr>
      </table>
    </div>
    {{#if requiresAssetTagging}}<p><strong>Action Required:</strong> This item requires <span class="badge-yellow">Asset Tagging</span>. The Asset Team has been notified.</p>{{/if}}
    {{#if requiresITConfig}}<p><strong>Action Required:</strong> This item requires <span class="badge-yellow">IT Configuration</span>. The IT Team has been notified.</p>{{/if}}
    <a href="{{trackingUrl}}" class="btn">View Item</a>`,
  ),

  'asset-tagging-required': wrapInBase(
    'Asset Tagging Required',
    `<p>An item has been received and requires <strong>asset tagging</strong>. Please process this at your earliest convenience.</p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Item:</td><td>{{description}}</td></tr>
        <tr><td>Quantity:</td><td>{{quantity}}</td></tr>
        <tr><td>Received Date:</td><td>{{receivedDate}}</td></tr>
      </table>
    </div>
    <a href="{{trackingUrl}}" class="btn">Process Asset Tagging</a>`,
  ),

  'asset-tagging-done': wrapInBase(
    'Asset Tagging Completed',
    `<p><span class="badge-green">ASSET TAGGED</span> Asset tagging has been completed for the following item.</p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Item:</td><td>{{description}}</td></tr>
        <tr><td>Tagged Date:</td><td>{{assetTaggingDate}}</td></tr>
      </table>
    </div>
    {{#if requiresITConfig}}<p>This item now requires <span class="badge-yellow">IT Configuration</span>. The IT Team has been notified.</p>{{/if}}
    <a href="{{trackingUrl}}" class="btn">View Item</a>`,
  ),

  'it-config-required': wrapInBase(
    'IT Configuration Required',
    `<p>An item requires <strong>IT configuration</strong>. Please process this at your earliest convenience.</p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Item:</td><td>{{description}}</td></tr>
        <tr><td>Quantity:</td><td>{{quantity}}</td></tr>
        <tr><td>End User:</td><td>{{endUser}}</td></tr>
      </table>
    </div>
    <a href="{{trackingUrl}}" class="btn">Process IT Config</a>`,
  ),

  'it-config-done': wrapInBase(
    'IT Configuration Completed',
    `<p><span class="badge-green">IT CONFIGURED</span> IT configuration has been completed for the following item.</p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Item:</td><td>{{description}}</td></tr>
        <tr><td>Configured Date:</td><td>{{itConfigDate}}</td></tr>
        <tr><td>End User:</td><td>{{endUser}}</td></tr>
      </table>
    </div>
    <p>This item is now ready for handover to the end user.</p>
    <a href="{{trackingUrl}}" class="btn">View Item</a>`,
  ),

  'handover-complete': wrapInBase(
    'Item Successfully Handed Over',
    `<p><span class="badge-green">HANDED OVER</span> The following item has been successfully delivered to the end user.</p>
    <div class="highlight">
      <table>
        <tr><td>Reference:</td><td><strong>{{reference}}</strong></td></tr>
        <tr><td>Item:</td><td>{{description}}</td></tr>
        <tr><td>Quantity:</td><td>{{quantity}}</td></tr>
        <tr><td>End User:</td><td>{{endUser}}</td></tr>
        <tr><td>Handover Date:</td><td>{{handoverDate}}</td></tr>
      </table>
    </div>
    <p>This order item has been fully completed.</p>
    <a href="{{trackingUrl}}" class="btn">View Order</a>`,
  ),

  welcome: wrapInBase(
    'Welcome to MBZUAI Delivery Tracker',
    `<p>Hello <strong>{{name}}</strong>,</p>
    <p>Your account has been created on the MBZUAI Delivery & Store Tracking System.</p>
    <div class="highlight">
      <table>
        <tr><td>Email:</td><td>{{email}}</td></tr>
        <tr><td>Role:</td><td>{{role}}</td></tr>
        <tr><td>Temp Password:</td><td><strong>{{tempPassword}}</strong></td></tr>
      </table>
    </div>
    <p>Please log in and change your password immediately.</p>
    <a href="{{loginUrl}}" class="btn">Log In Now</a>`,
  ),

  'reset-password': wrapInBase(
    'Password Reset',
    `<p>Hello <strong>{{name}}</strong>,</p>
    <p>A password reset has been requested for your account.</p>
    <div class="highlight">
      <table>
        <tr><td>Temp Password:</td><td><strong>{{tempPassword}}</strong></td></tr>
      </table>
    </div>
    <p>Please log in with the temporary password above and change it immediately. If you did not request this reset, contact your system administrator.</p>
    <a href="{{loginUrl}}" class="btn">Log In Now</a>`,
  ),
};

// ---------------------------------------------------------------------------
// Template renderer
// ---------------------------------------------------------------------------

export function renderTemplate(templateName: string, data: Record<string, unknown>): string {
  const source = TEMPLATES[templateName];
  if (!source) {
    throw new Error(`Email template not found: ${templateName}`);
  }
  const compiled = Handlebars.compile(source);
  return compiled(data);
}
