-- ZuzuMusic database. Run in Neon SQL editor.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS zm_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS zm_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES zm_users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  artist_name text NOT NULL CHECK (char_length(artist_name) BETWEEN 1 AND 60),
  storage_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  expected_bytes bigint NOT NULL CHECK (expected_bytes > 0 AND expected_bytes <= 26214400),
  actual_bytes bigint,
  duration_seconds integer,
  rights_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS zm_tracks_status_created_idx ON zm_tracks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS zm_tracks_creator_created_idx ON zm_tracks(creator_id, created_at DESC);
