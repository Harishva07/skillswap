-- ============================================================
--  SkillSwap - Database Cleanup v2
--  Fixes FK constraint issue, fixes categories, adds 100+ more skills
--  Run: "/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql" -u root -pHari@87601 skillswap_db < seeds/cleanup.sql
-- ============================================================

USE skillswap_db;

-- ── Step 1: Fix wrong categories ──────────────────────────────────────────────
UPDATE skills SET category = 'Health'     WHERE category IN ('Health & Fitness');
UPDATE skills SET category = 'Arts'       WHERE category IN ('Arts & Crafts');
UPDATE skills SET category = 'Cooking'    WHERE name IN ('Cooking','Baking','Meal Planning') AND category = 'Lifestyle';
UPDATE skills SET category = 'Technology' WHERE category = 'Lifestyle' AND LOWER(name) IN (
  'html & css','html','css','java','javascript','python','react.js','node.js',
  'typescript','next.js','sql','git & github','docker','flutter','vue.js',
  'mongodb','aws','cybersecurity','data analysis','machine learning',
  'animations','typed javascript','android development','ios development'
);

-- ── Step 2: Deduplicate safely (update FK refs first, then delete) ────────────

-- Find keeper IDs (lowest id wins for each name)
CREATE TEMPORARY TABLE keeper_map AS
SELECT MIN(id) AS keep_id, LOWER(TRIM(name)) AS norm_name
FROM skills
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1;

-- Re-point user_skills to the keeper
UPDATE user_skills us
  JOIN skills s ON us.skill_id = s.id
  JOIN keeper_map km ON LOWER(TRIM(s.name)) = km.norm_name
SET us.skill_id = km.keep_id
WHERE us.skill_id <> km.keep_id;

-- Re-point exchange_requests offered_skill_id to keeper
UPDATE exchange_requests er
  JOIN skills s ON er.offered_skill_id = s.id
  JOIN keeper_map km ON LOWER(TRIM(s.name)) = km.norm_name
SET er.offered_skill_id = km.keep_id
WHERE er.offered_skill_id <> km.keep_id;

-- Re-point exchange_requests wanted_skill_id to keeper
UPDATE exchange_requests er
  JOIN skills s ON er.wanted_skill_id = s.id
  JOIN keeper_map km ON LOWER(TRIM(s.name)) = km.norm_name
SET er.wanted_skill_id = km.keep_id
WHERE er.wanted_skill_id <> km.keep_id;

-- Now safe to delete duplicates
DELETE s FROM skills s
  JOIN keeper_map km ON LOWER(TRIM(s.name)) = km.norm_name
WHERE s.id <> km.keep_id;

DROP TEMPORARY TABLE keeper_map;

-- ── Step 3: Add 100+ skills across all categories ─────────────────────────────

INSERT INTO skills (name, category, description, popularity) VALUES

-- ── Technology (20 more) ──────────────────────────────────────────────────────
('Kotlin',             'Technology', 'Modern language for Android and JVM development.', 72),
('Swift',              'Technology', 'Apple language for iOS and macOS app development.', 70),
('Rust',               'Technology', 'Systems programming language focused on safety and performance.', 65),
('Go (Golang)',        'Technology', 'Efficient language by Google for cloud and backend systems.', 68),
('Django',             'Technology', 'High-level Python web framework for rapid development.', 66),
('Spring Boot',        'Technology', 'Java framework for building enterprise web applications.', 64),
('GraphQL',            'Technology', 'Query language for APIs and runtime for executing queries.', 62),
('Redis',              'Technology', 'In-memory data structure store used as database and cache.', 60),
('Kubernetes',         'Technology', 'Container orchestration system for automating deployment.', 63),
('TensorFlow',         'Technology', 'Open-source ML framework by Google for deep learning.', 61),
('Blockchain',         'Technology', 'Decentralized ledger technology for secure transactions.', 58),
('Linux',              'Technology', 'Open-source operating system for servers and development.', 75),
('Bash Scripting',     'Technology', 'Automating tasks using Unix shell scripts.', 57),
('React Native',       'Technology', 'Build native mobile apps using React and JavaScript.', 66),
('Selenium',           'Technology', 'Automated browser testing framework for web apps.', 55),
('Power BI',           'Technology', 'Business analytics tool for interactive data visualization.', 60),
('Excel (Advanced)',   'Technology', 'Advanced Excel skills including macros, pivot tables, and VBA.', 70),
('C++',                'Technology', 'High-performance language for systems and game development.', 67),
('PHP',                'Technology', 'Server-side scripting language for web development.', 62),
('Unity (Game Dev)',   'Technology', 'Cross-platform game engine for 2D and 3D development.', 64),

