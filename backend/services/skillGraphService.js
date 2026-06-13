/**
 * SkillSwap AI - Skill Knowledge Graph Service
 * Hardcoded semantic skill relationships and learning paths.
 * This works WITHOUT an OpenAI API key - pure algorithmic matching.
 */

const SKILL_SYNONYMS = {
  'react': ['react.js', 'reactjs', 'react js', 'frontend development', 'front-end development', 'frontend dev'],
  'react.js': ['react', 'reactjs', 'react js', 'frontend development'],
  'node.js': ['node', 'nodejs', 'node js', 'backend development', 'backend dev', 'server-side javascript'],
  'javascript': ['js', 'ecmascript', 'es6', 'frontend development', 'front-end development'],
  'typescript': ['ts', 'typed javascript'],
  'python': ['py', 'python3', 'python programming'],
  'machine learning': ['ml', 'artificial intelligence', 'ai', 'deep learning'],
  'data science': ['data analytics', 'data analysis', 'big data'],
  'ui/ux design': ['ui design', 'ux design', 'user interface design', 'user experience design', 'product design', 'figma'],
  'photoshop': ['adobe photoshop', 'image editing', 'photo editing'],
  'guitar': ['acoustic guitar', 'electric guitar', 'bass guitar'],
  'piano': ['keyboard', 'keys', 'classical piano'],
  'spanish': ['español', 'spanish language'],
  'french': ['français', 'french language'],
  'photography': ['digital photography', 'photo', 'camera'],
  'yoga': ['mindfulness', 'meditation', 'wellness'],
  'cooking': ['culinary arts', 'baking', 'cuisine', 'chef'],
  'next.js': ['nextjs', 'next js', 'server-side rendering', 'ssr', 'react framework'],
  'vue.js': ['vuejs', 'vue js', 'vue'],
  'angular': ['angularjs', 'angular js'],
  'django': ['django framework', 'python web'],
  'flask': ['flask framework', 'python flask'],
  'sql': ['mysql', 'postgresql', 'database', 'relational database'],
  'docker': ['containerization', 'containers'],
  'kubernetes': ['k8s', 'container orchestration'],
};

const LEARNING_PATHS = {
  'react': ['javascript', 'typescript', 'redux', 'next.js', 'testing (jest)'],
  'react.js': ['javascript', 'typescript', 'redux', 'next.js', 'testing (jest)'],
  'next.js': ['react.js', 'typescript', 'node.js', 'postgresql', 'vercel deployment'],
  'vue.js': ['javascript', 'typescript', 'nuxt.js', 'pinia', 'vite'],
  'angular': ['typescript', 'rxjs', 'ngrx', 'angular material'],
  'javascript': ['typescript', 'react.js', 'node.js', 'testing (jest)', 'algorithms & data structures'],
  'typescript': ['react.js', 'angular', 'node.js', 'generics & advanced types'],
  'html': ['css', 'javascript', 'responsive design', 'accessibility'],
  'css': ['sass/scss', 'tailwind css', 'animations', 'responsive design'],
  'node.js': ['express.js', 'postgresql', 'mongodb', 'rest apis', 'graphql'],
  'python': ['django', 'flask', 'machine learning', 'data science', 'fastapi'],
  'django': ['python', 'postgresql', 'rest apis', 'celery', 'docker'],
  'flask': ['python', 'rest apis', 'sqlalchemy', 'docker'],
  'java': ['spring boot', 'microservices', 'maven', 'docker', 'aws'],
  'php': ['laravel', 'mysql', 'rest apis', 'composer'],
  'machine learning': ['python', 'tensorflow', 'pytorch', 'data science', 'statistics'],
  'data science': ['python', 'machine learning', 'sql', 'tableau', 'statistics'],
  'tensorflow': ['machine learning', 'python', 'deep learning', 'keras', 'computer vision'],
  'pytorch': ['machine learning', 'python', 'deep learning', 'nlp'],
  'sql': ['postgresql', 'data science', 'database design', 'data analytics'],
  'docker': ['kubernetes', 'ci/cd', 'aws', 'linux', 'microservices'],
  'kubernetes': ['docker', 'helm', 'aws', 'microservices', 'monitoring'],
  'aws': ['cloud architecture', 'docker', 'terraform', 'security', 'serverless'],
  'ui/ux design': ['figma', 'user research', 'prototyping', 'css', 'design systems'],
  'figma': ['ui/ux design', 'prototyping', 'design systems', 'user research'],
  'photoshop': ['illustrator', 'lightroom', 'photography', 'ui/ux design'],
  'guitar': ['music theory', 'piano', 'songwriting', 'music production'],
  'piano': ['music theory', 'guitar', 'music composition', 'music production'],
  'music theory': ['piano', 'guitar', 'composition', 'ear training'],
  'music production': ['ableton live', 'music theory', 'mixing & mastering', 'sound design'],
  'spanish': ['french', 'portuguese', 'italian', 'latin american culture'],
  'french': ['spanish', 'italian', 'portuguese', 'french culture & history'],
  'japanese': ['chinese (mandarin)', 'korean', 'japanese culture', 'anime arts'],
  'chinese (mandarin)': ['japanese', 'cantonese', 'chinese culture'],
  'yoga': ['meditation', 'pilates', 'nutrition', 'anatomy basics'],
  'fitness training': ['nutrition', 'yoga', 'sports psychology', 'anatomy'],
  'photography': ['photo editing', 'photoshop', 'lightroom', 'videography'],
  'cooking': ['nutrition', 'baking', 'food science', 'menu planning'],
  'drawing': ['illustration', 'digital art', 'painting', 'design principles'],
};

const CATEGORY_KEYWORDS = {
  'Technology': ['javascript', 'python', 'java', 'react', 'node', 'angular', 'vue', 'typescript',
    'docker', 'kubernetes', 'aws', 'database', 'sql', 'mongodb', 'api', 'cloud', 'devops',
    'machine learning', 'ai', 'data', 'programming', 'coding', 'software', 'web', 'mobile',
    'android', 'ios', 'swift', 'kotlin', 'rust', 'golang', 'c++', 'php', 'ruby', 'flutter'],
  'Design': ['figma', 'photoshop', 'illustrator', 'ui', 'ux', 'design', 'sketch', 'prototype',
    'typography', 'brand', 'logo', 'graphic', 'animation', 'motion', 'canva'],
  'Music': ['guitar', 'piano', 'drums', 'bass', 'violin', 'music', 'singing', 'vocal',
    'songwriting', 'production', 'mixing', 'mastering', 'ableton', 'fl studio'],
  'Language': ['spanish', 'french', 'german', 'japanese', 'chinese', 'korean', 'italian',
    'portuguese', 'arabic', 'hindi', 'russian', 'english', 'language', 'linguistics'],
  'Arts': ['drawing', 'painting', 'photography', 'illustration', 'sculpture', 'pottery',
    'watercolor', 'sketch', 'calligraphy', 'ceramics', 'film', 'videography'],
  'Health & Fitness': ['yoga', 'fitness', 'gym', 'nutrition', 'meditation', 'pilates',
    'running', 'cycling', 'swimming', 'crossfit', 'martial arts', 'wellness', 'anatomy'],
  'Lifestyle': ['cooking', 'baking', 'gardening', 'travel', 'fashion', 'knitting', 'sewing',
    'woodworking', 'diy', 'interior design', 'finance', 'investing', 'writing'],
  'Business': ['marketing', 'sales', 'management', 'leadership', 'entrepreneurship',
    'accounting', 'strategy', 'project management', 'agile', 'scrum', 'hr'],
};

function getSynonyms(skillName) {
  const lower = skillName.toLowerCase().trim();
  return SKILL_SYNONYMS[lower] || [];
}

function getSemanticSimilarity(skill1, skill2) {
  const s1 = skill1.toLowerCase().trim();
  const s2 = skill2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  const s1Synonyms = getSynonyms(s1);
  const s2Synonyms = getSynonyms(s2);
  if (s1Synonyms.includes(s2) || s2Synonyms.includes(s1)) return 0.80;
  for (const synonym of s1Synonyms) {
    if (getSynonyms(synonym).includes(s2)) return 0.70;
  }
  const tokens1 = new Set(s1.split(/[\s\/\-\.]+/));
  const tokens2 = new Set(s2.split(/[\s\/\-\.]+/));
  const shared = [...tokens1].filter(t => tokens2.has(t) && t.length > 2);
  if (shared.length > 0) return 0.60;
  return 0.0;
}

function getLearningPath(skillName) {
  const lower = skillName.toLowerCase().trim();
  if (LEARNING_PATHS[lower]) return LEARNING_PATHS[lower];
  const synonyms = getSynonyms(lower);
  for (const syn of synonyms) {
    if (LEARNING_PATHS[syn]) return LEARNING_PATHS[syn];
  }
  for (const [key, path] of Object.entries(LEARNING_PATHS)) {
    if (lower.includes(key) || key.includes(lower)) return path;
  }
  return [];
}

function suggestCategory(skillName) {
  const lower = skillName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw) || kw.includes(lower))) {
      return category;
    }
  }
  return 'Lifestyle';
}

function getGraphSuggestions(query) {
  const lower = query.toLowerCase().trim();
  if (!lower || lower.length < 2) return [];
  const allKnownSkills = new Set([
    ...Object.keys(SKILL_SYNONYMS),
    ...Object.keys(LEARNING_PATHS),
    ...Object.values(SKILL_SYNONYMS).flat(),
  ]);
  return [...allKnownSkills]
    .filter(skill => skill.toLowerCase().includes(lower))
    .slice(0, 8);
}

module.exports = {
  getSynonyms,
  getSemanticSimilarity,
  getLearningPath,
  suggestCategory,
  getGraphSuggestions,
  SKILL_SYNONYMS,
  LEARNING_PATHS,
  CATEGORY_KEYWORDS,
};
