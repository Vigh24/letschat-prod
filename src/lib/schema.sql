-- ============================================================
-- NexusSupport — Supabase PostgreSQL Schema (Step 1)
-- ============================================================
-- ARCHITECTURE DECISIONS:
--   • UUIDs (gen_random_uuid()) for all PKs — enables safe
--     client-side optimistic inserts without ID collision.
--   • organization_id on every tenant table — supports true
--     multi-tenant isolation via RLS (no separate schemas).
--   • JSONB for config/metadata — flexible without migrations
--     for per-channel or per-integration settings.
--   • Postgres ENUM types for finite state machines — enforces
--     valid state transitions at the DB level.
--   • updated_at auto-managed via trigger — denormalized for
--     fast "last activity" queries on the inbox view.
--   • Row Level Security on every table — SECURITY FIRST.
--     No table is accessible without explicit policies.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy text search on messages
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- multilingual search normalization
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() (pre-pg14 compat)

-- ── Custom ENUM Types ─────────────────────────────────────────
-- Using enums for finite-state values improves:
--   1. Query performance (int comparison internally)
--   2. Data integrity (invalid states rejected at DB level)
--   3. Clarity in application code

CREATE TYPE user_role AS ENUM ('admin', 'agent', 'supervisor');
CREATE TYPE conversation_status AS ENUM ('open', 'pending', 'resolved', 'snoozed');
CREATE TYPE channel_type AS ENUM ('web_widget', 'email', 'whatsapp', 'instagram', 'api');
CREATE TYPE message_type AS ENUM ('incoming', 'outgoing', 'activity', 'ai_suggestion');
CREATE TYPE message_status AS ENUM ('sending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE priority_level AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE intent_category AS ENUM (
  'billing_inquiry', 'technical_support', 'account_management',
  'general_query', 'complaint', 'sales_inquiry', 'refund_request', 'unknown'
);
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'enterprise');

-- ── Helper: auto-update updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- TABLE: organizations
-- The root tenant entity. All other tables reference this.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,                    -- subdomain: acme.nexussupport.io
  plan            plan_tier NOT NULL DEFAULT 'free',
  settings        JSONB NOT NULL DEFAULT '{
    "ai_enabled": true,
    "widget_color": "#6366f1",
    "widget_position": "bottom-right",
    "business_hours": {"start": "09:00", "end": "18:00", "timezone": "UTC"},
    "auto_assignment": false
  }'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: users
-- Agents/admins. Linked to Supabase Auth via auth.users.id.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  avatar_url        TEXT,
  role              user_role NOT NULL DEFAULT 'agent',
  is_online         BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Availability for auto-assignment (max concurrent conversations)
  max_conversations INT NOT NULL DEFAULT 10,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Compound index: org lookup is always the first filter
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_online ON users(organization_id, is_online) WHERE is_online = TRUE;

