import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbrogeflmoiptckqzndl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicm9nZWZsbW9pcHRja3F6bmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTAzMDQsImV4cCI6MjA5MDUyNjMwNH0.LanFukNYndfowjUqBBx_R2n17B7bVzQ12L3tgb59Mrw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
