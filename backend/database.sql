-- =============================================
-- SkillSwap Platform - MySQL Database Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS skillswap_db;
USE skillswap_db;

-- =============================================
-- Table: users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bio TEXT,
  location VARCHAR(100),
  profile_picture VARCHAR(255) DEFAULT NULL,
  experience_level ENUM('beginner', 'intermediate', 'expert') DEFAULT 'beginner',
  is_admin TINYINT(1) DEFAULT 0,
  is_blocked TINYINT(1) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  total_exchanges INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- Table: skills
-- =============================================
CREATE TABLE IF NOT EXISTS skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  popularity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: user_skills
-- =============================================
CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_id INT NOT NULL,
  type ENUM('offered', 'wanted') NOT NULL,
  proficiency ENUM('beginner', 'intermediate', 'expert') DEFAULT 'beginner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_skill_type (user_id, skill_id, type)
);

-- =============================================
-- Table: exchange_requests
-- =============================================
CREATE TABLE IF NOT EXISTS exchange_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  recipient_id INT NOT NULL,
  offered_skill_id INT NOT NULL,
  wanted_skill_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
  message TEXT,
  requester_note TEXT,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (offered_skill_id) REFERENCES skills(id),
  FOREIGN KEY (wanted_skill_id) REFERENCES skills(id)
);

-- =============================================
-- Table: messages
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  exchange_id INT,
  content TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exchange_id) REFERENCES exchange_requests(id) ON DELETE SET NULL
);

-- =============================================
-- Table: reviews
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reviewer_id INT NOT NULL,
  reviewee_id INT NOT NULL,
  exchange_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exchange_id) REFERENCES exchange_requests(id) ON DELETE CASCADE,
  UNIQUE KEY unique_review (reviewer_id, exchange_id)
);

-- =============================================
-- Table: notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  reference_id INT,
  reference_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Table: admin_logs