-- ── Design (10 more) ──────────────────────────────────────────────────────────
('Canva',              'Design', 'Easy-to-use online design tool for graphics and presentations.', 72),
('Sketch',             'Design', 'Vector graphics editor for macOS UI design.', 60),
('InDesign',           'Design', 'Professional layout and page design software by Adobe.', 58),
('Color Theory',       'Design', 'Understanding how colors interact and affect human perception.', 55),
('Typography',         'Design', 'Art of arranging text to make it readable and visually appealing.', 57),
('Branding',           'Design', 'Building visual identity systems for companies and products.', 60),
('Wireframing',        'Design', 'Creating low-fidelity blueprints for digital interfaces.', 62),
('Illustration',       'Design', 'Creating original artwork using digital or traditional tools.', 58),
('After Effects',      'Design', 'Adobe tool for cinematic visual effects and motion graphics.', 55),
('Procreate',          'Design', 'Digital illustration app for iPad with professional tools.', 60),

-- ── Music (8 more) ────────────────────────────────────────────────────────────
('Bass Guitar',        'Music', 'Playing bass lines and rhythm foundation for bands.', 55),
('Ukulele',            'Music', 'Small 4-string Hawaiian guitar popular for beginners.', 58),
('Saxophone',          'Music', 'Wind instrument for jazz, classical, and pop music.', 52),
('Flute',              'Music', 'Classical woodwind instrument technique and music reading.', 50),
('Tabla',              'Music', 'Indian classical percussion instrument with rich rhythmic tradition.', 48),
('Beatboxing',         'Music', 'Vocal percussion mimicking drum machines and sound effects.', 45),
('Sound Engineering',  'Music', 'Recording, mixing, and mastering audio for music and film.', 60),
('Songwriting',        'Music', 'Crafting original song lyrics, melody, and structure.', 62),

-- ── Language (8 more) ─────────────────────────────────────────────────────────
('Tamil',              'Language', 'Classical language spoken predominantly in Tamil Nadu, India.', 55),
('Korean',             'Language', 'Language of South Korea with growing global interest.', 62),
('Portuguese',         'Language', 'Spoken across Brazil, Portugal, and parts of Africa.', 58),
('Italian',            'Language', 'The language of art, food, and the Renaissance.', 56),
('Russian',            'Language', 'Widely spoken Slavic language across Eastern Europe and Russia.', 54),
('Turkish',            'Language', 'Official language of Turkey, spoken by over 80 million people.', 50),
('Sign Language',      'Language', 'Visual-gestural communication for the deaf community.', 55),
('Latin',              'Language', 'Classical language foundational to Western law and medicine.', 45),

-- ── Arts (8 more) ─────────────────────────────────────────────────────────────
('Sketching',          'Arts', 'Quick hand-drawing technique to capture ideas and scenes.', 62),
('Sculpture',          'Arts', 'Creating 3D art forms using clay, stone, wood, or metal.', 48),
('Pottery',            'Arts', 'Shaping clay into functional or decorative ceramic objects.', 52),
('Calligraphy',        'Arts', 'Decorative handwriting and lettering as an art form.', 55),
('Origami',            'Arts', 'Japanese art of paper folding into intricate shapes.', 48),
('Knitting',           'Arts', 'Creating fabric by interlocking yarn loops with needles.', 50),
('Embroidery',         'Arts', 'Decorating fabric with needle and thread patterns.', 47),
('Comic Art',          'Arts', 'Storytelling through sequential illustration and visual narrative.', 53),

-- ── Business (8 more) ─────────────────────────────────────────────────────────
('Sales',              'Business', 'Persuasion, negotiation, and closing techniques for selling.', 68),
('Accounting',         'Business', 'Recording, summarizing, and analyzing financial transactions.', 62),
('Social Media',       'Business', 'Growing audiences and brands on Instagram, TikTok, LinkedIn.', 72),
('Copywriting',        'Business', 'Writing persuasive marketing and advertising content.', 65),
('E-commerce',         'Business', 'Running online stores on Shopify, Amazon, and other platforms.', 63),
('Leadership',         'Business', 'Inspiring and guiding teams toward shared goals.', 65),
('Market Research',    'Business', 'Gathering and analyzing data about consumer behavior.', 58),
('HR Management',      'Business', 'Recruiting, onboarding, and managing people in organizations.', 55),

-- ── Health (8 more) ───────────────────────────────────────────────────────────
('Yoga',               'Health', 'Physical and mental practice combining postures, breathing, and meditation.', 70),
('Fitness Training',   'Health', 'Exercise science, workout programming, and personal training.', 68),
('Meditation',         'Health', 'Mindfulness and meditation practices for mental well-being.', 65),
('Pilates',            'Health', 'Low-impact exercise strengthening core muscles and posture.', 58),
('Zumba',              'Health', 'Latin-inspired dance fitness program for cardio and fun.', 55),
('Nutrition',          'Health', 'Understanding healthy eating, macros, and diet planning.', 60),
('First Aid',          'Health', 'Emergency response techniques for accidents and injuries.', 62),
('Mental Health',      'Health', 'Emotional wellness, stress management, and counselling basics.', 60),

