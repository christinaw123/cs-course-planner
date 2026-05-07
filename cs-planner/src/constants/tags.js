import rawTagsData from '../data/tags.json';

export const TAG_SHORT = {
  prog1: 'Prog 1',
  prog2: 'Prog 2',
  formal: 'Formal',
  discmath: 'Disc Math',
  complim: 'Comp/Lim',
  alg: 'Alg',
  intalg: 'Int Alg',
  systems: 'Systems',
  adv: 'Adv CS',
  world: 'C & W',
  ai: 'AI',
  math: 'Math',
};

export const TAG_FULL = {
  prog1: 'Programming 1',
  prog2: 'Programming 2',
  formal: 'Formal Reasoning',
  discmath: 'Discrete Math',
  complim: 'Computability & Limitations',
  alg: 'Algorithms',
  intalg: 'Intermediate Algorithms',
  systems: 'Systems',
  adv: 'Advanced CS',
  world: 'Computation & World',
  ai: 'Artificial Intelligence',
  math: 'Math prep',
};

export const TAG_CLASS = {
  prog1: 'prog',
  prog2: 'prog',
  formal: 'formal',
  discmath: 'formal',
  complim: 'formal',
  alg: 'formal',
  intalg: 'formal',
  systems: 'systems',
  adv: 'adv',
  world: 'world',
  ai: 'ai',
  math: 'math',
};

// Inline normalizer (avoids circular import with courseUtils)
function norm(code) {
  return code
    .replace('COMPSCI', 'CS')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(\d)([A-Za-z])$/, (_, d, l) => `${d}${l.toLowerCase()}`);
}

// Hand-curated tags for CS courses absent from the scraped advising-page data
const TAG_FALLBACK = {
  'CS 120': ['formal', 'complim'],
  'CS 121': ['formal', 'complim'],
  'CS 124': ['formal', 'alg', 'adv'],
  'CS 161': ['systems', 'adv'],
  'CS 165': ['systems', 'adv'],
  'CS 181': ['world', 'ai', 'adv'],
  'CS 182': ['ai', 'adv'],
  'CS 189': ['adv'],
  'CS 191': ['adv'],
  'CS 91r': ['adv'],
  'CS 1340': ['world', 'adv'],
};

// Math/probability requirement courses (not on the CS advising scraper page)
const TAG_MATH = {
  'STAT 110': ['math'],
  'STAT 111': ['math'],
  'MATH 21a': [],
  'MATH 21b': ['math'],
  'MATH 22a': ['math'],
  'MATH 22b': ['math'],
  'MATH 25a': ['math'],
};

// Scraped tags from the Harvard CS advising page — authoritative for all courses it lists
const scrapedTags = Object.fromEntries(
  Object.entries(rawTagsData)
    .filter(([, tags]) => Array.isArray(tags) && tags.length > 0)
    .map(([k, v]) => [norm(k), v])
);

// Merge order: scraped data overrides fallback; math entries always win (scraper ignores them)
export const TAG_AUTO = { ...TAG_FALLBACK, ...scrapedTags, ...TAG_MATH };

// Short title lookup for onboarding autocomplete and transcript enrichment
export const COURSE_TITLE = {
  'CS 50': 'Introduction to Computer Science',
  'CS 51': 'Abstraction and Design in Computation',
  'CS 32': 'Computational Thinking and Problem Solving',
  'CS 20': 'Discrete Mathematics for Computer Science',
  'CS 120': 'Introduction to Algorithms and their Limitations',
  'CS 1200': 'Theory of Computation',
  'CS 121': 'Introduction to Theoretical Computer Science',
  'CS 124': 'Data Structures and Algorithms',
  'CS 1240': 'Advanced Algorithms',
  'CS 61': 'Systems Programming and Machine Organization',
  'CS 161': 'Operating Systems',
  'CS 165': 'Data Systems',
  'CS 181': 'Machine Learning',
  'CS 182': 'Deep Learning',
  'CS 1260': 'Fairness and Privacy in Automated Decision Making',
  'CS 1340': 'Computing and the Law',
  'CS 1780': 'Usable Interactive Systems',
  'CS 2780': 'Usable Interactive Systems (Graduate)',
  'CS 91r': 'Supervised Research',
  'CS 189': 'Mathematics for Computation',
  'CS 191': 'Quantum Computing',
  'CS 2241': 'Information Theory',
  'STAT 110': 'Introduction to Probability',
  'MATH 21b': 'Linear Algebra and Differential Equations',
  'MATH 21a': 'Multivariable Calculus',
  'MATH 22a': 'Vector Calculus and Linear Algebra I',
  'MATH 22b': 'Vector Calculus and Linear Algebra II',
  'MATH 25a': 'Theoretical Linear Algebra and Real Analysis I',
  'STAT 111': 'Introduction to Statistical Inference',
};
