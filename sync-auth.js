import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js';
try {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
  let lastUserId;
  const notify = user => {
    const id = user?.id || null;
    if (id === lastUserId) return;
    lastUserId = id;
    window.dispatchEvent(new CustomEvent('kunderadar:auth', { detail: { client, user: user || null } }));
  };
  client.auth.onAuthStateChange((_event, session) => notify(session?.user || null));
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  notify(data.session?.user || null);
} catch (error) {
  console.warn('Kunne ikke starte kontosynkronisering.', error);
}
