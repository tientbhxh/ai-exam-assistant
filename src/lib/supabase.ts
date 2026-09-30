import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqprmhthzpgbgouwuiji.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxcHJtaHRoenBnYmdvdXd1aWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NTM1ODgsImV4cCI6MjEwNjMyOTU4OH0.BdujMi0Mh9wmkXVRiJMkjBBp-WNrMImkiwPlZAPGpmU';

export const supabase = createClient(supabaseUrl, supabaseKey);
