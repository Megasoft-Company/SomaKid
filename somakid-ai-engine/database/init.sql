-- =============================================================================
-- SOMAKID AI Engine - Database Initialization Script
-- Creates tables for users, children, discoveries, quiz results, messages,
-- learning paths, units, lessons, exercises, and child progression.
-- Inspired by Duolingo's gamified learning structure.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Users Table (Parents/Teachers/Admins)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMPTZ,
    password_hash VARCHAR(255) NOT NULL,
    language VARCHAR(5) DEFAULT 'fr',
    country VARCHAR(5) DEFAULT 'CD',
    role VARCHAR(20) DEFAULT 'parent' CHECK (role IN ('parent', 'teacher', 'admin')),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =============================================================================
-- Children Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    age SMALLINT NOT NULL CHECK (age BETWEEN 3 AND 15),
    avatar VARCHAR(5) DEFAULT '🦁',
    pin_hash VARCHAR(255) NOT NULL,
    language VARCHAR(5) DEFAULT 'fr',
    total_points INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]',
    quizzes_completed INTEGER DEFAULT 0,
    species_discovered TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for parent-child lookups
CREATE INDEX idx_children_parent ON children(parent_id);
CREATE INDEX idx_children_active ON children(is_active);

-- =============================================================================
-- Species Discoveries Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS species_discoveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    species_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) DEFAULT 'other',
    description TEXT,
    image_path VARCHAR(500),
    points_earned INTEGER DEFAULT 10,
    ai_data JSONB,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, species_name)
);

-- Index for discovery lookups
CREATE INDEX idx_discoveries_child ON species_discoveries(child_id);
CREATE INDEX idx_discoveries_category ON species_discoveries(category);
CREATE INDEX idx_discoveries_date ON species_discoveries(discovered_at);

-- =============================================================================
-- Quiz Results Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    difficulty_level SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
    question_data JSONB NOT NULL,
    chosen_answer SMALLINT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_earned INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    language VARCHAR(5) DEFAULT 'fr',
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quiz statistics
CREATE INDEX idx_quiz_child ON quiz_results(child_id);
CREATE INDEX idx_quiz_subject ON quiz_results(subject);
CREATE INDEX idx_quiz_correct ON quiz_results(is_correct);
CREATE INDEX idx_quiz_date ON quiz_results(completed_at);

-- =============================================================================
-- Chat Messages Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    points_earned INTEGER DEFAULT 0,
    badge_unlocked VARCHAR(100),
    activity_suggestion TEXT,
    metadata JSONB,
    language VARCHAR(5) DEFAULT 'fr',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for chat history retrieval
CREATE INDEX idx_chat_session ON chat_messages(session_id);
CREATE INDEX idx_chat_child ON chat_messages(child_id);
CREATE INDEX idx_chat_date ON chat_messages(created_at);

-- =============================================================================
-- AI Request Logs Table (for monitoring and cost tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100),
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    request_type VARCHAR(50) NOT NULL,
    model_used VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    latency_ms FLOAT,
    cost_estimate FLOAT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for AI usage analytics
CREATE INDEX idx_ai_logs_type ON ai_request_logs(request_type);
CREATE INDEX idx_ai_logs_date ON ai_request_logs(created_at);
CREATE INDEX idx_ai_logs_success ON ai_request_logs(success);

-- =============================================================================
-- LEARNING PATHS (Parcours de formation)
-- Inspired by Duolingo's structured learning paths
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name JSONB NOT NULL,
    description JSONB NOT NULL,
    emoji VARCHAR(5) DEFAULT '🌿',
    color VARCHAR(7) DEFAULT '#2D9B6E',
    icon_url VARCHAR(500),
    total_units INTEGER DEFAULT 5 CHECK (total_units BETWEEN 1 AND 10),
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for learning paths
CREATE INDEX idx_learning_paths_slug ON learning_paths(slug);
CREATE INDEX idx_learning_paths_published ON learning_paths(is_published);

-- =============================================================================
-- UNITS (Unités d'apprentissage)
-- =============================================================================
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    name JSONB NOT NULL,
    description JSONB NOT NULL,
    unit_number INTEGER NOT NULL CHECK (unit_number BETWEEN 1 AND 10),
    total_lessons INTEGER DEFAULT 4 CHECK (total_lessons BETWEEN 1 AND 10),
    required_score INTEGER DEFAULT 70 CHECK (required_score BETWEEN 0 AND 100),
    is_locked BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(path_id, unit_number)
);

