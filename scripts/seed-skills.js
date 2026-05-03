const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const skills = [
  'Организация мероприятий',
  'Работа с детьми',
  'Медицинские навыки',
  'Преподавание',
  'Фотография',
  'Видеосъемка',
  'Дизайн',
  'IT навыки',
  'Программирование',
  'Строительство',
  'Ремонт',
  'Садоводство',
  'Уборка',
  'Кулинария',
  'Переводы',
  'Юридическая помощь',
  'Бухгалтерия',
  'Маркетинг',
  'SMM',
  'Копирайтинг',
  'Психологическая поддержка',
  'Спортивная подготовка',
  'Музыка',
  'Танцы',
  'Рисование',
];

async function main() {
  console.log('🌱 Начинаем заполнение навыков...');

  for (const skillName of skills) {
    try {
      const skill = await prisma.skill.upsert({
        where: { name: skillName },
        update: {},
        create: { name: skillName },
      });
      console.log(`✅ Навык "${skill.name}" добавлен/обновлен`);
    } catch (error) {
      console.error(`❌ Ошибка при добавлении навыка "${skillName}":`, error.message);
    }
  }

  const count = await prisma.skill.count();
  console.log(`\n✨ Готово! Всего навыков в базе: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
