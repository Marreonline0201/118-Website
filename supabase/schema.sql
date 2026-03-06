-- K-Map Circuit Designer - Supabase Schema
-- Run this in the Supabase SQL Editor to create the required tables

-- Create kmap_history table
CREATE TABLE IF NOT EXISTS kmap_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rows INT NOT NULL,
  cols INT NOT NULL,
  cells TEXT NOT NULL,
  sop_result TEXT NOT NULL,
  pos_result TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE kmap_history ENABLE ROW LEVEL SECURITY;

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_kmap_history_user_id ON kmap_history(user_id);
CREATE INDEX IF NOT EXISTS idx_kmap_history_created_at ON kmap_history(created_at DESC);

-- RLS Policy: Users can only see their own history
DROP POLICY IF EXISTS "Users can view own kmap history" ON kmap_history;
CREATE POLICY "Users can view own kmap history" ON kmap_history
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own history
DROP POLICY IF EXISTS "Users can insert own kmap history" ON kmap_history;
CREATE POLICY "Users can insert own kmap history" ON kmap_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own history
DROP POLICY IF EXISTS "Users can delete own kmap history" ON kmap_history;
CREATE POLICY "Users can delete own kmap history" ON kmap_history
  FOR DELETE USING (auth.uid() = user_id);