-- ── Lifestyle (8 more) ────────────────────────────────────────────────────────
('Photography',        'Lifestyle', 'Capturing moments with composition, lighting, and editing skills.', 72),
('Creative Writing',   'Lifestyle', 'Crafting stories, poetry, and scripts with narrative techniques.', 62),
('Chess',              'Lifestyle', 'Strategic board game developing critical thinking and problem solving.', 60),
('Travelling',         'Lifestyle', 'Planning trips, cultural immersion, and travel hacks.', 65),
('Minimalism',         'Lifestyle', 'Intentional living with less clutter for mental clarity.', 48),
('Public Relations',   'Lifestyle', 'Managing reputation and media communications for people/brands.', 55),
('Pet Training',       'Lifestyle', 'Teaching pets commands, behavior, and social skills.', 50),
('Interior Design',    'Lifestyle', 'Decorating and arranging living spaces for beauty and function.', 58),

-- ── Cooking (8 more) ──────────────────────────────────────────────────────────
('Cooking',            'Cooking', 'Preparing delicious meals with techniques from around the world.', 75),
('Baking',             'Cooking', 'Bread, pastries, and dessert creation using precise techniques.', 62),
('Meal Planning',      'Cooking', 'Planning balanced weekly meals for health and efficiency.', 52),
('Vegan Cooking',      'Cooking', 'Plant-based cuisine that is nutritious and delicious.', 55),
('BBQ & Grilling',     'Cooking', 'Outdoor cooking techniques for meats, vegetables, and more.', 60),
('Sushi Making',       'Cooking', 'Japanese art of preparing rice and fresh fish into sushi.', 58),
('Cake Decorating',    'Cooking', 'Creating beautiful cake designs with fondant, icing, and piping.', 55),
('Cocktail Making',    'Cooking', 'Mixology techniques for creating classic and signature drinks.', 52),

-- ── Sports (10 more) ──────────────────────────────────────────────────────────
('Football',           'Sports', 'Playing and coaching the world''s most popular sport.', 75),
('Cricket',            'Sports', 'Batting, bowling, and fielding techniques for cricket.', 70),
('Swimming',           'Sports', 'Swimming strokes, technique, and water safety.', 65),
('Basketball',         'Sports', 'Dribbling, shooting, and teamwork in basketball.', 62),
('Tennis',             'Sports', 'Serving, rallying, and game strategy in tennis.', 58),
('Badminton',          'Sports', 'Fast-paced racket sport with singles and doubles play.', 60),
('Table Tennis',       'Sports', 'Precision racket sport requiring speed and spin techniques.', 55),
('Volleyball',         'Sports', 'Team sport combining serving, spiking, and blocking.', 55),
('Cycling',            'Sports', 'Road, mountain, and recreational cycling techniques.', 60),
('Martial Arts',       'Sports', 'Karate, Taekwondo, Judo, and self-defense disciplines.', 62),

-- ── Education (10 more) ───────────────────────────────────────────────────────
('Teaching',           'Education', 'Effective pedagogy, lesson planning, and classroom management.', 65),
('Mathematics',        'Education', 'From arithmetic to calculus — teaching and tutoring maths.', 68),
('Physics',            'Education', 'Mechanics, electricity, and the fundamental laws of nature.', 60),
('Biology',            'Education', 'Life sciences including anatomy, ecology, and genetics.', 58),
('Chemistry',          'Education', 'Reactions, elements, and laboratory techniques in chemistry.', 55),
('History',            'Education', 'World history, civilizations, and historical analysis.', 52),
('Geography',          'Education', 'Physical and human geography, maps, and global systems.', 48),
('Economics',          'Education', 'Micro and macroeconomics, markets, and financial systems.', 57),
('Philosophy',         'Education', 'Critical thinking, logic, ethics, and great philosophical ideas.', 50),
('Study Skills',       'Education', 'Effective note-taking, time management, and exam techniques.', 60),

-- ── Other (8 more) ────────────────────────────────────────────────────────────
('Gardening',          'Other', 'Growing plants, vegetables, and maintaining gardens.', 55),
('DIY & Crafts',       'Other', 'Handmade projects, home improvement, and creative crafts.', 52),
('Volunteering',       'Other', 'Community service, social impact, and charitable skills.', 45),
('Astrology',          'Other', 'Reading birth charts and understanding planetary influences.', 48),
('Magic & Illusion',   'Other', 'Card tricks, sleight of hand, and stage illusion techniques.', 42),
('Ham Radio',          'Other', 'Amateur radio communication and electronics.', 35),
('Beekeeping',         'Other', 'Maintaining bee colonies and harvesting honey.', 40),
('Woodworking',        'Other', 'Crafting furniture and objects from wood with hand or power tools.', 50)

ON DUPLICATE KEY UPDATE
  category    = VALUES(category),
  description = VALUES(description),
  popularity  = VALUES(popularity);

-- ── Step 4: Summary ───────────────────────────────────────────────────────────
SELECT category, COUNT(*) AS skill_count
FROM skills
GROUP BY category
ORDER BY category;

SELECT CONCAT('✅ Done! Total skills: ', COUNT(*)) AS result FROM skills;
