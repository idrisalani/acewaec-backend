import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QuestionTemplate {
  content: string;
  options: Array<{ label: string; content: string; isCorrect: boolean }>;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  explanation?: string;
}

const mathQuestions: QuestionTemplate[] = [
  {
    content: 'Simplify: 3x + 5x - 2x',
    options: [
      { label: 'A', content: '6x', isCorrect: true },
      { label: 'B', content: '10x', isCorrect: false },
      { label: 'C', content: '8x', isCorrect: false },
      { label: 'D', content: '4x', isCorrect: false }
    ],
    difficulty: 'EASY',
    explanation: 'Combine like terms: 3x + 5x - 2x = 6x'
  },
  {
    content: 'Find the value of x if 2x + 5 = 15',
    options: [
      { label: 'A', content: '5', isCorrect: true },
      { label: 'B', content: '10', isCorrect: false },
      { label: 'C', content: '7', isCorrect: false },
      { label: 'D', content: '3', isCorrect: false }
    ],
    difficulty: 'EASY',
    explanation: '2x + 5 = 15, 2x = 10, x = 5'
  },
  {
    content: 'What is the area of a rectangle with length 8cm and width 5cm?',
    options: [
      { label: 'A', content: '40 cm²', isCorrect: true },
      { label: 'B', content: '26 cm²', isCorrect: false },
      { label: 'C', content: '13 cm²', isCorrect: false },
      { label: 'D', content: '80 cm²', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'Solve for y: 3y - 7 = 2y + 5',
    options: [
      { label: 'A', content: '12', isCorrect: true },
      { label: 'B', content: '6', isCorrect: false },
      { label: 'C', content: '8', isCorrect: false },
      { label: 'D', content: '10', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'Find the volume of a cylinder with radius 7cm and height 10cm (π = 22/7)',
    options: [
      { label: 'A', content: '1540 cm³', isCorrect: true },
      { label: 'B', content: '770 cm³', isCorrect: false },
      { label: 'C', content: '2200 cm³', isCorrect: false },
      { label: 'D', content: '440 cm³', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'If log₁₀x = 2, find x',
    options: [
      { label: 'A', content: '100', isCorrect: true },
      { label: 'B', content: '20', isCorrect: false },
      { label: 'C', content: '10', isCorrect: false },
      { label: 'D', content: '1000', isCorrect: false }
    ],
    difficulty: 'HARD'
  }
];

const englishQuestions: QuestionTemplate[] = [
  {
    content: 'Choose the word that best completes the sentence: The boy ____ to school every day.',
    options: [
      { label: 'A', content: 'goes', isCorrect: true },
      { label: 'B', content: 'go', isCorrect: false },
      { label: 'C', content: 'going', isCorrect: false },
      { label: 'D', content: 'gone', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'Identify the figure of speech: "The classroom was a zoo."',
    options: [
      { label: 'A', content: 'Metaphor', isCorrect: true },
      { label: 'B', content: 'Simile', isCorrect: false },
      { label: 'C', content: 'Personification', isCorrect: false },
      { label: 'D', content: 'Hyperbole', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'What is the past participle of "write"?',
    options: [
      { label: 'A', content: 'written', isCorrect: true },
      { label: 'B', content: 'wrote', isCorrect: false },
      { label: 'C', content: 'writing', isCorrect: false },
      { label: 'D', content: 'writes', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'Choose the correct sentence:',
    options: [
      { label: 'A', content: 'Neither of the boys was present.', isCorrect: true },
      { label: 'B', content: 'Neither of the boys were present.', isCorrect: false },
      { label: 'C', content: 'Neither of the boy was present.', isCorrect: false },
      { label: 'D', content: 'Neither of the boy were present.', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  }
];

const biologyQuestions: QuestionTemplate[] = [
  {
    content: 'What is the powerhouse of the cell?',
    options: [
      { label: 'A', content: 'Mitochondria', isCorrect: true },
      { label: 'B', content: 'Nucleus', isCorrect: false },
      { label: 'C', content: 'Ribosome', isCorrect: false },
      { label: 'D', content: 'Chloroplast', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What is photosynthesis?',
    options: [
      { label: 'A', content: 'Process by which plants make food using sunlight', isCorrect: true },
      { label: 'B', content: 'Process of cell division', isCorrect: false },
      { label: 'C', content: 'Process of respiration', isCorrect: false },
      { label: 'D', content: 'Process of protein synthesis', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'Which blood cells are responsible for carrying oxygen?',
    options: [
      { label: 'A', content: 'Red blood cells', isCorrect: true },
      { label: 'B', content: 'White blood cells', isCorrect: false },
      { label: 'C', content: 'Platelets', isCorrect: false },
      { label: 'D', content: 'Plasma', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What is the function of the kidney?',
    options: [
      { label: 'A', content: 'Filtration of blood and excretion of waste', isCorrect: true },
      { label: 'B', content: 'Pumping blood', isCorrect: false },
      { label: 'C', content: 'Digesting food', isCorrect: false },
      { label: 'D', content: 'Producing hormones only', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  }
];

const chemistryQuestions: QuestionTemplate[] = [
  {
    content: 'What is the chemical symbol for water?',
    options: [
      { label: 'A', content: 'H₂O', isCorrect: true },
      { label: 'B', content: 'CO₂', isCorrect: false },
      { label: 'C', content: 'O₂', isCorrect: false },
      { label: 'D', content: 'H₂', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What is the pH of a neutral solution?',
    options: [
      { label: 'A', content: '7', isCorrect: true },
      { label: 'B', content: '0', isCorrect: false },
      { label: 'C', content: '14', isCorrect: false },
      { label: 'D', content: '10', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'Which gas is most abundant in the Earth\'s atmosphere?',
    options: [
      { label: 'A', content: 'Nitrogen', isCorrect: true },
      { label: 'B', content: 'Oxygen', isCorrect: false },
      { label: 'C', content: 'Carbon dioxide', isCorrect: false },
      { label: 'D', content: 'Hydrogen', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  }
];

const economicsQuestions: QuestionTemplate[] = [
  {
    content: 'What is the law of demand?',
    options: [
      { label: 'A', content: 'As price increases, quantity demanded decreases', isCorrect: true },
      { label: 'B', content: 'As price increases, quantity demanded increases', isCorrect: false },
      { label: 'C', content: 'Price does not affect demand', isCorrect: false },
      { label: 'D', content: 'Demand is always constant', isCorrect: false }
    ],
    difficulty: 'EASY',
    explanation: 'The law of demand states an inverse relationship between price and quantity demanded'
  },
  {
    content: 'What is GDP?',
    options: [
      { label: 'A', content: 'Gross Domestic Product - total value of goods and services produced', isCorrect: true },
      { label: 'B', content: 'Government Development Plan', isCorrect: false },
      { label: 'C', content: 'General Distribution Process', isCorrect: false },
      { label: 'D', content: 'Global Debt Portfolio', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'What type of unemployment occurs when people are between jobs?',
    options: [
      { label: 'A', content: 'Frictional unemployment', isCorrect: true },
      { label: 'B', content: 'Structural unemployment', isCorrect: false },
      { label: 'C', content: 'Cyclical unemployment', isCorrect: false },
      { label: 'D', content: 'Seasonal unemployment', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'What is inflation?',
    options: [
      { label: 'A', content: 'General increase in prices and fall in purchasing power', isCorrect: true },
      { label: 'B', content: 'Decrease in prices', isCorrect: false },
      { label: 'C', content: 'Increase in employment', isCorrect: false },
      { label: 'D', content: 'Economic growth rate', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'Which market structure has only one seller?',
    options: [
      { label: 'A', content: 'Monopoly', isCorrect: true },
      { label: 'B', content: 'Oligopoly', isCorrect: false },
      { label: 'C', content: 'Perfect competition', isCorrect: false },
      { label: 'D', content: 'Monopolistic competition', isCorrect: false }
    ],
    difficulty: 'EASY'
  }
];

const geographyQuestions: QuestionTemplate[] = [
  {
    content: 'What is the capital of Nigeria?',
    options: [
      { label: 'A', content: 'Abuja', isCorrect: true },
      { label: 'B', content: 'Lagos', isCorrect: false },
      { label: 'C', content: 'Kano', isCorrect: false },
      { label: 'D', content: 'Port Harcourt', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'Which line divides the Earth into Northern and Southern hemispheres?',
    options: [
      { label: 'A', content: 'Equator', isCorrect: true },
      { label: 'B', content: 'Prime Meridian', isCorrect: false },
      { label: 'C', content: 'Tropic of Cancer', isCorrect: false },
      { label: 'D', content: 'Arctic Circle', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What is the largest continent by land area?',
    options: [
      { label: 'A', content: 'Asia', isCorrect: true },
      { label: 'B', content: 'Africa', isCorrect: false },
      { label: 'C', content: 'North America', isCorrect: false },
      { label: 'D', content: 'Europe', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What type of rock is formed from cooled magma?',
    options: [
      { label: 'A', content: 'Igneous rock', isCorrect: true },
      { label: 'B', content: 'Sedimentary rock', isCorrect: false },
      { label: 'C', content: 'Metamorphic rock', isCorrect: false },
      { label: 'D', content: 'Limestone', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'Which ocean is the largest?',
    options: [
      { label: 'A', content: 'Pacific Ocean', isCorrect: true },
      { label: 'B', content: 'Atlantic Ocean', isCorrect: false },
      { label: 'C', content: 'Indian Ocean', isCorrect: false },
      { label: 'D', content: 'Arctic Ocean', isCorrect: false }
    ],
    difficulty: 'EASY'
  }
];

const governmentQuestions: QuestionTemplate[] = [
  {
    content: 'What is democracy?',
    options: [
      { label: 'A', content: 'Government by the people', isCorrect: true },
      { label: 'B', content: 'Government by the military', isCorrect: false },
      { label: 'C', content: 'Government by one person', isCorrect: false },
      { label: 'D', content: 'Government by religious leaders', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'How many arms of government are there in Nigeria?',
    options: [
      { label: 'A', content: 'Three', isCorrect: true },
      { label: 'B', content: 'Two', isCorrect: false },
      { label: 'C', content: 'Four', isCorrect: false },
      { label: 'D', content: 'Five', isCorrect: false }
    ],
    difficulty: 'EASY',
    explanation: 'The three arms are: Executive, Legislature, and Judiciary'
  },
  {
    content: 'What is the supreme law of Nigeria?',
    options: [
      { label: 'A', content: 'The Constitution', isCorrect: true },
      { label: 'B', content: 'Acts of Parliament', isCorrect: false },
      { label: 'C', content: 'Executive Orders', isCorrect: false },
      { label: 'D', content: 'Court Judgments', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'What is the term length for a Nigerian President?',
    options: [
      { label: 'A', content: '4 years', isCorrect: true },
      { label: 'B', content: '5 years', isCorrect: false },
      { label: 'C', content: '6 years', isCorrect: false },
      { label: 'D', content: '3 years', isCorrect: false }
    ],
    difficulty: 'EASY'
  }
];

const literatureQuestions: QuestionTemplate[] = [
  {
    content: 'Who wrote "Things Fall Apart"?',
    options: [
      { label: 'A', content: 'Chinua Achebe', isCorrect: true },
      { label: 'B', content: 'Wole Soyinka', isCorrect: false },
      { label: 'C', content: 'Chimamanda Adichie', isCorrect: false },
      { label: 'D', content: 'Ben Okri', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What is a sonnet?',
    options: [
      { label: 'A', content: 'A 14-line poem', isCorrect: true },
      { label: 'B', content: 'A 10-line poem', isCorrect: false },
      { label: 'C', content: 'A 20-line poem', isCorrect: false },
      { label: 'D', content: 'A 8-line poem', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'What is the climax of a story?',
    options: [
      { label: 'A', content: 'The turning point or most intense moment', isCorrect: true },
      { label: 'B', content: 'The introduction of characters', isCorrect: false },
      { label: 'C', content: 'The ending', isCorrect: false },
      { label: 'D', content: 'The setting', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  }
];

const accountingQuestions: QuestionTemplate[] = [
  {
    content: 'What is the accounting equation?',
    options: [
      { label: 'A', content: 'Assets = Liabilities + Capital', isCorrect: true },
      { label: 'B', content: 'Assets = Capital - Liabilities', isCorrect: false },
      { label: 'C', content: 'Capital = Assets + Liabilities', isCorrect: false },
      { label: 'D', content: 'Liabilities = Assets + Capital', isCorrect: false }
    ],
    difficulty: 'EASY',
    explanation: 'The fundamental accounting equation shows that assets equal the sum of liabilities and capital'
  },
  {
    content: 'What is a debit entry?',
    options: [
      { label: 'A', content: 'An entry on the left side of an account', isCorrect: true },
      { label: 'B', content: 'An entry on the right side of an account', isCorrect: false },
      { label: 'C', content: 'A negative balance', isCorrect: false },
      { label: 'D', content: 'A profit entry', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'What is double-entry bookkeeping?',
    options: [
      { label: 'A', content: 'Every transaction affects at least two accounts', isCorrect: true },
      { label: 'B', content: 'Recording transactions twice', isCorrect: false },
      { label: 'C', content: 'Using two different books', isCorrect: false },
      { label: 'D', content: 'Having two accountants', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  }
];

const civicEducationQuestions: QuestionTemplate[] = [
  {
    content: 'What is citizenship?',
    options: [
      { label: 'A', content: 'Legal membership of a country', isCorrect: true },
      { label: 'B', content: 'Living in a city', isCorrect: false },
      { label: 'C', content: 'Being a politician', isCorrect: false },
      { label: 'D', content: 'Paying taxes', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What is human rights?',
    options: [
      { label: 'A', content: 'Basic rights and freedoms that belong to every person', isCorrect: true },
      { label: 'B', content: 'Rights only for citizens', isCorrect: false },
      { label: 'C', content: 'Rights given by government', isCorrect: false },
      { label: 'D', content: 'Rights only for adults', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What does INEC stand for?',
    options: [
      { label: 'A', content: 'Independent National Electoral Commission', isCorrect: true },
      { label: 'B', content: 'International Election Committee', isCorrect: false },
      { label: 'C', content: 'Internal National Election Council', isCorrect: false },
      { label: 'D', content: 'Independent Nigeria Election Centre', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  }
];

const physicsQuestions: QuestionTemplate[] = [
  {
    content: 'What is the SI unit of force?',
    options: [
      { label: 'A', content: 'Newton', isCorrect: true },
      { label: 'B', content: 'Joule', isCorrect: false },
      { label: 'C', content: 'Watt', isCorrect: false },
      { label: 'D', content: 'Pascal', isCorrect: false }
    ],
    difficulty: 'EASY'
  },
  {
    content: 'What is the speed of light in vacuum?',
    options: [
      { label: 'A', content: '3 × 10⁸ m/s', isCorrect: true },
      { label: 'B', content: '3 × 10⁶ m/s', isCorrect: false },
      { label: 'C', content: '3 × 10⁴ m/s', isCorrect: false },
      { label: 'D', content: '3 × 10¹⁰ m/s', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  },
  {
    content: 'What is Newton\'s Second Law of Motion?',
    options: [
      { label: 'A', content: 'F = ma', isCorrect: true },
      { label: 'B', content: 'E = mc²', isCorrect: false },
      { label: 'C', content: 'P = mv', isCorrect: false },
      { label: 'D', content: 'W = Fd', isCorrect: false }
    ],
    difficulty: 'MEDIUM'
  }
];

export class QuestionSeeder {
  static async seedQuestions() {
    console.log('🌱 Starting question seeding...');

    try {
      // Get subjects
      const mathematics = await prisma.subject.findFirst({ where: { code: 'MATH' } });
      const english = await prisma.subject.findFirst({ where: { code: 'ENG' } });
      const biology = await prisma.subject.findFirst({ where: { code: 'BIO' } });
      const chemistry = await prisma.subject.findFirst({ where: { code: 'CHEM' } });
      const physics = await prisma.subject.findFirst({ where: { code: 'PHY' } });
      const economics = await prisma.subject.findFirst({ where: { code: 'ECON' } });
      const geography = await prisma.subject.findFirst({ where: { code: 'GEO' } });
      const government = await prisma.subject.findFirst({ where: { code: 'GOV' } });
      const literature = await prisma.subject.findFirst({ where: { code: 'LIT' } });
      const accounting = await prisma.subject.findFirst({ where: { code: 'ACC' } });
      const civicEducation = await prisma.subject.findFirst({ where: { code: 'CIV' } });

      if (!mathematics || !english || !biology || !chemistry || !physics ||
        !economics || !geography || !government || !literature || !accounting || !civicEducation) {
        console.error('❌ Required subjects not found. Please seed subjects first.');
        return;
      }

      // Get topics
      const algebraTopic = await prisma.topic.findFirst({
        where: { name: 'Algebra', subjectId: mathematics.id }
      });
      const grammarTopic = await prisma.topic.findFirst({
        where: { name: 'Grammar', subjectId: english.id }
      });

      const questionSets = [
        { questions: mathQuestions, subject: mathematics, topic: algebraTopic },
        { questions: englishQuestions, subject: english, topic: grammarTopic },
        { questions: biologyQuestions, subject: biology, topic: null },
        { questions: chemistryQuestions, subject: chemistry, topic: null },
        { questions: physicsQuestions, subject: physics, topic: null },
        { questions: economicsQuestions, subject: economics, topic: null },
        { questions: geographyQuestions, subject: geography, topic: null },
        { questions: governmentQuestions, subject: government, topic: null },
        { questions: literatureQuestions, subject: literature, topic: null },
        { questions: accountingQuestions, subject: accounting, topic: null },
        { questions: civicEducationQuestions, subject: civicEducation, topic: null }
      ].filter(set => set.subject !== null); // ADD THIS FILTER

      let totalCreated = 0;

      for (const set of questionSets) {
        for (const q of set.questions) {
          // Check if question already exists
          const existing = await prisma.question.findFirst({
            where: { content: q.content }
          });

          if (existing) {
            console.log(`⏭️  Skipping existing question: ${q.content.substring(0, 50)}...`);
            continue;
          }

          // Around line 535-550, update the question creation:
          // Create question with or without topic
          if (set.topic?.id) {
            await prisma.question.create({
              data: {
                content: q.content,
                difficulty: q.difficulty,
                explanation: q.explanation || null,
                correctAnswer: q.options.find(opt => opt.isCorrect)?.label || 'A',
                subjectId: set.subject.id,
                topicId: set.topic.id,
                year: 2024,
                isActive: true,
                options: {
                  create: q.options.map(opt => ({
                    label: opt.label,
                    content: opt.content,
                    isCorrect: opt.isCorrect
                  }))
                }
              }
            });
          } else {
            await prisma.question.create({
              data: {
                content: q.content,
                difficulty: q.difficulty,
                explanation: q.explanation || null,
                correctAnswer: q.options.find(opt => opt.isCorrect)?.label || 'A',
                subjectId: set.subject.id,
                year: 2024,
                isActive: true,
                options: {
                  create: q.options.map(opt => ({
                    label: opt.label,
                    content: opt.content,
                    isCorrect: opt.isCorrect
                  }))
                }
              }
            });
          }

          totalCreated++;
          console.log(`✅ Created: ${q.content.substring(0, 60)}...`);
        }
      }

      console.log(`\n🎉 Successfully seeded ${totalCreated} questions!`);
    } catch (error) {
      console.error('❌ Error seeding questions:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  // Generate random variations of questions
  static async generateVariations() {
    console.log('🔄 Generating question variations...');

    const baseQuestions = await prisma.question.findMany({
      include: { options: true, subject: true }
    });

    let variationsCreated = 0;

    for (const baseQ of baseQuestions.slice(0, 10)) { // Limit to first 10 for demo
      // Create 2-3 variations per question
      const variationCount = Math.floor(Math.random() * 2) + 2;

      for (let i = 0; i < variationCount; i++) {
        const variation = this.createVariation(baseQ);

        // Create variation with or without topic
        if (baseQ.topicId) {
          await prisma.question.create({
            data: {
              content: variation.content,
              difficulty: baseQ.difficulty,
              explanation: baseQ.explanation,
              correctAnswer: baseQ.correctAnswer,
              subjectId: baseQ.subjectId,
              topicId: baseQ.topicId,
              year: 2024,
              isActive: true,
              options: {
                create: variation.options
              }
            }
          });
        } else {
          await prisma.question.create({
            data: {
              content: variation.content,
              difficulty: baseQ.difficulty,
              explanation: baseQ.explanation,
              correctAnswer: baseQ.correctAnswer,
              subjectId: baseQ.subjectId,
              year: 2024,
              isActive: true,
              options: {
                create: variation.options
              }
            }
          });
        }

        variationsCreated++;
      }
    }

    console.log(`✅ Created ${variationsCreated} question variations!`);
  }

  private static createVariation(baseQuestion: any) {
    // Simple variation by modifying numbers or words slightly
    let content = baseQuestion.content;

    // If question contains numbers, vary them slightly
    content = content.replace(/\d+/g, (match: string) => {
      const num = parseInt(match);
      const variation = num + Math.floor(Math.random() * 5) - 2; // ±2
      return Math.max(1, variation).toString();
    });

    // Shuffle options
    const options = [...baseQuestion.options].sort(() => Math.random() - 0.5).map((opt: any) => ({
      label: opt.label,
      content: opt.content,
      isCorrect: opt.isCorrect
    }));

    return { content, options };
  }
}

// Run seeder
if (require.main === module) {
  QuestionSeeder.seedQuestions()
    .then(() => QuestionSeeder.generateVariations())
    .then(() => {
      console.log('✅ All seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}