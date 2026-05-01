const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupTelegram() {
  try {
    console.log('\n=== Настройка Telegram для админ-панели ===\n');
    console.log('Инструкции:');
    console.log('1. Создайте бота через @BotFather в Telegram');
    console.log('2. Получите ваш User ID через @userinfobot\n');

    const botToken = await question('Токен бота (от @BotFather): ');
    const userId = await question('Ваш Telegram User ID (от @userinfobot): ');

    // Обновляем или создаем настройки
    await prisma.setting.upsert({
      where: { key: 'ADMIN_TELEGRAM_BOT_TOKEN' },
      update: { value: botToken },
      create: {
        key: 'ADMIN_TELEGRAM_BOT_TOKEN',
        value: botToken
      }
    });

    await prisma.setting.upsert({
      where: { key: 'ADMIN_TELEGRAM_USER_ID' },
      update: { value: userId },
      create: {
        key: 'ADMIN_TELEGRAM_USER_ID',
        value: userId
      }
    });

    console.log('\n✅ Настройки Telegram успешно сохранены!');
    console.log('\n⚠️  Не забудьте начать диалог с ботом!');
    console.log('Отправьте /start вашему боту в Telegram\n');

    // Тестируем отправку сообщения
    const testSend = await question('Хотите протестировать отправку сообщения? (y/n): ');
    
    if (testSend.toLowerCase() === 'y') {
      console.log('\nОтправка тестового сообщения...');
      
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: userId,
            text: '✅ Telegram успешно настроен для админ-панели ВолонтёрКР!',
          }),
        }
      );

      if (response.ok) {
        console.log('✅ Тестовое сообщение отправлено! Проверьте Telegram.');
      } else {
        const error = await response.json();
        console.log('❌ Ошибка отправки:', error.description);
        console.log('\nВозможные причины:');
        console.log('- Вы не начали диалог с ботом (отправьте /start)');
        console.log('- Неверный токен бота');
        console.log('- Неверный User ID');
      }
    }

  } catch (error) {
    console.error('\n❌ Ошибка при настройке Telegram:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

setupTelegram();
