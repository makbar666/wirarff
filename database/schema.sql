-- Jalankan pada branch Neon yang sama dengan Auth URL aplikasi.
CREATE TABLE IF NOT EXISTS management_members (
    user_id text PRIMARY KEY,
    display_name text NOT NULL,
    enabled boolean NOT NULL DEFAULT true
);
REVOKE ALL ON management_members FROM PUBLIC;
ALTER TABLE management_members ENABLE ROW LEVEL SECURITY;
