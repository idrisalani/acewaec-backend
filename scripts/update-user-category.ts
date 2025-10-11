import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCategory(email: string, category: 'SCIENCE' | 'ART' | 'COMMERCIAL') {
  await prisma.user.update({
    where: { email },
    data: { studentCategory: category }
  });
  console.log(`✅ Updated ${email} to ${category}`);
}

updateCategory('test@acewaec.com', 'SCIENCE')
  .finally(() => prisma.$disconnect());