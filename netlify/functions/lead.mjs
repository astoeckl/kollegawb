const FREE_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.de',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'gmx.at',
  'gmx.de',
  'web.de',
  'aol.com',
  'proton.me',
  'protonmail.com',
]);

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

const isBusinessEmail = (value) => {
  if (!value || !value.includes('@')) return false;
  const domain = value.toLowerCase().split('@')[1];
  return !FREE_MAIL_DOMAINS.has(domain);
};

const isBusinessMobile = (value) => /^[+0-9][0-9\s()/-]{7,}$/.test(value);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { message: 'Method not allowed.' });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const fromEmail = process.env.LEAD_FROM_EMAIL;
  const toEmail = process.env.LEAD_TO_EMAIL || 'andreas.stoeckl@506.ai';

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    return json(500, {
      message:
        'Server email configuration missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and LEAD_FROM_EMAIL.',
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { message: 'Invalid payload.' });
  }

  const interesse = String(payload.interesse || '').trim();
  const businessEmail = String(payload.business_email || '').trim();
  const businessMobile = String(payload.business_mobile || '').trim();
  const unternehmen = String(payload.unternehmen || '').trim();
  const language = payload.language === 'en' ? 'en' : 'de';

  if (!interesse || !businessEmail || !businessMobile) {
    return json(400, {
      message:
        language === 'en'
          ? 'Please complete all required fields.'
          : 'Bitte alle Pflichtfelder ausfuellen.',
    });
  }

  if (!isBusinessEmail(businessEmail)) {
    return json(400, {
      message:
        language === 'en'
          ? 'Please use your company business email address.'
          : 'Bitte eine Business-E-Mail-Adresse verwenden.',
    });
  }

  if (!isBusinessMobile(businessMobile)) {
    return json(400, {
      message:
        language === 'en'
          ? 'Please enter a valid business mobile number.'
          : 'Bitte eine gueltige Business-Mobilnummer eingeben.',
    });
  }

  const subject = `Kollega Demo Anfrage - ${interesse}`;
  const text = [
    'Neue Demo-Anfrage',
    '',
    `Kollega: ${interesse}`,
    `Business-E-Mail: ${businessEmail}`,
    `Business-Mobilnummer: ${businessMobile}`,
    `Unternehmen: ${unternehmen || '-'}`,
    `Sprache: ${language.toUpperCase()}`,
    `Zeitpunkt (UTC): ${new Date().toISOString()}`,
  ].join('\n');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure || smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      replyTo: businessEmail,
      subject,
      text,
    });
  } catch (error) {
    return json(502, {
      message: `Email provider error: ${String(error?.message || 'unknown error').slice(0, 300)}`,
    });
  }

  return json(200, { ok: true });
};
import nodemailer from 'nodemailer';
