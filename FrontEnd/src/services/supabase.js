import { createClient } from '@supabase/supabase-js'

// Só a chave pública (anon). A sessão fica salva e é renovada automaticamente pelo SDK.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)