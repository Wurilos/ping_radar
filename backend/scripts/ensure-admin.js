const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@pingalert.pro';
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
  const name = process.env.INITIAL_ADMIN_NAME || 'Administrador';

  const existingAdmin = await prisma.user.findUnique({ where: { email } });

  if (existingAdmin) {
    console.log(`Usuario administrador confirmado: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log(`Usuario administrador criado: ${email}`);
}

main()
  .catch((error) => {
    console.error('Falha ao garantir o usuario administrador:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
