import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing organizers with NULL isApprovedByAdmin...\n');

  // Обновляем всех организаторов, у которых isApprovedByAdmin = null
  const result = await prisma.organizerProfile.updateMany({
    where: {
      OR: [
        { isApprovedByAdmin: null as any },
        { isApprovedByAdmin: undefined as any },
      ],
    },
    data: {
      isApprovedByAdmin: false,
    },
  });

  console.log(`Updated ${result.count} organizer profiles.`);

  // Проверяем результат
  const organizers = await prisma.organizerProfile.findMany({
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log('\nAll organizers after fix:');
  organizers.forEach((org) => {
    console.log(`- ${org.organizationName} (${org.user.email}): isApprovedByAdmin = ${org.isApprovedByAdmin}`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
