import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@fabcc.club';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'ChangeMe123!', 12),
      role: 'ADMIN',
    },
  });
  await prisma.rankingConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', processWeight: 0.6, performanceWeight: 0.3, improvementWeight: 0.1 },
  });
  console.log(`Seeded admin (${adminEmail}) and default ranking config.`);
}

main().finally(() => prisma.$disconnect());
