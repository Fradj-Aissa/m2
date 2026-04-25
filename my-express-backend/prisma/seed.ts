import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const algerianFirstNames = [
  'Amine', 'Yacine', 'Meriem', 'Fatma', 'Mourad', 'Karim', 'Nassim', 
  'Samira', 'Leila', 'Tariq', 'Riad', 'Amina', 'Nadia', 'Hakim', 
  'Walid', 'Mustapha', 'Zouhir', 'Youssef', 'Islem', 'Adel', 'Sonia', 
  'Zineb', 'Imane', 'Sofiane', 'Lyes', 'Khaled', 'Rachid', 'Farid'
];

const algerianLastNames = [
  'Benali', 'Saidi', 'Mazari', 'Hamdi', 'Brahimi', 'Djouadi', 'Boualem',
  'Meziane', 'Toumi', 'Ghezali', 'Haddad', 'Khelil', 'Dahmani', 'Zerrouki',
  'Zitouni', 'Boudjemaa', 'Belkacem', 'Mansouri', 'Yahi', 'Chabane'
];

async function main() {
  console.log('Starting DB seed...');

  // Generate standard hash for '000000' to avoid hashing 150 times
  const passwordHash = await bcrypt.hash('000000', 10);

  const usersToCreate = [];

  // Generate 50 'LESSOR' (landlord) and 100 'RENTER' (renter)
  const userSpecs = [
    { type: 'landlord', count: 50 },
    { type: 'renter', count: 100 }
  ];

  for (const spec of userSpecs) {
    for (let i = 0; i < spec.count; i++) {
      const firstName = faker.helpers.arrayElement(algerianFirstNames);
      const lastName = faker.helpers.arrayElement(algerianLastNames);
      const fullName = `${firstName} ${lastName}`;
      
      // Ensure unique email
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${faker.string.alphanumeric(4)}@gmail.com`;
      
      // Algerian phone: 05, 06, or 07 followed by 8 digits
      const prefix = faker.helpers.arrayElement(['05', '06', '07']);
      const phone = `${prefix}${faker.string.numeric(8)}`;

      // Generate UUIDs for IDs
      const uid = uuidv4();
      const firebaseId = uuidv4(); // Unique mock firebase ID
      
      usersToCreate.push({
        uid: uid,
        firebaseId: firebaseId,
        email: email,
        password: passwordHash,
        name: fullName,
        phone: phone,
        type: spec.type, // 'landlord' or 'renter'
        accountType: spec.type,
        currentPlan: 'pro', // Plan is 'pro'
      });
    }
  }

  console.log(`Prepared ${usersToCreate.length} users for seeding.`);

  // Insert users
  const result = await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true, // Just in case
  });

  console.log(`Successfully created ${result.count} users!`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
