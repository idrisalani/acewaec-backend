import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const subjects = [
  { name: 'Mathematics', code: 'MATH', categories: ['SCIENCE', 'COMMERCIAL'] },
  { name: 'English Language', code: 'ENG', categories: ['SCIENCE', 'ART', 'COMMERCIAL'] },
  { name: 'Biology', code: 'BIO', categories: ['SCIENCE'] },
  { name: 'Chemistry', code: 'CHEM', categories: ['SCIENCE'] },
  { name: 'Physics', code: 'PHY', categories: ['SCIENCE'] },
  { name: 'Economics', code: 'ECON', categories: ['COMMERCIAL', 'ART'] },
  { name: 'Geography', code: 'GEO', categories: ['SCIENCE', 'ART'] },
  { name: 'Government', code: 'GOV', categories: ['ART', 'COMMERCIAL'] },
  { name: 'Literature in English', code: 'LIT', categories: ['ART'] },
  { name: 'Accounting', code: 'ACC', categories: ['COMMERCIAL'] },
  { name: 'Commerce', code: 'COM', categories: ['COMMERCIAL'] },
  { name: 'Civic Education', code: 'CIV', categories: ['SCIENCE', 'ART', 'COMMERCIAL'] },
  { name: 'Agricultural Science', code: 'AGR', categories: ['SCIENCE'] },
  { name: 'Technical Drawing', code: 'TD', categories: ['SCIENCE'] },
  { name: 'Computer Studies', code: 'CS', categories: ['SCIENCE', 'COMMERCIAL'] },
  { name: 'Financial Accounting', code: 'FIN', categories: ['COMMERCIAL'] },
  { name: 'Christian Religious Studies', code: 'CRS', categories: ['ART'] },
  { name: 'Islamic Studies', code: 'ISL', categories: ['ART'] },
  { name: 'History', code: 'HIST', categories: ['ART'] }
];

async function seedSubjects() {
  console.log('Starting subject seeding...');

  try {
    for (const subject of subjects) {
      // Check by NAME instead of code (since name is unique)
      const existing = await prisma.subject.findFirst({
        where: {
          OR: [
            { code: subject.code },
            { name: subject.name }
          ]
        }
      });

      if (existing) {
        // Update categories if subject exists
        await prisma.subject.update({
          where: { id: existing.id },
          data: {
            categories: subject.categories,
            code: subject.code, // Ensure code is also correct
            name: subject.name
          }
        });
        console.log(`Updated: ${subject.name}`);
        continue;
      }

      await prisma.subject.create({
        data: {
          name: subject.name,
          code: subject.code,
          categories: subject.categories,
          isActive: true
        }
      });

      console.log(`Created subject: ${subject.name}`);
    }

    // Create topics (same as before)
    const math = await prisma.subject.findFirst({ where: { code: 'MATH' } });
    if (math) {
      const topics = ['Algebra', 'Geometry', 'Trigonometry', 'Calculus', 'Statistics'];
      for (const topicName of topics) {
        const existingTopic = await prisma.topic.findFirst({
          where: { name: topicName, subjectId: math.id }
        });

        if (!existingTopic) {
          await prisma.topic.create({
            data: { name: topicName, subjectId: math.id, isActive: true }
          });
          console.log(`✅ Created topic: ${topicName}`);
        }
      }
    }

    const english = await prisma.subject.findFirst({ where: { code: 'ENG' } });
    if (english) {
      const topics = ['Grammar', 'Comprehension', 'Essay Writing', 'Summary'];
      for (const topicName of topics) {
        const existingTopic = await prisma.topic.findFirst({
          where: { name: topicName, subjectId: english.id }
        });

        if (!existingTopic) {
          await prisma.topic.create({
            data: { name: topicName, subjectId: english.id, isActive: true }
          });
          console.log(`✅ Created topic: ${topicName}`);
        }
      }
    }

    console.log('\n🎉 Subject seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding subjects:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSubjects()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });