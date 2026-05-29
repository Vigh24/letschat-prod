import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set. Database integration will fail.');
}

// Service role key bypasses RLS policies so we can insert incoming webhooks safely from the backend.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
