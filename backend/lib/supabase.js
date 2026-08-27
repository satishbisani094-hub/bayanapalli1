import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mstmcwrwtihrirqzxiuq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdG1jd3J3dGlocmlycXp4aXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MTU1MTUsImV4cCI6MjEwMzM5MTUxNX0.I2wA0h51InEL_CfuX9CLpGaEnlfeSpkAGbV6bOzRtEo';

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
