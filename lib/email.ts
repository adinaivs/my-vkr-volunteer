import nodemailer from 'nodemailer';

// ─────────────────────────────────────────────────────────────────────────────
// Создаём transporter лениво (per-call), чтобы переключение портов работало.
// Порядок попыток: 465 (SSL) → 587 (STARTTLS)
// ─────────────────────────────────────────────────────────────────────────────
function makeTransporter(port: 465 | 587) {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,          // 465 = implicit TLS, 587 = STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      // Gmail App-Password может содержать пробелы — убираем
      pass: (process.env.SMTP_PASSWORD || '').replace(/\s/g, ''),
    },
    connectionTimeout: 10_000,     // 10 сек на TCP-соединение
    greetingTimeout:  10_000,      // 10 сек на EHLO
    socketTimeout:    15_000,      // 15 сек на весь SMTP-диалог
    tls: {
      rejectUnauthorized: false,   // Обходим проблемы со старыми сертификатами
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Resend API — отправка по HTTPS (порт 443, не блокируется провайдерами)
// Требует RESEND_API_KEY в переменных окружения.
// Регистрация бесплатная: https://resend.com  (100 писем/сутки)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@volonterkr.kg',
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[email] Resend error:', res.status, body);
      return false;
    }
    console.log('[email] Sent via Resend');
    return true;
  } catch (err) {
    console.error('[email] Resend fetch error:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Основная функция отправки: Resend → порт 465 → порт 587
// ─────────────────────────────────────────────────────────────────────────────
async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  // 1. Попытка через Resend (HTTPS, всегда работает)
  if (process.env.RESEND_API_KEY) {
    const ok = await sendViaResend(opts);
    if (ok) return true;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  };

  // 2. Попытка через SMTP порт 465 (implicit TLS)
  try {
    const t465 = makeTransporter(465);
    await t465.sendMail(mailOptions);
    console.log('[email] Sent via SMTP:465');
    return true;
  } catch (err465) {
    console.warn('[email] Port 465 failed:', (err465 as Error).message);
  }

  // 3. Попытка через SMTP порт 587 (STARTTLS)
  try {
    const t587 = makeTransporter(587);
    await t587.sendMail(mailOptions);
    console.log('[email] Sent via SMTP:587');
    return true;
  } catch (err587) {
    console.error('[email] Port 587 failed:', (err587 as Error).message);
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Публичные функции
// ─────────────────────────────────────────────────────────────────────────────

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationCode(
  email: string,
  code: string,
  type: 'registration' | 'password-reset'
): Promise<boolean> {
  const subject =
    type === 'registration'
      ? 'Код подтверждения регистрации'
      : 'Код восстановления пароля';

  const text =
    type === 'registration'
      ? `Ваш код подтверждения: ${code}\n\nКод действителен в течение 10 минут.`
      : `Ваш код для восстановления пароля: ${code}\n\nКод действителен в течение 10 минут.`;

  const html =
    type === 'registration'
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

  return sendMail({ to: email, subject, html, text });
}

export async function sendOrganizerRejectionEmail(
  email: string,
  organizationName: string,
  firstName: string,
  reason: string
): Promise<boolean> {
  const subject = 'Заявка на регистрацию организатора отклонена';

  const text = `
Здравствуйте, ${firstName}!

К сожалению, ваша заявка на регистрацию организации "${organizationName}" была отклонена администратором.

Причина отклонения:
${reason}

Вы можете исправить указанные замечания и подать заявку повторно.

Если у вас есть вопросы, свяжитесь с нами по email: support@volunteer.kg

С уважением,
Команда ВолонтёрКР
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">ВолонтёрКР</h1>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Заявка отклонена</h2>
        <p style="color: #666; line-height: 1.6;">Здравствуйте, <strong>${firstName}</strong>!</p>
        <p style="color: #666; line-height: 1.6;">К сожалению, ваша заявка на регистрацию организации <strong>"${organizationName}"</strong> была отклонена администратором.</p>
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404; font-weight: bold;">Причина отклонения:</p>
          <p style="margin: 10px 0 0 0; color: #856404;">${reason}</p>
        </div>
        <p style="color: #666; line-height: 1.6;">Вы можете исправить указанные замечания и подать заявку повторно.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #999; font-size: 14px; margin: 0;">Если у вас есть вопросы: <a href="mailto:support@volunteer.kg" style="color: #667eea;">support@volunteer.kg</a></p>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;"><p>© 2026 ВолонтёрКР. Все права защищены.</p></div>
    </div>
  `;

  return sendMail({ to: email, subject, html, text });
}

export async function sendOrganizerApprovalEmail(
  email: string,
  organizationName: string,
  firstName: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://volonterkr.kg';
  const subject = 'Заявка на регистрацию организатора одобрена';

  const text = `
Здравствуйте, ${firstName}!

Поздравляем! Ваша заявка на регистрацию организации "${organizationName}" была одобрена администратором.

Теперь вы можете создавать волонтёрские проекты и управлять заявками волонтёров.

Войдите в систему: ${appUrl}/login

С уважением,
Команда ВолонтёрКР
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #00CC00 0%, #00b300 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">ВолонтёрКР</h1>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">🎉 Заявка одобрена!</h2>
        <p style="color: #666; line-height: 1.6;">Здравствуйте, <strong>${firstName}</strong>!</p>
        <p style="color: #666; line-height: 1.6;">Поздравляем! Ваша заявка на регистрацию организации <strong>"${organizationName}"</strong> была одобрена.</p>
        <div style="background-color: #d4edda; border-left: 4px solid #00CC00; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #155724; font-weight: bold;">Теперь вы можете:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #155724;">
            <li>Создавать волонтёрские проекты</li>
            <li>Управлять заявками волонтёров</li>
            <li>Публиковать отчёты о проделанной работе</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/login" style="display: inline-block; background-color: #00CC00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Войти в систему</a>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #999; font-size: 14px; margin: 0;">Вопросы: <a href="mailto:support@volunteer.kg" style="color: #00CC00;">support@volunteer.kg</a></p>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;"><p>© 2026 ВолонтёрКР. Все права защищены.</p></div>
    </div>
  `;

  return sendMail({ to: email, subject, html, text });
}

export async function sendProjectRejectionEmail(
  email: string,
  organizerName: string,
  projectTitle: string,
  reason: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://volonterkr.kg';
  const subject = `Проект "${projectTitle}" отклонён`;

  const text = `
Здравствуйте, ${organizerName}!

К сожалению, ваш проект "${projectTitle}" был отклонён администратором.

Причина отклонения:
${reason}

Вы можете исправить указанные замечания и отправить проект на модерацию повторно.
Раздел: «Мои проекты» → «Отклонённые».

Если у вас есть вопросы, свяжитесь с нами: support@volunteer.kg

С уважением,
Команда ВолонтёрКР
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">ВолонтёрКР</h1>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Проект отклонён</h2>
        <p style="color: #666; line-height: 1.6;">Здравствуйте, <strong>${organizerName}</strong>!</p>
        <p style="color: #666; line-height: 1.6;">Ваш проект <strong>"${projectTitle}"</strong> был отклонён администратором.</p>
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #721c24; font-weight: bold;">Причина отклонения:</p>
          <p style="margin: 10px 0 0 0; color: #721c24;">${reason}</p>
        </div>
        <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #0c5460;"><strong>Как отправить проект повторно:</strong><br>
          1. Перейдите в раздел «Мои проекты» → «Отклонённые»<br>
          2. Нажмите «Редактировать»<br>
          3. Внесите изменения и отправьте повторно</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/organizer/projects" style="display: inline-block; background-color: #00CC00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Перейти к проектам</a>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #999; font-size: 14px; margin: 0;">Вопросы: <a href="mailto:support@volunteer.kg" style="color: #dc3545;">support@volunteer.kg</a></p>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;"><p>© 2026 ВолонтёрКР. Все права защищены.</p></div>
    </div>
  `;

  return sendMail({ to: email, subject, html, text });
}
