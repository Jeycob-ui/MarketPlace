const nodemailer = require('nodemailer');

// Configura un transporter usando credenciales en .env
// Preferimos Gmail si GMAIL_USER y GMAIL_PASS están definidos, si no, intenta MAILTRAP.
const createTransporter = () => {
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }

  // Fallback a Mailtrap (si está configurado en .env)
  const mailtrapUser = process.env.MAILTRAP_USER || process.env.EMAIL_USER;
  const mailtrapPass = process.env.MAILTRAP_PASS || process.env.EMAIL_PASS;
  const mailtrapHost = process.env.MAILTRAP_HOST || process.env.EMAIL_HOST;
  const mailtrapPort = process.env.MAILTRAP_PORT || process.env.EMAIL_PORT;
  if (mailtrapUser && mailtrapPass && mailtrapHost && mailtrapPort) {
    return nodemailer.createTransport({
      host: mailtrapHost,
      port: Number(mailtrapPort) || 587,
      auth: {
        user: mailtrapUser,
        pass: mailtrapPass
      }
    });
  }

  // Si no hay configuración, crear transporter de prueba (ethereal)
  return nodemailer.createTransport({
    jsonTransport: true
  });
};

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'no-reply@example.com';

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = { sendMail };
