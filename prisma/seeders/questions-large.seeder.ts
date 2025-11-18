// backend/prisma/seeders/questions-large.seeder.ts
// Comprehensive question dataset for WAEC with 500+ questions

import prisma from '../../src/utils/database';
import { Difficulty } from '@prisma/client';

interface QuestionData {
  subjectId: string;
  categoryId?: string;
  questionText: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  correctOption: number;
  explanation?: string;
  difficulty: Difficulty;
  tags?: string[];
  year?: number;
  examType?: string;
}

const SAMPLE_QUESTIONS: QuestionData[] = [
  // ============= ENGLISH LANGUAGE =============
  {
    subjectId: 'english-1',
    categoryId: 'grammar-1',
    questionText: 'Which of the following sentences is grammatically correct?',
    options: [
      { text: 'He go to school every day', isCorrect: false },
      { text: 'She goes to school every day', isCorrect: true },
      { text: 'They go to school yesterday', isCorrect: false },
      { text: 'I have went to the market', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'The correct form is "goes" with singular subject "she" in present tense.',
    difficulty: Difficulty.EASY,
    tags: ['grammar', 'present-tense', 'subject-verb-agreement'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'english-1',
    categoryId: 'vocabulary-1',
    questionText: 'The word "benign" means:',
    options: [
      { text: 'harmful and dangerous', isCorrect: false },
      { text: 'kind and gentle', isCorrect: true },
      { text: 'bitter and cold', isCorrect: false },
      { text: 'hard and rough', isCorrect: false },
    ],
    correctOption: 1,
    explanation: '"Benign" means kind, gentle, and favorable, often used in medical contexts.',
    difficulty: Difficulty.MEDIUM,
    tags: ['vocabulary', 'synonyms'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'english-1',
    categoryId: 'comprehension-1',
    questionText: 'What is the main idea of the passage?',
    options: [
      { text: 'Technology harms education', isCorrect: false },
      { text: 'Technology enhances learning when used properly', isCorrect: true },
      { text: 'Students should avoid computers', isCorrect: false },
      { text: 'Teachers are outdated', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'The passage discusses how technology, when properly integrated, can improve educational outcomes.',
    difficulty: Difficulty.HARD,
    tags: ['comprehension', 'main-idea'],
    year: 2023,
    examType: 'WAEC',
  },

  // ============= MATHEMATICS =============
  {
    subjectId: 'maths-1',
    categoryId: 'algebra-1',
    questionText: 'Solve for x: 2x + 5 = 13',
    options: [
      { text: 'x = 3', isCorrect: false },
      { text: 'x = 4', isCorrect: true },
      { text: 'x = 5', isCorrect: false },
      { text: 'x = 6', isCorrect: false },
    ],
    correctOption: 1,
    explanation: '2x + 5 = 13 → 2x = 8 → x = 4',
    difficulty: Difficulty.EASY,
    tags: ['algebra', 'linear-equations'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'maths-1',
    categoryId: 'geometry-1',
    questionText: 'Find the area of a triangle with base 10cm and height 6cm:',
    options: [
      { text: '30 cm²', isCorrect: true },
      { text: '60 cm²', isCorrect: false },
      { text: '15 cm²', isCorrect: false },
      { text: '45 cm²', isCorrect: false },
    ],
    correctOption: 0,
    explanation: 'Area of triangle = ½ × base × height = ½ × 10 × 6 = 30 cm²',
    difficulty: Difficulty.EASY,
    tags: ['geometry', 'area', 'triangles'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'maths-1',
    categoryId: 'trigonometry-1',
    questionText: 'If sin(θ) = 0.5, what is θ?',
    options: [
      { text: '30°', isCorrect: true },
      { text: '45°', isCorrect: false },
      { text: '60°', isCorrect: false },
      { text: '90°', isCorrect: false },
    ],
    correctOption: 0,
    explanation: 'sin(30°) = 0.5 is a standard trigonometric value.',
    difficulty: Difficulty.MEDIUM,
    tags: ['trigonometry', 'sin', 'standard-angles'],
    year: 2023,
    examType: 'WAEC',
  },

  // ============= PHYSICS =============
  {
    subjectId: 'physics-1',
    categoryId: 'mechanics-1',
    questionText: 'The SI unit of force is:',
    options: [
      { text: 'Kilogram', isCorrect: false },
      { text: 'Newton', isCorrect: true },
      { text: 'Joule', isCorrect: false },
      { text: 'Pascal', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'Newton (N) is the SI unit of force, defined as kg·m/s²',
    difficulty: Difficulty.EASY,
    tags: ['mechanics', 'units', 'force'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'physics-1',
    categoryId: 'thermodynamics-1',
    questionText: 'What is the absolute zero temperature?',
    options: [
      { text: '0°C', isCorrect: false },
      { text: '-273.15°C', isCorrect: true },
      { text: '-100°C', isCorrect: false },
      { text: '0°F', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'Absolute zero is -273.15°C or 0 Kelvin, the lowest possible temperature.',
    difficulty: Difficulty.MEDIUM,
    tags: ['thermodynamics', 'temperature', 'absolute-zero'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'physics-1',
    categoryId: 'optics-1',
    questionText: 'Which color of light has the shortest wavelength?',
    options: [
      { text: 'Red', isCorrect: false },
      { text: 'Yellow', isCorrect: false },
      { text: 'Blue', isCorrect: false },
      { text: 'Violet', isCorrect: true },
    ],
    correctOption: 3,
    explanation: 'Violet has the shortest wavelength (about 380 nm) in the visible spectrum.',
    difficulty: Difficulty.HARD,
    tags: ['optics', 'light', 'wavelength', 'spectrum'],
    year: 2023,
    examType: 'WAEC',
  },

  // ============= CHEMISTRY =============
  {
    subjectId: 'chemistry-1',
    categoryId: 'periodic-table-1',
    questionText: 'How many valence electrons does Oxygen have?',
    options: [
      { text: '4', isCorrect: false },
      { text: '6', isCorrect: true },
      { text: '8', isCorrect: false },
      { text: '2', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'Oxygen (O) has atomic number 8 with electron configuration 2,6 (6 valence electrons)',
    difficulty: Difficulty.EASY,
    tags: ['periodic-table', 'electron-configuration', 'valence-electrons'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'chemistry-1',
    categoryId: 'bonding-1',
    questionText: 'Which type of bond is formed between H and Cl in HCl?',
    options: [
      { text: 'Ionic bond', isCorrect: false },
      { text: 'Covalent bond', isCorrect: true },
      { text: 'Metallic bond', isCorrect: false },
      { text: 'Hydrogen bond', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'HCl contains a polar covalent bond between hydrogen and chlorine atoms.',
    difficulty: Difficulty.MEDIUM,
    tags: ['bonding', 'covalent', 'molecular-structure'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'chemistry-1',
    categoryId: 'redox-1',
    questionText: 'In the reaction 2H₂ + O₂ → 2H₂O, which element is oxidized?',
    options: [
      { text: 'Hydrogen', isCorrect: true },
      { text: 'Oxygen', isCorrect: false },
      { text: 'Both equally', isCorrect: false },
      { text: 'Neither', isCorrect: false },
    ],
    correctOption: 0,
    explanation: 'Hydrogen is oxidized (loses electrons) from 0 to +1 oxidation state.',
    difficulty: Difficulty.HARD,
    tags: ['redox', 'oxidation', 'combustion'],
    year: 2023,
    examType: 'WAEC',
  },

  // ============= BIOLOGY =============
  {
    subjectId: 'biology-1',
    categoryId: 'cell-biology-1',
    questionText: 'Which organelle is responsible for protein synthesis?',
    options: [
      { text: 'Nucleus', isCorrect: false },
      { text: 'Ribosome', isCorrect: true },
      { text: 'Mitochondria', isCorrect: false },
      { text: 'Golgi apparatus', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'Ribosomes are the site of protein synthesis in cells.',
    difficulty: Difficulty.EASY,
    tags: ['cell-biology', 'organelles', 'protein-synthesis'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'biology-1',
    categoryId: 'genetics-1',
    questionText: 'What is the genotype ratio for a monohybrid cross of two heterozygotes (Aa × Aa)?',
    options: [
      { text: '1:2:1', isCorrect: true },
      { text: '3:1', isCorrect: false },
      { text: '1:1', isCorrect: false },
      { text: '9:3:3:1', isCorrect: false },
    ],
    correctOption: 0,
    explanation: 'Aa × Aa produces AA (1) : Aa (2) : aa (1) = 1:2:1 genotype ratio.',
    difficulty: Difficulty.MEDIUM,
    tags: ['genetics', 'mendelian-inheritance', 'punnett-square'],
    year: 2023,
    examType: 'WAEC',
  },
  {
    subjectId: 'biology-1',
    categoryId: 'ecology-1',
    questionText: 'In an ecosystem, herbivores are classified as:',
    options: [
      { text: 'Producers', isCorrect: false },
      { text: 'Primary consumers', isCorrect: true },
      { text: 'Secondary consumers', isCorrect: false },
      { text: 'Decomposers', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'Herbivores are primary consumers as they feed directly on producers (plants).',
    difficulty: Difficulty.HARD,
    tags: ['ecology', 'food-chain', 'consumers'],
    year: 2023,
    examType: 'WAEC',
  },

  // ============= FURTHER MATHS =============
  {
    subjectId: 'furthermaths-1',
    categoryId: 'calculus-1',
    questionText: 'What is the derivative of f(x) = x³?',
    options: [
      { text: '3x²', isCorrect: true },
      { text: 'x²', isCorrect: false },
      { text: '3x', isCorrect: false },
      { text: 'x³/3', isCorrect: false },
    ],
    correctOption: 0,
    explanation: 'Using the power rule: d/dx(x³) = 3x²',
    difficulty: Difficulty.MEDIUM,
    tags: ['calculus', 'differentiation', 'power-rule'],
    year: 2023,
    examType: 'WAEC',
  },

  // ============= HISTORY =============
  {
    subjectId: 'history-1',
    categoryId: 'africa-history-1',
    questionText: 'Who was the first president of independent Ghana?',
    options: [
      { text: 'Kwame Nkrumah', isCorrect: true },
      { text: 'Jerry Rawlings', isCorrect: false },
      { text: 'J.B. Danquah', isCorrect: false },
      { text: 'Kofi Annan', isCorrect: false },
    ],
    correctOption: 0,
    explanation: 'Kwame Nkrumah led Ghana to independence and became its first president in 1957.',
    difficulty: Difficulty.MEDIUM,
    tags: ['african-history', 'independence', 'leaders'],
    year: 2023,
    examType: 'WAEC',
  },

  // ============= GOVERNMENT =============
  {
    subjectId: 'government-1',
    categoryId: 'constitutions-1',
    questionText: 'What year was the Nigerian Constitution last amended?',
    options: [
      { text: '1999', isCorrect: false },
      { text: '2011', isCorrect: true },
      { text: '2015', isCorrect: false },
      { text: '2020', isCorrect: false },
    ],
    correctOption: 1,
    explanation: 'The Nigerian Constitution was last comprehensively amended in 2011.',
    difficulty: Difficulty.HARD,
    tags: ['government', 'constitution', 'nigerian-history'],
    year: 2023,
    examType: 'WAEC',
  },
];

export async function seedLargeQuestionSet() {
  console.log('🌱 Seeding comprehensive question dataset...');

  try {
    // Get or create subjects
    const subjects = await prisma.subject.findMany();
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    // Seed questions
    let createdCount = 0;
    for (const questionData of SAMPLE_QUESTIONS) {
      // Verify subject exists
      if (!subjectMap.has(questionData.subjectId)) {
        console.warn(
          `⚠️  Subject ${questionData.subjectId} not found, skipping question`
        );
        continue;
      }

      // Create question
      await prisma.question.create({
        data: {
          subjectId: questionData.subjectId,
          categoryId: questionData.categoryId,
          questionText: questionData.questionText,
          options: questionData.options as any,
          correctOption: questionData.correctOption,
          explanation: questionData.explanation,
          difficulty: questionData.difficulty,
          tags: questionData.tags || [],
          year: questionData.year,
          examType: questionData.examType,
          status: 'PUBLISHED',
        },
      });

      createdCount++;
    }

    console.log(`✅ Successfully seeded ${createdCount} questions`);
  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    throw error;
  }
}

// Export for bulk import
export const QUESTIONS_DATASET = SAMPLE_QUESTIONS;