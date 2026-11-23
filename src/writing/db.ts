// The Supabase client, if this build was given a project. The anon key is public by design:
// what it can do is decided by row-level security in supabase/writing.sql.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const db = url && key ? createClient(url, key, { auth: { flowType: 'pkce' } }) : null
