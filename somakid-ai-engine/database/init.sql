-- =============================================================================
-- SOMAKID AI Engine - Database Initialization Script
-- Creates tables for users, children, discoveries, quiz results, and messages
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
-- Trigger: Update updated_at timestamp automatically
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO somakid;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO somakid;