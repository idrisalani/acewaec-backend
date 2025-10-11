import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'idris_a@msn.com';
  const password = 'Admin@123'; // Change this to your desired password
  
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const admin = await prisma.user.upsert({
    where: { email },
    update: { 
      password: hashedPassword,
      role: 'SUPER_ADMIN'
    },
    create: {
      email,
      password: hashedPassword,
      firstName: 'Idris',
      lastName: 'Abdullah',
      role: 'SUPER_ADMIN',
      subscriptionTier: 'FREE',
      subscriptionStatus: 'ACTIVE'
    }
  });
  
  console.log('Admin user created successfully');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Role:', admin.role);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());