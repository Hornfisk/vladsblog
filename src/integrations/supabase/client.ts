// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://owwhvpjerkjdbmfexfii.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93d2h2cGplcmtqZGJtZmV4ZmlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxMTg4MDksImV4cCI6MjA1MDY5NDgwOX0.o6RE9TajWTKPFrCxkK49f7d3l5XmsYAPjSh_Z1-ba74";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);