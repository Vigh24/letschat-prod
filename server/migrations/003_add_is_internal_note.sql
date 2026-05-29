-- Migration 003: Add is_internal_note to messages table
-- Run this in your Supabase SQL Editor to support internal chat notes

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal_note BOOLEAN NOT NULL DEFAULT FALSE;
