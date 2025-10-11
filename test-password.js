const bcrypt = require('bcryptjs');

async function testPassword() {
  // The hashed password from your database for idris_a@msn.com
  // Copy the FULL hash from Prisma Studio
  const hashedFromDB = '$2a$12$vccXW/EEuLvihd52CBAAIewGaRkIebOSf2E8.pi8TgESx7VAAJF0G'; // Replace with actual hash
  
  // Test different passwords
  const passwords = [
    'Admin1234',
    'admin1234',
    'Admin123',
    'Admin12345'
  ];
  
  console.log('Testing passwords against hash from DB:\n');
  
  for (const pwd of passwords) {
    const isValid = await bcrypt.compare(pwd, hashedFromDB);
    console.log(`Password: "${pwd}" -> ${isValid ? '✅ MATCH!' : '❌ No match'}`);
  }
}

testPassword();