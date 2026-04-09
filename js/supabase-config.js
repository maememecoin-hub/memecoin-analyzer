const SUPABASE_URL = 'https://yifocbciyywcyuwdvsku.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZm9jYmNpeXl3Y3l1d2R2c2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTMwMTksImV4cCI6MjA5MTMyOTAxOX0.CNksc1prtEKnLXCpJg6-tko_q0P2TwomDfTHJrLGP-4';

// Zmieniamy nazwę na 'db', żeby nie kłóciło się z biblioteką
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
