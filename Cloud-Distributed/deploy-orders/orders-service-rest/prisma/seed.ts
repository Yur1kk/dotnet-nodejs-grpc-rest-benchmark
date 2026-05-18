import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const products = [
  'MacBook Pro', 'iPhone 15', 'Samsung Galaxy S24', 'iPad Air',
  'Dell XPS 15', 'AirPods Pro', 'Sony WH-1000XM5', 'Logitech MX Keys',
  'LG UltraWide Monitor', 'Razer DeathAdder V3',
];

async function main() {
  console.log('🌱 Seeding orders-service-rest database...');

  // We need user IDs from the users table
  // For seed purposes we create placeholder userId values
  await prisma.order.deleteMany();
  console.log('🗑️  Cleared existing orders');

  const BATCH_SIZE = 500;
  const TOTAL = 20_000;

  for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
    const orders = Array.from({ length: BATCH_SIZE }, () => ({
      userId: faker.string.uuid(), // Will be matched later in tests
      product: products[Math.floor(Math.random() * products.length)],
      quantity: faker.number.int({ min: 1, max: 10 }),
      price: parseFloat(faker.commerce.price({ min: 10, max: 3000 })),
      status: statuses[Math.floor(Math.random() * statuses.length)],
    }));

    await prisma.order.createMany({ data: orders });
    console.log(`✅ Inserted ${i + BATCH_SIZE} / ${TOTAL} orders`);
  }

  const count = await prisma.order.count();
  console.log(`\n🎉 Seeding complete! Total orders: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
