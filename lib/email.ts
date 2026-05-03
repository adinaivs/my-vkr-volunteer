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

export async function sendOrganizerRejectionEmail(
  email: string,
  organizationName: string,
  firstName: string,
  reason: string
) {
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
        
        <p style="color: #666; line-height: 1.6;">
          Здравствуйте, <strong>${firstName}</strong>!
        </p>
        
        <p style="color: #666; line-height: 1.6;">
          К сожалению, ваша заявка на регистрацию организации <strong>"${organizationName}"</strong> была отклонена администратором.
        </p>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404; font-weight: bold;">Причина отклонения:</p>
          <p style="margin: 10px 0 0 0; color: #856404;">${reason}</p>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Вы можете исправить указанные замечания и подать заявку повторно.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #999; font-size: 14px; margin: 0;">
            Если у вас есть вопросы, свяжитесь с нами по email: 
            <a href="mailto:support@volunteer.kg" style="color: #667eea;">support@volunteer.kg</a>
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2026 ВолонтёрКР. Все права защищены.</p>
      </div>
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
    console.log('Rejection email sent to:', email);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export async function sendOrganizerApprovalEmail(
  email: string,
  organizationName: string,
  firstName: string
) {
  const subject = 'Заявка на регистрацию организатора одобрена';
  
  const text = `
Здравствуйте, ${firstName}!

Поздравляем! Ваша заявка на регистрацию организации "${organizationName}" была одобрена администратором.

Теперь вы можете:
- Создавать волонтёрские проекты
- Управлять заявками волонтёров
- Публиковать отчёты о проделанной работе

Войдите в систему и начните создавать проекты: https://volunteer.kg/login

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
        
        <p style="color: #666; line-height: 1.6;">
          Здравствуйте, <strong>${firstName}</strong>!
        </p>
        
        <p style="color: #666; line-height: 1.6;">
          Поздравляем! Ваша заявка на регистрацию организации <strong>"${organizationName}"</strong> была одобрена администратором.
        </p>
        
        <div style="background-color: #d4edda; border-left: 4px solid #00CC00; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #155724; font-weight: bold;">Теперь вы можете:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #155724;">
            <li>Создавать волонтёрские проекты</li>
            <li>Управлять заявками волонтёров</li>
            <li>Публиковать отчёты о проделанной работе</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://volunteer.kg/login" style="display: inline-block; background-color: #00CC00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Войти в систему
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #999; font-size: 14px; margin: 0;">
            Если у вас есть вопросы, свяжитесь с нами по email: 
            <a href="mailto:support@volunteer.kg" style="color: #00CC00;">support@volunteer.kg</a>
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2026 ВолонтёрКР. Все права защищены.</p>
      </div>
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
    console.log('Approval email sent to:', email);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export async function sendProjectRejectionEmail(
  email: string,
  organizerName: string,
  projectTitle: string,
  reason: string
) {
  const subject = `Проект "${projectTitle}" отклонен`;
  
  const text = `
Здравствуйте, ${organizerName}!

К сожалению, ваш проект "${projectTitle}" был отклонен администратором.

Причина отклонения:
${reason}

Вы можете исправить указанные замечания и отправить проект на модерацию повторно.

Для редактирования проекта перейдите в раздел "Мои проекты" → "Отклоненные".

Если у вас есть вопросы, свяжитесь с нами по email: support@volunteer.kg

С уважением,
Команда ВолонтёрКР
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">ВолонтёрКР</h1>
      </div>
      
      <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Проект отклонен</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Здравствуйте, <strong>${organizerName}</strong>!
        </p>
        
        <p style="color: #666; line-height: 1.6;">
          К сожалению, ваш проект <strong>"${projectTitle}"</strong> был отклонен администратором.
        </p>
        
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #721c24; font-weight: bold;">Причина отклонения:</p>
          <p style="margin: 10px 0 0 0; color: #721c24;">${reason}</p>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Вы можете исправить указанные замечания и отправить проект на модерацию повторно.
        </p>
        
        <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #0c5460;">
            <strong>Как отправить проект повторно:</strong><br>
            1. Перейдите в раздел "Мои проекты" → "Отклоненные"<br>
            2. Нажмите "Редактировать" на вашем проекте<br>
            3. Внесите необходимые изменения<br>
            4. Отправьте проект на модерацию снова
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/projects" style="display: inline-block; background-color: #00CC00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Перейти к проектам
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #999; font-size: 14px; margin: 0;">
            Если у вас есть вопросы, свяжитесь с нами по email: 
            <a href="mailto:support@volunteer.kg" style="color: #dc3545;">support@volunteer.kg</a>
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2026 ВолонтёрКР. Все права защищены.</p>
      </div>
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
    console.log('Project rejection email sent to:', email);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}
