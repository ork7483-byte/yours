import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gydyupjatmrojjldxpsa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5ZHl1cGphdG1yb2pqbGR4cHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQxOTgsImV4cCI6MjA5MjUxMDE5OH0.bOL1bkYGsMV9e6XT2memQnWxqacalqki5oIcAD_6kpM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
