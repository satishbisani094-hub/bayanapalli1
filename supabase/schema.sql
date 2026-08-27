-- ========================================================
-- BAYANAPALLI COMMUNITY SUPABASE DATABASE SCHEMA (FULL MATCH)
-- ========================================================

-- Drop existing tables if re-initializing
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS festivals CASCADE;
DROP TABLE IF EXISTS committee CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- 1. COMMITTEE TABLE
CREATE TABLE committee (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  role TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  "startYear" INTEGER,
  "endYear" INTEGER,
  phone TEXT,
  image TEXT,
  photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FESTIVALS TABLE
CREATE TABLE festivals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  title TEXT,
  year TEXT,
  date TEXT,
  location TEXT,
  description TEXT,
  type TEXT DEFAULT 'cultural',
  "coverImage" TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ALBUMS TABLE
CREATE TABLE albums (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  title TEXT,
  date TEXT,
  year TEXT,
  "festivalId" TEXT,
  description TEXT,
  cover_image TEXT,
  "coverImage" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PHOTOS TABLE
CREATE TABLE photos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "albumId" TEXT,
  album_id TEXT,
  url TEXT NOT NULL,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MILESTONES TABLE
CREATE TABLE milestones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year TEXT,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MESSAGES TABLE
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public all committee" ON committee FOR ALL USING (true);
CREATE POLICY "Public all festivals" ON festivals FOR ALL USING (true);
CREATE POLICY "Public all albums" ON albums FOR ALL USING (true);
CREATE POLICY "Public all photos" ON photos FOR ALL USING (true);
CREATE POLICY "Public all milestones" ON milestones FOR ALL USING (true);
CREATE POLICY "Public all messages" ON messages FOR ALL USING (true);
