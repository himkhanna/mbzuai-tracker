-- MBZUAI Tracker — Manual DB Migration Scripts
-- Run with: PGPASSWORD=postgres psql -U postgres -p 5433 -d mbzuai_tracker -f db/migrations.sql
--
-- Hibernate ddl-auto:update adds columns to new tables but may skip existing ones.
-- Run this file any time after pulling changes that add new entity fields.
-- All statements use IF NOT EXISTS / IF EXISTS so they are safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-04-20: Vendor tracking fields on orders
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_platform    VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_order_id    VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_sync_data   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_last_synced TIMESTAMP;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-04-20: Order category (GOODS = physical delivery, SERVICES = skip ingestion)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_category VARCHAR(20) NOT NULL DEFAULT 'GOODS';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-04-20: Runtime-configurable settings (email ingestion, poll interval, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    description TEXT
);

-- 2026-04-21: Processed email tracking (prevents reprocessing when Mail.ReadWrite is missing)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processed_emails (
    id           VARCHAR(36) PRIMARY KEY,
    message_id   VARCHAR(512) NOT NULL UNIQUE,
    subject      VARCHAR(1000),
    processed_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_emails_message_id ON processed_emails(message_id);
