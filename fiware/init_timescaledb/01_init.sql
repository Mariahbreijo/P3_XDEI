-- Ensure TimescaleDB extension and tenant schema exist
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create tenant schemas used by QuantumLeap across versions/configurations
CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS mtcommon;

ALTER SCHEMA common OWNER TO postgres;
ALTER SCHEMA mtcommon OWNER TO postgres;

GRANT USAGE, CREATE ON SCHEMA common TO postgres;
GRANT USAGE, CREATE ON SCHEMA mtcommon TO postgres;

-- Create metadata table if missing (QuantumLeap uses md_ets_metadata)
CREATE TABLE IF NOT EXISTS common.md_ets_metadata (
  table_name text PRIMARY KEY,
  entity_attrs jsonb
);

CREATE TABLE IF NOT EXISTS mtcommon.md_ets_metadata (
  table_name text PRIMARY KEY,
  entity_attrs jsonb
);

ALTER TABLE common.md_ets_metadata OWNER TO postgres;
ALTER TABLE mtcommon.md_ets_metadata OWNER TO postgres;
