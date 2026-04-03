import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Single shared Supabase instance for client components.
// Points to the SAME Supabase project as the main site.
export const supabase = createClientComponentClient()
