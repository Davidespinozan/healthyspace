import { createClient } from '@supabase/supabase-js';

// MISMO proyecto Supabase que Healthy Space Club (integración futura de cuentas).
// Las tablas del food truck van namespaced con prefijo `truck_` para no cruzarse
// con las de HSC. La anon key es pública por diseño (la seguridad es por RLS);
// mismo patrón que HSC. Overridable por env para staging.
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://ltveorvqvvlyivjwxjlc.supabase.co';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmVvcnZxdnZseWl2and4amxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODEzNTAsImV4cCI6MjA4Nzk1NzM1MH0.BpBc3lM6VpDyL5299H1MwQK0VBOBjKWQQconfpcCsfU';

export const supabase = createClient(URL, ANON, {
  auth: { persistSession: false },
});