-- =============================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill_id);
CREATE INDEX idx_exchanges_requester ON exchange_requests(requester_id);
CREATE INDEX idx_exchanges_recipient ON exchange_requests(recipient_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_skills_category ON skills(category);

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Admin user (password: Admin@123)
INSERT INTO users (name, email, password, bio, location, experience_level, is_admin) VALUES
('Admin User', 'admin@skillswap.com', '$2b$10$rQZ1.xv4e7U0EqLnCPYFxOqJ5BZ7LZkxKSMH6y3JvXmXgvP9PxBMy', 'Platform Administrator', 'San Francisco, CA', 'expert', 1);

-- Sample users (password: Test@123)
INSERT INTO users (name, email, password, bio, location, experience_level) VALUES
('Alice Johnson', 'alice@example.com', '$2b$10$rQZ1.xv4e7U0EqLnCPYFxOqJ5BZ7LZkxKSMH6y3JvXmXgvP9PxBMy', 'Full-stack developer with 5 years experience. Love teaching React and learning music.', 'New York, NY', 'expert'),
('Bob Smith', 'bob@example.com', '$2b$10$rQZ1.xv4e7U0EqLnCPYFxOqJ5BZ7LZkxKSMH6y3JvXmXgvP9PxBMy', 'Guitarist and music teacher. Looking to learn web development.', 'Austin, TX', 'expert'),
('Carol Davis', 'carol@example.com', '$2b$10$rQZ1.xv4e7U0EqLnCPYFxOqJ5BZ7LZkxKSMH6y3JvXmXgvP9PxBMy', 'Graphic designer specializing in UI/UX. Want to learn Python.', 'Los Angeles, CA', 'intermediate'),
('David Lee', 'david@example.com', '$2b$10$rQZ1.xv4e7U0EqLnCPYFxOqJ5BZ7LZkxKSMH6y3JvXmXgvP9PxBMy', 'Data scientist who loves cooking. Looking for a language tutor.', 'Chicago, IL', 'expert'),
('Emma Wilson', 'emma@example.com', '$2b$10$rQZ1.xv4e7U0EqLnCPYFxOqJ5BZ7LZkxKSMH6y3JvXmXgvP9PxBMy', 'Spanish language teacher. Interested in photography and yoga.', 'Miami, FL', 'expert');

-- Skills
INSERT INTO skills (name, category, description, popularity) VALUES
('React.js', 'Technology', 'Frontend JavaScript library for building user interfaces', 95),
('Node.js', 'Technology', 'Server-side JavaScript runtime', 88),
('Python', 'Technology', 'General-purpose programming language', 92),
('Machine Learning', 'Technology', 'AI and ML concepts and implementation', 85),
('Guitar', 'Music', 'Acoustic and electric guitar playing', 78),
('Piano', 'Music', 'Classical and contemporary piano', 72),
('Spanish', 'Language', 'Spanish language - all levels', 80),
('French', 'Language', 'French language - all levels', 65),
('UI/UX Design', 'Design', 'User interface and experience design', 88),
('Photoshop', 'Design', 'Adobe Photoshop for image editing', 75),
('Photography', 'Arts', 'Digital photography and editing', 70),
('Yoga', 'Health & Fitness', 'Yoga and mindfulness practices', 68),
('Cooking', 'Lifestyle', 'International cuisine and cooking techniques', 82),
('Data Science', 'Technology', 'Data analysis and visualization', 87),
('JavaScript', 'Technology', 'JavaScript programming language', 90);

-- UserSkills
INSERT INTO user_skills (user_id, skill_id, type, proficiency) VALUES
(2, 1, 'offered', 'expert'),   -- Alice offers React
(2, 2, 'offered', 'expert'),   -- Alice offers Node.js
(2, 5, 'wanted', 'beginner'),  -- Alice wants Guitar
(3, 5, 'offered', 'expert'),   -- Bob offers Guitar
(3, 6, 'offered', 'intermediate'), -- Bob offers Piano
(3, 1, 'wanted', 'beginner'),  -- Bob wants React
(4, 9, 'offered', 'expert'),   -- Carol offers UI/UX
(4, 10, 'offered', 'expert'),  -- Carol offers Photoshop
(4, 3, 'wanted', 'beginner'),  -- Carol wants Python
(5, 14, 'offered', 'expert'),  -- David offers Data Science
(5, 3, 'offered', 'expert'),   -- David offers Python
(5, 7, 'wanted', 'beginner'),  -- David wants Spanish
(6, 7, 'offered', 'expert'),   -- Emma offers Spanish
(6, 8, 'offered', 'intermediate'), -- Emma offers French
(6, 11, 'wanted', 'beginner'), -- Emma wants Photography
(6, 12, 'wanted', 'beginner'); -- Emma wants Yoga

-- Exchange Requests
INSERT INTO exchange_requests (requester_id, recipient_id, offered_skill_id, wanted_skill_id, status, message) VALUES
(2, 3, 1, 5, 'accepted', 'Hi Bob! I would love to learn guitar from you. I can teach you React in return!'),
(5, 6, 3, 7, 'pending', 'Hello Emma, I can teach you Python and Data Science if you teach me Spanish!'),
(3, 2, 5, 2, 'completed', 'Alice, would you like to exchange guitar lessons for Node.js?');

-- Reviews
INSERT INTO reviews (reviewer_id, reviewee_id, exchange_id, rating, comment) VALUES
(2, 3, 3, 5, 'Bob is an amazing guitar teacher! Very patient and knowledgeable. Highly recommend!'),
(3, 2, 3, 5, 'Alice is fantastic! She explained Node.js concepts clearly. Great exchange!');

-- Update ratings
UPDATE users SET rating = 5.00, total_reviews = 1, total_exchanges = 1 WHERE id IN (2, 3);

-- Messages
INSERT INTO messages (sender_id, receiver_id, exchange_id, content) VALUES
(2, 3, 1, 'Hey Bob! Looking forward to our skill exchange. When are you available?'),
(3, 2, 1, 'Hi Alice! I am free on weekends. How about Saturday afternoons?'),
(2, 3, 1, 'Perfect! Saturday at 2 PM works great for me!');

-- Notifications
INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type) VALUES
(3, 'exchange_request', 'New Exchange Request', 'Alice Johnson wants to exchange React.js for Guitar lessons', 1, 'exchange'),
(6, 'exchange_request', 'New Exchange Request', 'David Lee wants to exchange Python for Spanish lessons', 2, 'exchange'),
(2, 'message', 'New Message', 'Bob Smith sent you a message', 1, 'exchange');
