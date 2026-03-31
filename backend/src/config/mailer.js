const nodemailer = require('nodemailer');

// Railway ENV varijable ponekad imaju whitespace — trim() je obavezan
const emailUser = (process.env.EMAIL_USER || '').trim();
// App Password mora biti BEZ razmaka (Gmail zahtjev)
const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

if (!emailUser || !emailPass) {
  console.warn('[Mailer] UPOZORENJE: EMAIL_USER ili EMAIL_PASS nisu postavljeni!');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,       // 465 sa secure:true je pouzdaniji od 587 u cloud okruženjima
  secure: true,    // SSL umjesto STARTTLS — Railway/Vercel često blokiraju STARTTLS
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  // Ne trebamo rejectUnauthorized: false sa port 465/secure:true
});

// Verifikuj konekciju pri pokretanju servera (vidjet ćeš grešku u Railway logovima)
transporter.verify((error, success) => {
  if (error) {
    console.error('[Mailer] Konekcija NIJE uspješna:', error.message);
  } else {
    console.log('[Mailer] SMTP konekcija uspješna, mailer je spreman.');
  }
});

module.exports = transporter;