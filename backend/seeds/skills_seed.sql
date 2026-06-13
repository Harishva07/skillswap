-- ============================================================
--  SkillSwap - Skills Seed Data
--  Run this in MySQL Workbench or terminal:
--  mysql -u root -p skillswap_db < seeds/skills_seed.sql
-- ============================================================

USE skillswap_db;

INSERT INTO skills (name, category, description, popularity) VALUES
-- Technology
('JavaScript',        'Technology', 'The most popular web programming language for frontend and backend development.', 95),
('Python',            'Technology', 'Versatile language used in data science, AI, web, and automation.', 93),
('React.js',          'Technology', 'A JavaScript library for building interactive user interfaces.', 90),
('Node.js',           'Technology', 'JavaScript runtime for building scalable server-side applications.', 88),
('HTML & CSS',        'Technology', 'Core technologies for building and styling web pages.', 85),
('TypeScript',        'Technology', 'Typed superset of JavaScript for large-scale applications.', 82),
('Next.js',           'Technology', 'React framework for production-ready web applications with SSR.', 80),
('SQL',               'Technology', 'Structured query language for managing relational databases.', 78),
('Git & GitHub',      'Technology', 'Version control system for tracking code changes and collaboration.', 77),
('Machine Learning',  'Technology', 'Teaching computers to learn from data without explicit programming.', 75),
('Docker',            'Technology', 'Platform for containerizing applications for consistent deployment.', 70),
('Flutter',           'Technology', 'Google UI toolkit for building natively compiled mobile apps.', 68),
('Vue.js',            'Technology', 'Progressive JavaScript framework for building user interfaces.', 65),
('MongoDB',           'Technology', 'NoSQL database for storing flexible, JSON-like documents.', 63),
('AWS',               'Technology', 'Amazon Web Services cloud computing platform.', 62),
('Android Development','Technology','Building native apps for Android using Kotlin or Java.', 60),
('iOS Development',   'Technology', 'Building native apps for Apple devices using Swift.', 58),
('Cybersecurity',     'Technology', 'Protecting systems and networks from digital attacks.', 57),
('Data Analysis',     'Technology', 'Analyzing data to uncover trends and insights using tools like pandas.', 55),
('UI/UX Design',      'Design',     'Designing user-friendly interfaces and seamless digital experiences.', 72),
-- Design
('Figma',             'Design', 'Collaborative interface design tool for UI/UX prototyping.', 70),
('Graphic Design',    'Design', 'Visual communication through typography, color, and imagery.', 68),
('Adobe Photoshop',   'Design', 'Industry-standard software for photo editing and digital art.', 65),
('Adobe Illustrator', 'Design', 'Vector graphics editor for logos, icons, and illustrations.', 62),
('Motion Graphics',   'Design', 'Animated graphic design for videos and digital media.', 55),
('Logo Design',       'Design', 'Creating memorable brand identities through visual marks.', 53),
('Video Editing',     'Design', 'Editing raw footage into polished video content.', 60),
('3D Modeling',       'Design', 'Creating three-dimensional objects using software like Blender.', 50),
-- Music
('Guitar',            'Music', 'Acoustic or electric guitar playing from beginner to advanced levels.', 75),
('Piano',             'Music', 'Classical and modern piano techniques for all skill levels.', 72),
('Singing',           'Music', 'Vocal techniques including pitch, tone, and breath control.', 70),
('Music Production',  'Music', 'Creating and producing music using DAWs like Ableton or FL Studio.', 68),
('Drums',             'Music', 'Rhythm and drumming techniques for various music styles.', 60),
('Violin',            'Music', 'Classical string instrument technique and music theory.', 55),
('Music Theory',      'Music', 'Understanding the fundamentals of scales, chords, and harmony.', 58),
('DJ Skills',         'Music', 'Mixing tracks, beatmatching, and live performance techniques.', 52),
-- Language
('English',           'Language', 'English language learning for conversation, writing, and business.', 80),
('Spanish',           'Language', 'One of the most widely spoken languages in the world.', 75),
('French',            'Language', 'The language of diplomacy, culture, and international business.', 68),
('Mandarin Chinese',  'Language', 'The most spoken language in the world by native speakers.', 65),
('German',            'Language', 'Language of engineering, philosophy, and European business.', 60),
('Japanese',          'Language', 'Language and culture of Japan including hiragana and kanji.', 62),
('Arabic',            'Language', 'Spoken by over 400 million people across the Middle East and Africa.', 55),
('Hindi',             'Language', 'Official language of India, spoken by over 500 million people.', 53),
-- Business
('Digital Marketing', 'Business', 'Promoting products and services through digital channels.', 72),
('Public Speaking',   'Business', 'Delivering confident and impactful speeches to audiences.', 68),
('Entrepreneurship',  'Business', 'Starting and running a business from idea to execution.', 65),
('Financial Planning','Business', 'Managing personal or business finances for long-term goals.', 60),
('Project Management','Business', 'Planning, executing, and closing projects on time and budget.', 63),
('Content Writing',   'Business', 'Creating engaging articles, blogs, and marketing copy.', 58),
('SEO',               'Business', 'Optimizing websites to rank higher in search engine results.', 55),
-- Lifestyle & Health
('Yoga',              'Health & Fitness', 'Physical and mental practice combining postures, breathing, and meditation.', 70),
('Fitness Training',  'Health & Fitness', 'Exercise science, workout programming, and personal training.', 68),
('Cooking',           'Lifestyle', 'Preparing delicious meals with techniques from around the world.', 75),
('Photography',       'Lifestyle', 'Capturing moments with composition, lighting, and editing skills.', 70),
('Drawing',           'Arts', 'Sketching and illustration from observational to imaginative art.', 65),
('Painting',          'Arts', 'Expressing creativity through watercolor, acrylic, or oil paints.', 60),
('Chess',             'Lifestyle', 'Strategic board game developing critical thinking and problem solving.', 58),
('Meditation',        'Health & Fitness', 'Mindfulness and meditation practices for mental well-being.', 65),
('Creative Writing',  'Lifestyle', 'Crafting stories, poetry, and scripts with narrative techniques.', 60)

ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  popularity  = VALUES(popularity);

SELECT CONCAT('✅ Seeded ', COUNT(*), ' skills') AS result FROM skills;