-- ═══════════════════════════════════════════════════════════════
-- TABLE: contacts
-- External customers/end-users (not agents).
-- One contact can have conversations across multiple channels.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT,
  phone           TEXT,
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  -- Flexible bag for CRM data: city, account_tier, custom fields
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email),                         -- no duplicate contacts per org
  UNIQUE(organization_id, phone)
);

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_contacts_org ON contacts(organization_id);
-- GIN index for fast JSONB metadata queries (e.g., account_tier filters)
CREATE INDEX idx_contacts_metadata ON contacts USING GIN(metadata);
-- Trigram index for contact search by name/email
CREATE INDEX idx_contacts_name_trgm ON contacts USING GIN(full_name gin_trgm_ops);
CREATE INDEX idx_contacts_email_trgm ON contacts USING GIN(email gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: channels
-- Represents a configured integration (one WhatsApp number,
-- one email inbox, one widget instance, etc.)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  channel_type    channel_type NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  -- Encrypted secrets should be handled via Vault; non-secret config here
  config          JSONB NOT NULL DEFAULT '{}',
  -- Webhook URL for outbound delivery (WhatsApp/Email providers)
  webhook_secret  TEXT,                                   -- HMAC signature verification
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_channels_org ON channels(organization_id);
CREATE INDEX idx_channels_type ON channels(organization_id, channel_type);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: conversations
-- The core entity linking a contact ↔ channel ↔ agent.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id            UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel_id            UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  assigned_agent_id     UUID REFERENCES users(id) ON DELETE SET NULL,

  status                conversation_status NOT NULL DEFAULT 'open',
  priority              priority_level NOT NULL DEFAULT 'medium',
  subject               TEXT,                             -- email subject / widget page title

  -- AI-enriched fields (populated async by the FastAPI microservice)
  intent                intent_category,
  sentiment_score       NUMERIC(4,3) CHECK (sentiment_score BETWEEN -1.0 AND 1.0),

  -- SLA tracking
  first_response_at     TIMESTAMPTZ,                      -- NULL until first agent reply
  resolved_at           TIMESTAMPTZ,
  snoozed_until         TIMESTAMPTZ,

  -- Searchable tags (e.g., ['billing', 'refund', 'urgent'])
  tags                  TEXT[] NOT NULL DEFAULT '{}',

  -- Flexible bag for channel-specific metadata
  metadata              JSONB NOT NULL DEFAULT '{}',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Primary inbox query: org + status + priority, sorted by updated_at
CREATE INDEX idx_conversations_inbox ON conversations(
  organization_id, status, priority DESC, updated_at DESC
);
-- Assignment routing queries
CREATE INDEX idx_conversations_agent ON conversations(assigned_agent_id)
  WHERE assigned_agent_id IS NOT NULL;
-- Tag search using GIN (supports @> operator for array containment)
CREATE INDEX idx_conversations_tags ON conversations USING GIN(tags);
-- Full-text search on subject
CREATE INDEX idx_conversations_subject_trgm ON conversations USING GIN(subject gin_trgm_ops);
-- Snoozed conversations for the wakeup scheduler (Supabase cron)
CREATE INDEX idx_conversations_snoozed ON conversations(snoozed_until)
  WHERE snoozed_until IS NOT NULL AND status = 'snoozed';

-- ═══════════════════════════════════════════════════════════════
-- TABLE: messages
-- Immutable (append-only in practice). Each row is one message.
-- This is the hot path — subscribed to via Supabase Realtime.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- sender_id is NULL for incoming contact messages
  -- (contacts are not Supabase auth users)
  sender_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('agent', 'contact', 'bot', 'system')),
  message_type      message_type NOT NULL DEFAULT 'incoming',

  content           TEXT NOT NULL,
  status            message_status NOT NULL DEFAULT 'sent',

  -- Stored as JSONB array of {id, file_name, file_size, content_type, url}
  attachments       JSONB NOT NULL DEFAULT '[]',

  -- AI-enriched + channel-specific metadata
  metadata          JSONB NOT NULL DEFAULT '{}',

  -- Tracks whether this message has been processed by the AI microservice
  -- Used for idempotency in the async processing queue
  ai_processed      BOOLEAN NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Primary Realtime filter — conversation_id=eq.{id} uses this index
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
-- AI processing queue: find unprocessed messages
CREATE INDEX idx_messages_ai_queue ON messages(ai_processed, created_at ASC)
  WHERE ai_processed = FALSE;
-- Full-text search across message content
CREATE INDEX idx_messages_content_fts ON messages
  USING GIN(to_tsvector('english', content));

-- ── Trigger: update conversation.updated_at on new message ───
-- Ensures the inbox stays correctly sorted without a JOIN
CREATE OR REPLACE FUNCTION sync_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    updated_at = NOW(),
    -- Auto-set first_response_at for the first outgoing agent message
    first_response_at = CASE
      WHEN NEW.sender_type = 'agent'
       AND first_response_at IS NULL
      THEN NOW()
      ELSE first_response_at
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER messages_sync_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION sync_conversation_on_message();

-- ═══════════════════════════════════════════════════════════════
-- TABLE: ai_suggestions
-- Stores AI Copilot output per message draft.
-- Decoupled from messages to keep message table lean.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE ai_suggestions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_draft    TEXT NOT NULL,
  rephrased         TEXT NOT NULL,
  alternatives      TEXT[] NOT NULL DEFAULT '{}',
  tone_applied      TEXT NOT NULL,
  intent_detected   intent_category,
  confidence_score  NUMERIC(5,4),
  -- True if agent actually used this suggestion
  was_accepted      BOOLEAN,
  processing_time_ms INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_suggestions_conv ON ai_suggestions(conversation_id);
