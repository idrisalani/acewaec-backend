const bcrypt = require('bcryptjs');

async function testPassword() {
  const plainPassword = 'Admin1234';
  const hashedFromDB = '$2a$12$vccXW/EEuLvihd52CBAAIewGaRkIebOSf2E8.pi8TgESx7VAAJF0G';
  
  const isValid = await bcrypt.compare(plainPassword, hashedFromDB);
  console.log('Password match:', isValid);
}

testPassword();