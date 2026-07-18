import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Frühzeitiger, klarer Hinweis statt kryptischer Laufzeitfehler.
  console.error(
    'Supabase-Konfiguration fehlt. Bitte .env mit VITE_SUPABASE_URL und ' +
      'VITE_SUPABASE_ANON_KEY anlegen (siehe .env.example).'
  )
}

export const isConfigured = Boolean(url && anonKey)

// Platzhalter-Werte, falls nicht konfiguriert: createClient wirft sonst schon
// beim Import ("supabaseUrl is required") und die ganze App bleibt leer –
// statt den hilfreichen Hinweis-Screen anzuzeigen.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
