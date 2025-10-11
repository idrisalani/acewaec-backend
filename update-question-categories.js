const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Map subjects to categories
const subjectCategoryMap = {
  // SCIENCE subjects
  'Mathematics': 'SCIENCE',
  'Physics': 'SCIENCE',
  'Chemistry': 'SCIENCE',
  'Biology': 'SCIENCE',
  'Further Mathematics': 'SCIENCE',
  'Agricultural Science': 'SCIENCE',
  'Computer Studies': 'SCIENCE',
  'Computer Science': 'SCIENCE',
  'Technical Drwaing': 'SCIENCE',
  
  // ART subjects
  'English Language': 'ART',
  'Literature in English': 'ART',
  'Government': 'ART',
  'History': 'ART',
  'Christian Religious Studies': 'ART',
  'Islamic Religious Studies': 'ART',
  'French': 'ART',
  'Yoruba': 'ART',
  'Hausa': 'ART',
  'Igbo': 'ART',
  'Fine Arts': 'ART',
  'Music': 'ART',
  
  // COMMERCIAL subjects
  'Economics': 'COMMERCIAL',
  'Commerce': 'COMMERCIAL',
  'Accounting': 'COMMERCIAL',
  'Business Studies': 'COMMERCIAL',
  'Financial Accounting': 'COMMERCIAL',
  'Book Keeping': 'COMMERCIAL',
};

async function updateCategories() {
  try {
    console.log('🔄 Updating question categories based on subjects...\n');
    
    // Get all subjects with their questions
    const subjects = await prisma.subject.findMany({
      include: {
        _count: {
          select: { questions: true }
        }
      },
    });
    
    console.log(`Found ${subjects.length} subjects\n`);
    
    let totalUpdated = 0;
    let notMapped = [];
    
    for (const subject of subjects) {
      const category = subjectCategoryMap[subject.name];
      
      if (!category) {
        notMapped.push(subject.name);
        console.log(`⚠️  No category mapping for subject: "${subject.name}" (${subject._count.questions} questions)`);
        continue;
      }
      
      // Update all questions for this subject
      const result = await prisma.question.updateMany({
        where: { subjectId: subject.id },
        data: { category },
      });
      
      totalUpdated += result.count;
      console.log(`✅ ${subject.name.padEnd(30)} → ${category.padEnd(12)} (${result.count} questions)`);
    }
    
    console.log(`\n🎉 Total questions updated: ${totalUpdated}`);
    
    if (notMapped.length > 0) {
      console.log(`\n⚠️  Unmapped subjects (${notMapped.length}):`);
      notMapped.forEach(name => console.log(`   - ${name}`));
      console.log('\nThese questions will remain as SCIENCE (default)');
    }
    
    // Show final counts by category
    console.log('\n📊 Final question counts by category:');
    const scienceCount = await prisma.question.count({ where: { category: 'SCIENCE' } });
    const artCount = await prisma.question.count({ where: { category: 'ART' } });
    const commercialCount = await prisma.question.count({ where: { category: 'COMMERCIAL' } });
    
    console.log(`   SCIENCE:     ${scienceCount}`);
    console.log(`   ART:         ${artCount}`);
    console.log(`   COMMERCIAL:  ${commercialCount}`);
    console.log(`   ─────────────────────`);
    console.log(`   TOTAL:       ${scienceCount + artCount + commercialCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateCategories();