/**
 * SkillSwap AI - Core AI Service
 * Handles OpenAI integration, embeddings, and semantic matching.
 * Gracefully degrades to graph-based matching if no API key is set.
 */

const db = require('../config/db');
const { getSemanticSimilarity, getLearningPath, getGraphSuggestions, suggestCategory } = require('./skillGraphService');

let openaiClient = null;
const initOpenAI = () => {
  if (openaiClient) return openaiClient;
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
    console.log('⚠️  OPENAI_API_KEY not set — using graph-based AI fallback');
    return null;
  }
  try {
    const { OpenAI } = require('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ OpenAI client initialized');
    return openaiClient;
  } catch (e) {
    console.error('❌ Failed to init OpenAI:', e.message);
    return null;
  }
};

const embeddingCache = new Map();

async function generateEmbedding(text) {
  const client = initOpenAI();
  if (!client) return null;
  const cacheKey = text.toLowerCase().trim();
  if (embeddingCache.has(cacheKey)) return embeddingCache.get(cacheKey);
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    const vector = response.data[0].embedding;
    embeddingCache.set(cacheKey, vector);
    return vector;
  } catch (error) {
    console.error('OpenAI embedding error:', error.message);
    return null;
  }
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getSkillSimilarity(skill1Name, skill2Name) {
  const graphScore = getSemanticSimilarity(skill1Name, skill2Name);
  if (graphScore >= 0.80) return graphScore;
  const [vec1, vec2] = await Promise.all([
    generateEmbedding(skill1Name),
    generateEmbedding(skill2Name),
  ]);
  if (vec1 && vec2) {
    const embeddingScore = cosineSimilarity(vec1, vec2);
    return Math.max(graphScore, embeddingScore);
  }
  return graphScore;
}

async function getSkillSuggestions(query, limit = 8) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();

  // 1. Try database search — wrapped in try-catch for resilience
  const suggestions = [];
  const existingNames = new Set();

  try {
    const limitNum = limit * 2;
    let dbSkills = [];
    try {
      // db.query (not db.execute) avoids ER_WRONG_ARGUMENTS with LIMIT in prepared statements
      const [rows] = await db.query(
        `SELECT id, name, category, description, popularity
         FROM skills
         WHERE is_active = 1 AND (name LIKE ? OR description LIKE ?)
         ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, popularity DESC
         LIMIT ${limitNum}`,
        [`${q}%`, `%${q}%`, `${q}%`]
      );
      dbSkills = rows;
    } catch {
      try {
        const [rows] = await db.query(
          `SELECT id, name, category, description
           FROM skills
           WHERE name LIKE ? OR description LIKE ?
           ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END
           LIMIT ${limitNum}`,
          [`${q}%`, `%${q}%`, `${q}%`]
        );
        dbSkills = rows;
      } catch {
        // DB unavailable — fall through to graph
      }
    }

    for (const s of dbSkills) {
      suggestions.push({
        id: s.id,
        name: s.name,
        category: s.category || suggestCategory(s.name),
        description: s.description,
        popularity: s.popularity || 0,
        source: 'database',
      });
      existingNames.add(s.name.toLowerCase());
    }
  } catch {
    // Silently fall through to graph suggestions
  }

  // 2. Graph-based suggestions (always works, no DB needed)
  const graphSuggestions = getGraphSuggestions(q);
  for (const skillName of graphSuggestions) {
    if (!existingNames.has(skillName.toLowerCase()) && suggestions.length < limit) {
      suggestions.push({
        id: null,
        name: skillName.charAt(0).toUpperCase() + skillName.slice(1),
        category: suggestCategory(skillName),
        description: null,
        popularity: 0,
        source: 'ai',
      });
      existingNames.add(skillName.toLowerCase());
    }
  }

  // 3. OpenAI expansion (only if few results and API key available)
  if (suggestions.length < 4) {
    try {
      const client = initOpenAI();
      if (client) {
        const completion = await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: 'You are a skill suggestions assistant. Return ONLY a JSON array of skill names. Max 5 skills. Example: ["React.js", "Redux", "Next.js"]'
          }, {
            role: 'user',
            content: `Suggest skills related to: "${q}"`
          }],
          max_tokens: 100,
          temperature: 0.3,
        });
        const text = completion.choices[0].message.content.trim();
        const aiSkills = JSON.parse(text);
        if (Array.isArray(aiSkills)) {
          for (const skillName of aiSkills) {
            if (!existingNames.has(skillName.toLowerCase()) && suggestions.length < limit) {
              suggestions.push({
                id: null,
                name: skillName,
                category: suggestCategory(skillName),
                description: null,
                popularity: 0,
                source: 'ai',
              });
              existingNames.add(skillName.toLowerCase());
            }
          }
        }
      }
    } catch {
      // Silently ignore OpenAI errors
    }
  }

  return suggestions.slice(0, limit);
}

async function computeAIMatchScore(mySkills, theirSkills, theirUser) {
  const reasons = [];
  const skillMatches = [];
  let score = 0;

  let directOfferedMatches = 0;
  for (const myOffered of mySkills.offered) {
    for (const theirWanted of theirSkills.wanted) {
      const sim = await getSkillSimilarity(myOffered.name, theirWanted.name);
      if (sim >= 0.60) {
        directOfferedMatches++;
        skillMatches.push({ direction: 'I offer → They want', mySkill: myOffered.name, theirSkill: theirWanted.name, similarity: sim });
        if (myOffered.name.toLowerCase() === theirWanted.name.toLowerCase()) {
          reasons.push(`Offers ${myOffered.name} which they want to learn`);
        } else if (sim >= 0.80) {
          reasons.push(`Offers ${myOffered.name} (related to their ${theirWanted.name})`);
        }
      }
    }
  }

  let directWantedMatches = 0;
  for (const myWanted of mySkills.wanted) {
    for (const theirOffered of theirSkills.offered) {
      const sim = await getSkillSimilarity(myWanted.name, theirOffered.name);
      if (sim >= 0.60) {
        directWantedMatches++;
        skillMatches.push({ direction: 'They offer → I want', mySkill: myWanted.name, theirSkill: theirOffered.name, similarity: sim });
        if (myWanted.name.toLowerCase() === theirOffered.name.toLowerCase()) {
          reasons.push(`They offer ${theirOffered.name} which you want to learn`);
        } else if (sim >= 0.80) {
          reasons.push(`They offer ${theirOffered.name} (related to your ${myWanted.name})`);
        }
      }
    }
  }

  const maxOffered = Math.max(mySkills.offered.length, 1);
  const maxWanted = Math.max(mySkills.wanted.length, 1);
  score += Math.min(30, (directOfferedMatches / maxOffered) * 30);
  score += Math.min(30, (directWantedMatches / maxWanted) * 30);

  if (directOfferedMatches === 0 || directWantedMatches === 0) {
    return { score: 0, reasons: [], skillMatches: [] };
  }

  const rating = parseFloat(theirUser.rating) || 0;
  if (rating >= 4.5) { score += 15; reasons.push('Highly rated user (4.5+ stars)'); }
  else if (rating >= 4.0) { score += 10; reasons.push('Well-rated user (4+ stars)'); }
  else if (rating >= 3.0) { score += 5; }

  const expLevels = { beginner: 1, intermediate: 2, expert: 3 };
  const myLevel = expLevels[mySkills.experience_level] || 1;
  const theirLevel = expLevels[theirUser.experience_level] || 1;
  if (Math.abs(myLevel - theirLevel) <= 1) { score += 10; reasons.push('Compatible experience levels'); }

  const exchanges = parseInt(theirUser.total_exchanges) || 0;
  if (exchanges >= 5) { score += 15; reasons.push('Very active exchanger (5+ completed)'); }
  else if (exchanges >= 2) { score += 8; reasons.push('Active learner with completed exchanges'); }
  else if (exchanges >= 1) { score += 4; reasons.push('Has completed skill exchanges'); }

  return { score: Math.min(100, Math.round(score)), reasons: reasons.slice(0, 4), skillMatches };
}

async function getAILearningPath(skillName, userSkillNames = []) {
  const userSkillSet = new Set(userSkillNames.map(s => s.toLowerCase()));
  const graphPath = getLearningPath(skillName);
  let aiPath = [];
  try {
    const client = initOpenAI();
    if (client) {
      const alreadyHas = userSkillNames.length > 0 ? `They already know: ${userSkillNames.join(', ')}. ` : '';
      const completion = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'You are a learning advisor. Return ONLY a JSON array of skill names. Max 6 skills.'
        }, {
          role: 'user',
          content: `${alreadyHas}Someone added "${skillName}". What 6 skills should they learn next?`
        }],
        max_tokens: 120,
        temperature: 0.4,
      });
      const text = completion.choices[0].message.content.trim();
      aiPath = JSON.parse(text);
    }
  } catch (e) { /* Fall through */ }

  const combined = [...new Set([...aiPath, ...graphPath])]
    .filter(s => !userSkillSet.has(s.toLowerCase()))
    .slice(0, 6);

  return combined.map(name => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    category: suggestCategory(name),
    reason: `Complements your ${skillName} skills`,
  }));
}

async function storeEmbedding(skillId, embedding) {
  await db.execute(
    `INSERT INTO skill_embeddings (skill_id, embedding, model)
     VALUES (?, ?, 'text-embedding-ada-002')
     ON DUPLICATE KEY UPDATE embedding = ?, model = 'text-embedding-ada-002'`,
    [skillId, JSON.stringify(embedding), JSON.stringify(embedding)]
  );
}

async function refreshAllEmbeddings() {
  const client = initOpenAI();
  if (!client) return { processed: 0, failed: 0, message: 'OpenAI not configured' };
  const [skills] = await db.execute('SELECT id, name, description FROM skills WHERE is_active = 1');
  let processed = 0, failed = 0;
  for (const skill of skills) {
    try {
      const text = `${skill.name}${skill.description ? ': ' + skill.description : ''}`;
      const embedding = await generateEmbedding(text);
      if (embedding) { await storeEmbedding(skill.id, embedding); processed++; }
      await new Promise(r => setTimeout(r, 50));
    } catch (e) { failed++; }
  }
  return { processed, failed };
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  getSkillSimilarity,
  getSkillSuggestions,
  computeAIMatchScore,
  getAILearningPath,
  refreshAllEmbeddings,
};
