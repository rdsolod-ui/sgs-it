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

CREATE TABLE IF NOT EXISTS lead_audits (
 lead_id uuid PRIMARY KEY REFERENCES leads ON DELETE CASCADE,
 document jsonb NOT NULL,
 version integer NOT NULL CHECK(version>0),
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO migrations(id) VALUES('002_lead_audits') ON CONFLICT DO NOTHING;

-- Additive migration: the previous runtime can still read/write existing tables.
CREATE TABLE IF NOT EXISTS sales_dialogues (
 visitor_id uuid PRIMARY KEY REFERENCES visitors ON DELETE CASCADE,
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_context jsonb;
INSERT INTO migrations(id) VALUES('003_sales_dialogue') ON CONFLICT DO NOTHING;

-- 004: bounded source snapshots and a durable outbox without copied contacts.
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS telegram_verified boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS visitor_sources (
 visitor_id uuid PRIMARY KEY REFERENCES visitors ON DELETE CASCADE,
 first_touch jsonb NOT NULL,
 last_touch jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS attribution jsonb;
CREATE TABLE IF NOT EXISTS notification_outbox (
 id uuid PRIMARY KEY,
 lead_id uuid REFERENCES leads ON DELETE SET NULL,
 event text NOT NULL DEFAULT 'lead.created.v1',
 operation text NOT NULL DEFAULT 'send' CHECK(operation IN ('send','delete')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','leased','sending','retry','sent','failed','uncertain','cancelled','deleted')),
 target_chat text NOT NULL,
 bot_id text NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,
 lease_until timestamptz,
 message_id bigint,
 error_code text,
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(lead_id,event)
);
CREATE INDEX IF NOT EXISTS notification_outbox_due ON notification_outbox(next_attempt_at,created_at) WHERE status IN ('pending','retry');
CREATE INDEX IF NOT EXISTS notification_outbox_leases ON notification_outbox(lease_until) WHERE status IN ('leased','sending');
CREATE TABLE IF NOT EXISTS notification_attempts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 notification_id uuid NOT NULL REFERENCES notification_outbox ON DELETE CASCADE,
 lease_token uuid NOT NULL UNIQUE,
 operation text NOT NULL,
 outcome text NOT NULL DEFAULT 'sending',
 error_code text,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS notification_attempts_notification ON notification_attempts(notification_id);
CREATE TABLE IF NOT EXISTS notification_worker (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 heartbeat_at timestamptz NOT NULL DEFAULT now(),
 error_code text
);
INSERT INTO migrations(id) VALUES('004_attribution_outbox') ON CONFLICT DO NOTHING;