-- Index for units
CREATE INDEX idx_units_path ON units(path_id);
CREATE INDEX idx_units_number ON units(path_id, unit_number);

-- =============================================================================
-- LESSONS (Leçons)
-- =============================================================================
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    title JSONB NOT NULL,
    content JSONB NOT NULL,
    summary JSONB,
    lesson_type VARCHAR(30) DEFAULT 'theory' CHECK (lesson_type IN ('theory', 'practice', 'review', 'exam')),
    key_points JSONB DEFAULT '[]',
    vocabulary JSONB DEFAULT '[]',
    fun_fact JSONB,
    practical_tip JSONB,
    emoji VARCHAR(5) DEFAULT '📚',
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_minutes INTEGER DEFAULT 5 CHECK (estimated_minutes BETWEEN 1 AND 60),
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, order_index)
);

-- Index for lessons
CREATE INDEX idx_lessons_unit ON lessons(unit_id);
CREATE INDEX idx_lessons_type ON lessons(lesson_type);

-- =============================================================================
-- EXERCISES (Exercices dans une leçon)
-- =============================================================================
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    exercise_type VARCHAR(30) NOT NULL CHECK (exercise_type IN (
        'fill_blank', 'matching', 'multiple_choice',
        'true_false', 'open_question', 'image_identification'
    )),
    question JSONB NOT NULL,
    options JSONB,
    correct_answer JSONB NOT NULL,
    explanation JSONB NOT NULL,
    keywords JSONB DEFAULT '[]',
    points INTEGER DEFAULT 5 CHECK (points BETWEEN 1 AND 100),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, order_index)
);

-- Index for exercises
CREATE INDEX idx_exercises_lesson ON exercises(lesson_id);
CREATE INDEX idx_exercises_type ON exercises(exercise_type);

-- =============================================================================
-- CHILD LEARNING PROGRESS (Progression d'apprentissage)
-- =============================================================================
CREATE TABLE IF NOT EXISTS child_learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    score INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    time_spent_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, lesson_id)
);

-- Index for learning progress
CREATE INDEX idx_progress_child ON child_learning_progress(child_id);
CREATE INDEX idx_progress_path ON child_learning_progress(child_id, path_id);
CREATE INDEX idx_progress_unit ON child_learning_progress(child_id, unit_id);
CREATE INDEX idx_progress_completed ON child_learning_progress(child_id, is_completed);

-- =============================================================================
-- UNIT TESTS (Tests de validation d'unité)
-- =============================================================================
CREATE TABLE IF NOT EXISTS unit_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    title JSONB NOT NULL,
    questions_data JSONB NOT NULL,
    passing_score INTEGER DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
    score INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    passed BOOLEAN DEFAULT false,
    attempt_count INTEGER DEFAULT 0 CHECK (attempt_count >= 0),
    time_spent_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, unit_id, attempt_count)
);

-- Index for unit tests
CREATE INDEX idx_unit_tests_child ON unit_tests(child_id);
CREATE INDEX idx_unit_tests_unit ON unit_tests(unit_id);
CREATE INDEX idx_unit_tests_passed ON unit_tests(child_id, passed);

-- =============================================================================
-- CHILD STREAK (Suivi de la régularité quotidienne)
-- =============================================================================
CREATE TABLE IF NOT EXISTS child_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    total_days_active INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id)
);

-- Index for streaks
CREATE INDEX idx_streaks_child ON child_streaks(child_id);

-- =============================================================================
-- CERTIFICATES (Certificats de réussite)
-- =============================================================================
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    certificate_type VARCHAR(30) DEFAULT 'completion' CHECK (certificate_type IN ('completion', 'excellence', 'speed', 'perfect')),
    title JSONB NOT NULL,
    score INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    grade VARCHAR(2) DEFAULT 'C' CHECK (grade IN ('A', 'B', 'C', 'D', 'F', 'A+', 'S')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, path_id, certificate_type)
);

-- Index for certificates
CREATE INDEX idx_certificates_child ON certificates(child_id);
CREATE INDEX idx_certificates_path ON certificates(path_id);

