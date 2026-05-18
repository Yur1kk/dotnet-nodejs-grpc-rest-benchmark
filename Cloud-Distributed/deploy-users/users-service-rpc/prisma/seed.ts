import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();
const roles = ['user', 'admin', 'moderator'];

async function main() {
  console.log('🌱 Seeding users-service-rpc database...');
  await prisma.user.deleteMany();
  console.log('🗑️  Cleared existing RPC users');

  const BATCH_SIZE = 500;
  const TOTAL = 10_000;
  const emails = new Set<string>();

  for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
    const users = [];
    for (let j = 0; j < BATCH_SIZE; j++) {
      let email: string;
      do { email = faker.internet.email(); } while (emails.has(email));
      emails.add(email);
      users.push({
        name: faker.person.fullName(),
        email,
        age: faker.number.int({ min: 18, max: 80 }),
        role: roles[Math.floor(Math.random() * roles.length)],
      });
    }
    await prisma.user.createMany({ data: users });
    console.log(`✅ Inserted ${i + BATCH_SIZE} / ${TOTAL} RPC users`);
  }

  const count = await prisma.user.count();
  console.log(`\n🎉 Seeding complete! Total RPC users: ${count}`);
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
