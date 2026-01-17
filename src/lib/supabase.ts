import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hjridosuleevyjjeirbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqcmlkb3N1bGVldnlqamVpcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDkzOTIsImV4cCI6MjA4MzQyNTM5Mn0._O2irIgL7ZsEpXHQ2l3_ke0ue17eGBSoBUg9yiuKij8';

export const supabase = createClient(supabaseUrl, supabaseKey);
