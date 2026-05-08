import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Необходимы поля: to, subject, html' },
        { status: 400 }
      );
    }

    // Создаем транспорт для отправки email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Отправляем email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"ВолонтёрКР" <noreply@volunteer.kg>',
      to,
      subject,
      html,
    });

    console.log('Email sent:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));

    return NextResponse.json({
      message: 'Email отправлен',
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Ошибка при отправке email' },
      { status: 500 }
    );
  }
}
