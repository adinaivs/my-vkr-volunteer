import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Начинаем добавление категорий...');

  const categories = [
    { slug: 'Образование', icon: '📚' },
    { slug: 'Экология', icon: '🌱' },
    { slug: 'Здоровье', icon: '❤️' },
    { slug: 'Социальная помощь', icon: '🤝' },
    { slug: 'Культура', icon: '🎨' },
    { slug: 'Спорт', icon: '⚽' },
    { slug: 'Животные', icon: '🐾' },
    { slug: 'Технологии', icon: '💻' },
  ];

  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: { slug: category.slug },
    });

    if (!existing) {
      await prisma.category.create({
        data: category,
      });
      console.log(`✅ Создана категория: ${category.icon} ${category.slug}`);
    } else {
      console.log(`⏭️  Категория уже существует: ${category.icon} ${category.slug}`);
    }
  }

  console.log('✅ Категории успешно добавлены!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
