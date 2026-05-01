// Тестовый скрипт для проверки отправки email
// Запуск: node test-email.js

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🔧 Настройки SMTP:');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);
  console.log('From:', process.env.SMTP_FROM);
  console.log('');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    console.log('📧 Отправка тестового email...');
    
    const testCode = '123456';
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Отправляем самому себе для теста
      subject: 'Тест отправки кода верификации',
      text: `Ваш тестовый код: ${testCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Тест отправки кода</h2>
          <p>Ваш тестовый код:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
            ${testCode}
          </div>
          <p style="color: #666; margin-top: 20px;">Это тестовое письмо для проверки настроек SMTP.</p>
        </div>
      `,
    });

    console.log('✅ Email успешно отправлен!');
    console.log('Message ID:', info.messageId);
    console.log('');
    console.log('Проверьте ваш почтовый ящик:', process.env.SMTP_USER);
  } catch (error) {
    console.error('❌ Ошибка при отправке email:');
    console.error(error.message);
    console.error('');
    console.error('Возможные причины:');
    console.error('1. Неверные настройки SMTP в .env файле');
    console.error('2. Неверный App Password (для Gmail)');
    console.error('3. Двухфакторная аутентификация не включена (для Gmail)');
    console.error('4. Блокировка со стороны почтового провайдера');
  }
}

testEmail();
