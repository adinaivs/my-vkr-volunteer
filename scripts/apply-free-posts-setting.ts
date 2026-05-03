import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Добавление настройки количества бесплатных публикаций...');

  // Проверяем, существует ли уже настройка
  const existingSetting = await prisma.setting.findUnique({
    where: { key: 'default_free_posts' },
  });

  if (existingSetting) {
    console.log('Настройка уже существует:', existingSetting);
    return;
  }

  // Создаем настройку
  const setting = await prisma.setting.create({
    data: {
      key: 'default_free_posts',
      value: '3',
    },
  });

  console.log('Настройка успешно создана:', setting);
}

main()
  .catch((e) => {
    console.error('Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
