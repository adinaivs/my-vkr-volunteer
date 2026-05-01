const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('\n=== Создание администратора ===\n');

    const email = await question('Email администратора: ');
    const password = await question('Пароль: ');
    const firstName = await question('Имя: ');
    const lastName = await question('Фамилия: ');
    const phone = await question('Телефон (+996...): ');
    const city = await question('Город: ');

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      console.log('\n❌ Пользователь с таким email уже существует!');
      rl.close();
      return;
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаем администратора
    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        phone,
        passwordHash,
        role: 'admin',
        firstName,
        lastName,
        city,
        status: 'active'
      }
    });

    console.log('\n✅ Администратор успешно создан!');
    console.log('\nДанные для входа:');
    console.log(`Email: ${admin.email}`);
    console.log(`Пароль: ${password}`);
    console.log('\n⚠️  Не забудьте настроить Telegram бота!');
    console.log('Инструкции в файле ADMIN_SETUP.md\n');

  } catch (error) {
    console.error('\n❌ Ошибка при создании администратора:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();
