import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_EMAIL || process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  },
});

export const verifyTransporter = async () => {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
};

const STYLES = {
  brandColor: '#3b82f6',
  brandLight: '#eff6ff',
  textDark: '#1e293b',
  textMuted: '#64748b',
  borderColor: '#e2e8f0',
  bgBody: '#f1f5f9',
  bgCard: '#ffffff',
  accentGreen: '#10b981',
  accentAmber: '#f59e0b',
};

function shell(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title></head>
<body style="margin:0;padding:0;background-color:${STYLES.bgBody};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${STYLES.bgBody};min-height:100vh">
<tr><td align="center" style="padding:24px 16px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px">
    <!-- Logo -->
    <tr><td align="center" style="padding-bottom:20px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" style="background:${STYLES.brandColor};border-radius:10px;padding:8px 20px">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px">KOYOO</span>
      </td></tr>
      </table>
    </td></tr>
    <!-- Card -->
    <tr><td style="background:${STYLES.bgCard};border-radius:16px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      ${bodyHtml}
    </td></tr>
    <!-- Footer -->
    <tr><td align="center" style="padding-top:24px;color:${STYLES.textMuted};font-size:12px;line-height:1.6">
      Koyoo Taxi &bull; Nairobi, Kenya<br>
      <a href="mailto:support@koyoo.com" style="color:${STYLES.brandColor};text-decoration:none">support@koyoo.com</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function buttonHtml(url, text) {
  if (!url) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 8px">
<tr><td align="center" style="background:${STYLES.brandColor};border-radius:10px;padding:0">
  <a href="${url}" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px">${text}</a>
</td></tr>
</table>`;
}

function dividerHtml() {
  return `<hr style="border:none;border-top:1px solid ${STYLES.borderColor};margin:20px 0">`;
}

// ── Public templates ──

export function buildRideReceiptEmail({ riderName, pickup, destination, driverName, distanceKm, durationMin, fare }) {
  const title = `Your ride receipt — KSh ${fare}`;
  const body = `
    <h1 style="color:${STYLES.textDark};font-size:20px;font-weight:700;margin:0 0 4px">Trip complete!</h1>
    <p style="color:${STYLES.textMuted};font-size:14px;margin:0 0 24px">Thanks for riding with Koyoo, ${riderName || 'there'}.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${STYLES.brandLight};border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <tr><td style="padding:6px 0">
        <span style="color:${STYLES.textMuted};font-size:12px">FROM</span><br>
        <span style="color:${STYLES.textDark};font-size:14px;font-weight:600">${pickup}</span>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px dashed ${STYLES.borderColor}">
        <span style="color:${STYLES.textMuted};font-size:12px">TO</span><br>
        <span style="color:${STYLES.textDark};font-size:14px;font-weight:600">${destination}</span>
      </td></tr>
      <tr><td style="padding:6px 0">
        <span style="color:${STYLES.textMuted};font-size:12px">DRIVER</span><br>
        <span style="color:${STYLES.textDark};font-size:14px;font-weight:600">${driverName || '—'}</span>
      </td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:8px;background:${STYLES.bgBody};border-radius:10px;width:33%">
          <span style="color:${STYLES.textMuted};font-size:11px;display:block">DISTANCE</span>
          <span style="color:${STYLES.textDark};font-size:16px;font-weight:700">${distanceKm} km</span>
        </td>
        <td align="center" style="padding:8px;background:${STYLES.bgBody};border-radius:10px;width:33%;margin:0 4px">
          <span style="color:${STYLES.textMuted};font-size:11px;display:block">DURATION</span>
          <span style="color:${STYLES.textDark};font-size:16px;font-weight:700">~${durationMin} min</span>
        </td>
        <td align="center" style="padding:8px;background:${STYLES.accentGreen}15;border-radius:10px;width:33%">
          <span style="color:${STYLES.textMuted};font-size:11px;display:block">TOTAL</span>
          <span style="color:${STYLES.accentGreen};font-size:16px;font-weight:700">KSh ${fare}</span>
        </td>
      </tr>
    </table>

    ${dividerHtml()}
    <p style="color:${STYLES.textMuted};font-size:13px;text-align:center;margin:0">We hope you had a great ride. See you next time!</p>
  `;
  return { subject: title, html: shell(title, body) };
}

export function buildDriverApplicationEmail({ formUrl }) {
  const title = 'Complete your driver application';
  const body = `
    <h1 style="color:${STYLES.textDark};font-size:20px;font-weight:700;margin:0 0 4px">You're almost there!</h1>
    <p style="color:${STYLES.textMuted};font-size:14px;margin:0 0 8px">Thanks for applying to drive with Koyoo. To finish your application, just fill out the short form below.</p>

    ${buttonHtml(formUrl, 'Complete Application')}

    <p style="color:${STYLES.textMuted};font-size:13px;margin-top:20px">After you submit the form, we'll review your details and get back to you quickly with your login credentials.</p>

    ${dividerHtml()}
    <p style="color:${STYLES.textMuted};font-size:12px;text-align:center;margin:0">If the button above doesn't work, copy this link into your browser:<br>
    <a href="${formUrl}" style="color:${STYLES.brandColor};word-break:break-all">${formUrl}</a></p>
  `;
  return { subject: title, html: shell(title, body) };
}

export function buildDriverApprovedNewAccountEmail({ email, password, loginUrl }) {
  const title = 'Your driver account is ready!';
  const body = `
    <h1 style="color:${STYLES.textDark};font-size:20px;font-weight:700;margin:0 0 4px">Welcome to Koyoo!</h1>
    <p style="color:${STYLES.textMuted};font-size:14px;margin:0 0 20px">Your driver application has been approved. You can now log in and start accepting rides.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${STYLES.brandLight};border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <tr><td style="padding:4px 0"><span style="color:${STYLES.textMuted};font-size:12px">EMAIL</span><br><span style="color:${STYLES.textDark};font-size:14px;font-weight:600">${email}</span></td></tr>
      <tr><td style="padding:4px 0;border-top:1px dashed ${STYLES.borderColor}"><span style="color:${STYLES.textMuted};font-size:12px">TEMPORARY PASSWORD</span><br><span style="color:${STYLES.textDark};font-size:14px;font-weight:600;font-family:monospace">${password}</span></td></tr>
    </table>

    ${buttonHtml(loginUrl, 'Log In Now')}

    <p style="color:${STYLES.textMuted};font-size:13px;margin-top:16px">Please change your password after logging in. Keep this email for your records.</p>

    ${dividerHtml()}
    <p style="color:${STYLES.textMuted};font-size:12px;text-align:center;margin:0">If the button doesn't work, go to <a href="${loginUrl}" style="color:${STYLES.brandColor}">${loginUrl}</a></p>
  `;
  return { subject: title, html: shell(title, body) };
}

export function buildDriverApprovedExistingEmail({ loginUrl }) {
  const title = 'Driver application approved!';
  const body = `
    <h1 style="color:${STYLES.textDark};font-size:20px;font-weight:700;margin:0 0 4px">Great news!</h1>
    <p style="color:${STYLES.textMuted};font-size:14px;margin:0 0 20px">Your driver application has been approved. You can now log in with your existing account and start driving.</p>
    ${buttonHtml(loginUrl, 'Log In')}
    ${dividerHtml()}
    <p style="color:${STYLES.textMuted};font-size:12px;text-align:center;margin:0">Not working? Visit <a href="${loginUrl}" style="color:${STYLES.brandColor}">${loginUrl}</a></p>
  `;
  return { subject: title, html: shell(title, body) };
}

export function buildDriverRejectedEmail() {
  const title = 'Application status update';
  const body = `
    <h1 style="color:${STYLES.textDark};font-size:20px;font-weight:700;margin:0 0 4px">Thank you for your interest</h1>
    <p style="color:${STYLES.textMuted};font-size:14px;margin:0">Unfortunately, your driver application has not been approved at this time. We encourage you to re-apply in the future.</p>
    ${dividerHtml()}
    <p style="color:${STYLES.textMuted};font-size:12px;text-align:center;margin:0">If you have any questions, reach out to <a href="mailto:support@koyoo.com" style="color:${STYLES.brandColor}">support@koyoo.com</a></p>
  `;
  return { subject: title, html: shell(title, body) };
}

export const sendEmail = async ({ to, subject, body, html }) => {
  try {
    const mail = {
      from: process.env.EMAIL_FROM || 'noreply@koyoo.com',
      to,
      subject,
    };
    if (html) {
      mail.html = html;
      mail.text = body || '';
    } else {
      mail.text = body;
    }
    await transporter.sendMail(mail);
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
};
