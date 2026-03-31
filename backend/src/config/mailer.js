const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

if (!RESEND_API_KEY) {
  console.warn('[Mailer] UPOZORENJE: RESEND_API_KEY nije postavljen!');
}

// Imitira nodemailer transporter.sendMail() API
// tako da ne moraš mijenjati ni jedan poziv u bookings.service.js
const transporter = {
  sendMail: async ({ from, to, subject, html }) => {
    if (!RESEND_API_KEY) {
      console.error('[Mailer] Nije moguće poslati email — RESEND_API_KEY nedostaje');
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,       // mora biti verifikovan domen na Resend
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Mailer] Resend greška:', data);
      } else {
        console.log('[Mailer] Email uspješno poslat, ID:', data.id);
      }

      return data;
    } catch (err) {
      console.error('[Mailer] Fetch greška:', err.message);
    }
  }
};

module.exports = transporter;