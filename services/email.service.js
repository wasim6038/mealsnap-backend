const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send email utility
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'NutriAI <noreply@nutriai.com>',
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent: ${info.messageId}`);
  return info;
};

// ─── Email templates ──────────────────────────────────────────────────────────
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to NutriAI! 🥗',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#16a34a">Welcome to NutriAI, ${name}!</h1>
        <p>We're excited to help you on your health journey.</p>
        <p>Start tracking your meals, water intake, and weight to get personalized AI recommendations.</p>
        <a href="${process.env.CLIENT_URL}/dashboard" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Go to Dashboard</a>
        <p style="margin-top:24px;color:#666;font-size:14px">The NutriAI Team</p>
      </div>
    `,
  }),

  resetPassword: (name, resetUrl) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#16a34a">Password Reset</h1>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the button below (valid for 10 minutes):</p>
        <a href="${resetUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Reset Password</a>
        <p style="margin-top:24px;color:#666;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  }),

  weeklyReport: (name, stats) => ({
    subject: `Your Weekly NutriAI Report 📊`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#16a34a">Weekly Report for ${name}</h1>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>Avg daily calories:</strong> ${stats.avgCalories} kcal</p>
          <p><strong>Meals logged:</strong> ${stats.mealsLogged}</p>
          <p><strong>Streak:</strong> ${stats.streak} days 🔥</p>
          <p><strong>Weight change:</strong> ${stats.weightChange > 0 ? '+' : ''}${stats.weightChange} kg</p>
        </div>
        <a href="${process.env.CLIENT_URL}/analytics" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">View Full Analytics</a>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };