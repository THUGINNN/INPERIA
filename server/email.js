const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD
  }
});

async function sendVerificationEmail(toEmail, firstName, lastName, token, websiteUrl) {
  const verifyUrl = `${websiteUrl}/verification.html?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color:#111">
      <h2>ԲԱՐԻ ԳԱԼՈՒՍՏ ${firstName} ${lastName}</h2>
      <p>Շնորհակալություն THUGINNN IMPERIA համայնքում գրանցվելու համար։</p>
      <p>Կտտացեք ստորև գտնվող կոճակին՝ էլ․ փոստը հաստատելու համար.</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#00d2ff;color:#111;border-radius:8px;text-decoration:none;">Հաստատել էլ․ փոստը</a>
      <p>💎 Մարդկանց հետ խոսում ենք հարգանքով</p>
      <p>Բարի գալուստ THUGINNN IMPERIA ❤️</p>
    </div>
  `;
  await transporter.sendMail({
    from: `"THUGINNN IMPERIA" <${process.env.SMTP_USERNAME}>`,
    to: toEmail,
    subject: "THUGINNN IMPERIA - Էլ․ փոստի հաստատում",
    html
  });
}

module.exports = {
  sendVerificationEmail
};
