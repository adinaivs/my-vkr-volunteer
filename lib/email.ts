import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationCode(email: string, code: string, type: 'registration' | 'password-reset') {
  const subject = type === 'registration' 
    ? 'Код подтверждения регистрации' 
    : 'Код восстановления пароля';
  
  const text = type === 'registration'
    ? `Ваш код подтверждения: ${code}\n\nКод действителен в течение 10 минут.`
    : `Ваш код для восстановления пароля: ${code}\n\nКод действителен в течение 10 минут.`;

  const html = type === 'registration'
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Подтверждение регистрации</h2>
        <p>Ваш код подтверждения:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
          ${code}
        </div>
        <p style="color: #666; margin-top: 20px;">Код действителен в течение 10 минут.</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Восстановление пароля</h2>
        <p>Ваш код для восстановления пароля:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
          ${code}
        </div>
        <p style="color: #666; margin-top: 20px;">Код действителен в течение 10 минут.</p>
        <p style="color: #999; font-size: 12px;">Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
      </div>
    `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