CREATE INDEX idx_ai_suggestions_agent ON ai_suggestions(agent_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────
-- DESIGN PRINCIPLE:
--   All RLS policies use auth.uid() (the Supabase Auth JWT sub)
--   to derive the agent's organization_id from the users table.
--   This single join is the ONLY security boundary — no client
--   can read data outside their organization.
--
--   NEVER expose organization_id in the JWT custom claims for
--   RLS enforcement — JWTs can be tampered with if the secret
--   is ever rotated incorrectly. Always derive from the DB.
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables (default-deny)
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions   ENABLE ROW LEVEL SECURITY;

-- ── Helper function: get the current agent's org ──────────────
-- STABLE + SECURITY DEFINER: called once per query, not per row.
-- This is the key optimization — avoids N+1 lookups in policies.
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Helper function: check if current user is admin ───────────
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── organizations ─────────────────────────────────────────────
-- Agents can only see their own organization
CREATE POLICY "org_read_own" ON organizations
  FOR SELECT USING (id = current_user_org_id());

-- Only admins can update org settings
CREATE POLICY "org_update_admin" ON organizations
  FOR UPDATE USING (id = current_user_org_id() AND current_user_is_admin());

-- ── users ─────────────────────────────────────────────────────
-- All agents in the same org can see each other (for assignment UI)
CREATE POLICY "users_read_own_org" ON users
  FOR SELECT USING (organization_id = current_user_org_id());

-- Agents can update their own record (avatar, online status)
CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());

-- Admins can update any user in their org
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (organization_id = current_user_org_id() AND current_user_is_admin());

-- Admins can insert new users (agent invite flow)
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (organization_id = current_user_org_id() AND current_user_is_admin());

-- ── contacts ──────────────────────────────────────────────────
CREATE POLICY "contacts_crud_own_org" ON contacts
  FOR ALL USING (organization_id = current_user_org_id());

-- ── channels ──────────────────────────────────────────────────
CREATE POLICY "channels_read_own_org" ON channels
  FOR SELECT USING (organization_id = current_user_org_id());

-- Only admins can create/modify channel integrations
CREATE POLICY "channels_write_admin" ON channels
  FOR INSERT WITH CHECK (organization_id = current_user_org_id() AND current_user_is_admin());

CREATE POLICY "channels_update_admin" ON channels
  FOR UPDATE USING (organization_id = current_user_org_id() AND current_user_is_admin());

-- ── conversations ─────────────────────────────────────────────
CREATE POLICY "conversations_read_own_org" ON conversations
  FOR SELECT USING (organization_id = current_user_org_id());

-- Any agent in the org can create conversations (e.g., outbound)
CREATE POLICY "conversations_insert_own_org" ON conversations
  FOR INSERT WITH CHECK (organization_id = current_user_org_id());

-- Agents can update any conversation in their org
-- (assignment, status changes are collaborative)
CREATE POLICY "conversations_update_own_org" ON conversations
  FOR UPDATE USING (organization_id = current_user_org_id());

-- ── messages ──────────────────────────────────────────────────
-- Messages are read if the parent conversation is in the agent's org
-- This policy uses a subquery — the planner uses idx_conversations_inbox
CREATE POLICY "messages_read_own_org" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE organization_id = current_user_org_id()
    )
  );

-- Agents can insert messages (sending a reply)
CREATE POLICY "messages_insert_agent" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE organization_id = current_user_org_id()
    )
    AND sender_type IN ('agent', 'bot', 'system') -- contacts insert via service_role webhook
  );

-- Agents can update message status (read receipts, failed retries)
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid()
    OR conversation_id IN (
      SELECT id FROM conversations WHERE organization_id = current_user_org_id()
    )
  );

-- ── ai_suggestions ────────────────────────────────────────────
CREATE POLICY "ai_suggestions_own_org" ON ai_suggestions
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE organization_id = current_user_org_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- REALTIME PUBLICATIONS
-- Supabase Realtime uses logical replication publications.
-- We publish only the tables/columns needed by clients,
-- minimizing replication overhead and data exposure.
-- ═══════════════════════════════════════════════════════════════

-- Remove default supabase_realtime publication if exists
-- ALTER PUBLICATION supabase_realtime DROP TABLE ...;

-- Publish messages (primary Realtime consumer)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Publish conversations (for inbox list updates)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Publish user presence (online/offline status)
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — Development Only
-- Run ONLY in development environments.
-- ═══════════════════════════════════════════════════════════════

-- Note: In production, organizations are created via the
-- registration flow which calls a SECURITY DEFINER function
-- to atomically create the org + admin user.

/*
INSERT INTO organizations (name, slug, plan) VALUES
  ('Acme Corp Support', 'acme-corp', 'pro');

-- Insert via Supabase Auth, then:
INSERT INTO users (id, organization_id, email, full_name, role) VALUES
  (auth.uid(), (SELECT id FROM organizations WHERE slug = 'acme-corp'),
   'admin@acme.com', 'Priya Sharma', 'admin');
*/