-- =============================================================================
-- Insert Default Learning Paths
-- =============================================================================
INSERT INTO learning_paths (slug, name, description, emoji, color, total_units, order_index) VALUES
(
    'biodiversity',
    '{"fr": "Biodiversité", "en": "Biodiversity", "ln": "Biodiversite", "sw": "Bioanuwai"}',
    '{"fr": "Découvre la richesse de la faune et la flore africaine", "en": "Discover the richness of African wildlife and flora", "ln": "Découvrir richesse ya bikelamu mpe banzete ya Afrique", "sw": "Gundua utajiri wa wanyama na mimea ya Afrika"}',
    '🌿', '#2D9B6E', 5, 0
),
(
    'climate',
    '{"fr": "Climat", "en": "Climate", "ln": "Climat", "sw": "Hali ya Hewa"}',
    '{"fr": "Comprends le changement climatique et ses impacts", "en": "Understand climate change and its impacts", "ln": "Comprendre changement climatique mpe ba impacts na yango", "sw": "Elewa mabadiliko ya hali ya hewa na athari zake"}',
    '🌍', '#1B6CA8', 5, 1
),
(
    'disasters',
    '{"fr": "Catastrophes Naturelles", "en": "Natural Disasters", "ln": "Ba Likama ya Mbula", "sw": "Majanga ya Asili"}',
    '{"fr": "Apprends à reconnaître et te protéger des catastrophes", "en": "Learn to recognize and protect yourself from disasters", "ln": "Yekola koyeba mpe komibatela na ba likama", "sw": "Jifunze kutambua na kujikinga dhidi ya majanga"}',
    '⛈️', '#C0392B', 5, 2
),
(
    'behaviors',
    '{"fr": "Éco-Gestes", "en": "Eco-Behaviors", "ln": "Bizaleli ya Malamu", "sw": "Tabia za Kiikolojia"}',
    '{"fr": "Adopte les bons gestes pour protéger la planète", "en": "Adopt the right actions to protect the planet", "ln": "Zwa bizaleli ya malamu po na kobatela planete", "sw": "Chukua hatua nzuri kulinda sayari"}',
    '♻️', '#8B5CF6', 5, 3
)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- Trigger: Update updated_at timestamp automatically
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at column
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at
    BEFORE UPDATE ON learning_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at
    BEFORE UPDATE ON units
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_learning_progress_updated_at
    BEFORE UPDATE ON child_learning_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_streaks_updated_at
    BEFORE UPDATE ON child_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Function: Update child streak on activity
-- =============================================================================
CREATE OR REPLACE FUNCTION update_child_streak()
RETURNS TRIGGER AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_streak_record RECORD;
BEGIN
    SELECT * INTO v_streak_record
    FROM child_streaks
    WHERE child_id = NEW.child_id;

    IF NOT FOUND THEN
        INSERT INTO child_streaks (child_id, current_streak, longest_streak, last_activity_date, total_days_active)
        VALUES (NEW.child_id, 1, 1, v_today, 1);
    ELSE
        IF v_streak_record.last_activity_date = v_yesterday THEN
            UPDATE child_streaks
            SET current_streak = current_streak + 1,
                longest_streak = GREATEST(longest_streak, current_streak + 1),
                last_activity_date = v_today,
                total_days_active = total_days_active + 1
            WHERE child_id = NEW.child_id;
        ELSIF v_streak_record.last_activity_date = v_today THEN
            UPDATE child_streaks
            SET last_activity_date = v_today
            WHERE child_id = NEW.child_id;
        ELSE
            UPDATE child_streaks
            SET current_streak = 1,
                last_activity_date = v_today,
                total_days_active = total_days_active + 1
            WHERE child_id = NEW.child_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply streak trigger to progress and quiz tables
CREATE TRIGGER update_streak_on_lesson_complete
    AFTER INSERT ON child_learning_progress
    FOR EACH ROW
    WHEN (NEW.is_completed = true)
    EXECUTE FUNCTION update_child_streak();

CREATE TRIGGER update_streak_on_quiz_complete
    AFTER INSERT ON quiz_results
    FOR EACH ROW
    EXECUTE FUNCTION update_child_streak();

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO somakid;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO somakid;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO somakid;