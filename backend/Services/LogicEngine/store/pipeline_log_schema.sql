-- =============================================================================
-- AEGIS-FIN — Pipeline Log + User Profiles Schema Extension
-- Run this in Supabase SQL Editor after the main schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Pipeline Log Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_log (
    id          BIGSERIAL   PRIMARY KEY,
    run_at      DATE        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'success',  -- success | partial | failed
    company     TEXT,
    duration_s  NUMERIC(10,1),
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_log_run_at ON pipeline_log (run_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_log_status ON pipeline_log (status);

-- ---------------------------------------------------------------------------
-- User Profiles Table (stores sign-up metadata)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT        NOT NULL,
    role        TEXT        NOT NULL DEFAULT 'analyst',
    interests   JSONB       DEFAULT '[]'::jsonb,
    is_admin    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role  ON user_profiles (role);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_profiles (id, email, role, interests)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'analyst'),
        COALESCE(NEW.raw_user_meta_data->'interests', '[]'::jsonb)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger for user_profiles
CREATE OR REPLACE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- CSV Upload Sessions Table (tracks uploaded CSVs per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS csv_sessions (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name   TEXT        NOT NULL,
    tickers     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    row_count   INT         NOT NULL DEFAULT 0,
    status      TEXT        NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed | cleared
    result      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Required for upsert ON CONFLICT (user_id, file_name)
    CONSTRAINT csv_sessions_user_file_uq UNIQUE (user_id, file_name)
);

CREATE INDEX IF NOT EXISTS idx_csv_sessions_user    ON csv_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csv_sessions_status  ON csv_sessions (status);

CREATE OR REPLACE TRIGGER trg_csv_sessions_updated_at
    BEFORE UPDATE ON csv_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE pipeline_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_sessions   ENABLE ROW LEVEL SECURITY;

-- Pipeline log: readable by all authenticated users
CREATE POLICY "auth_read_pipeline_log"
    ON pipeline_log FOR SELECT
    TO authenticated
    USING (true);

-- User profiles: users can only read/update their own profile
CREATE POLICY "users_own_profile_select"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_own_profile_update"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- CSV sessions: users can only see their own sessions
CREATE POLICY "users_own_csv_sessions"
    ON csv_sessions FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role can do everything (for backend pipeline)
CREATE POLICY "service_role_pipeline_log"
    ON pipeline_log FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "service_role_user_profiles"
    ON user_profiles FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "service_role_csv_sessions"
    ON csv_sessions FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);
