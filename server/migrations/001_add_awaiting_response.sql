-- Add 'awaiting_response' to the conversation_status enum
ALTER TYPE conversation_status ADD VALUE IF NOT EXISTS 'awaiting_response';
