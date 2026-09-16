CREATE TABLE IF NOT EXISTS migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS visitors (id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days');
CREATE TABLE IF NOT EXISTS messages (id bigserial PRIMARY KEY, visitor_id uuid NOT NULL REFERENCES visitors ON DELETE CASCADE, role text NOT NULL CHECK(role IN ('user','assistant')), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS messages_visitor ON messages(visitor_id,id);
CREATE TABLE IF NOT EXISTS leads (id uuid PRIMARY KEY, visitor_id uuid REFERENCES visitors ON DELETE SET NULL, request_key uuid UNIQUE NOT NULL, name text NOT NULL, company text NOT NULL DEFAULT '', contact text NOT NULL, channel text NOT NULL, services text[] NOT NULL, brief text NOT NULL DEFAULT '', stage text NOT NULL DEFAULT 'new', next_action text NOT NULL DEFAULT '', due_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS consent_events (id bigserial PRIMARY KEY, lead_id uuid NOT NULL REFERENCES leads ON DELETE CASCADE, kind text NOT NULL, granted boolean NOT NULL, version text NOT NULL, document_hash text NOT NULL, document_text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS activities (id bigserial PRIMARY KEY, lead_id uuid REFERENCES leads ON DELETE CASCADE, actor text NOT NULL, kind text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS admins (id uuid PRIMARY KEY, login text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES admins ON DELETE CASCADE, expires_at timestamptz NOT NULL DEFAULT now()+interval '8 hours');
CREATE TABLE IF NOT EXISTS admin_audit (id bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL, target text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS ai_usage (id uuid PRIMARY KEY, visitor_id uuid REFERENCES visitors ON DELETE SET NULL, status text NOT NULL, reserved_usd numeric(12,6) NOT NULL DEFAULT 0, charged_usd numeric(12,6) NOT NULL DEFAULT 0, input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS ai_usage_time ON ai_usage(created_at);
INSERT INTO migrations(id) VALUES('001_initial') ON CONFLICT DO NOTHING;

ALTER TABLE ai_usage ALTER COLUMN visitor_id DROP NOT NULL;
ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_visitor_id_fkey;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_visitor_id_fkey FOREIGN KEY(visitor_id) REFERENCES visitors(id) ON DELETE SET NULL;
