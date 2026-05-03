import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking organizers in database...\n');

  // Получаем всех организаторов
  const organizers = await prisma.organizerProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  console.log(`Total organizers found: ${organizers.length}\n`);

  if (organizers.length === 0) {
    console.log('No organizers found in database.');
    return;
  }

  organizers.forEach((org, index) => {
    console.log(`${index + 1}. ${org.organizationName}`);
    console.log(`   User: ${org.user.firstName} ${org.user.lastName} (${org.user.email})`);
    console.log(`   INN: ${org.inn}`);
    console.log(`   OKPO: ${org.okpo}`);
    console.log(`   isApprovedByAdmin: ${org.isApprovedByAdmin}`);
    console.log(`   approvedAt: ${org.approvedAt || 'null'}`);
    console.log(`   verificationDocUrl: ${org.verificationDocUrl || 'null'}`);
    console.log(`   Created: ${org.user.createdAt}`);
    console.log('');
  });

  // Статистика
  const pending = organizers.filter(o => !o.isApprovedByAdmin).length;
  const approved = organizers.filter(o => o.isApprovedByAdmin).length;

  console.log('Statistics:');
  console.log(`  Pending approval: ${pending}`);
  console.log(`  Approved: ${approved}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
