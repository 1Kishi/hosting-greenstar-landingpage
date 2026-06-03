-- GreenStar — poptávky z kontaktního formuláře (Cloudflare D1)
-- Apply locally:  npx wrangler d1 execute greenstar-leads --local  --file=./schema.sql
-- Apply remote:   npx wrangler d1 execute greenstar-leads --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS leads (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  email          TEXT    NOT NULL,
  phone          TEXT,
  interest       TEXT,
  has_website    INTEGER NOT NULL DEFAULT 0,
  has_domain     INTEGER NOT NULL DEFAULT 0,
  contact_method TEXT,
  message        TEXT,
  gdpr_consent   INTEGER NOT NULL DEFAULT 0,
  status         TEXT    NOT NULL DEFAULT 'new',
  source         TEXT    NOT NULL DEFAULT 'website',
  ip_hash        TEXT,
  user_agent     TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_email      ON leads (email);
