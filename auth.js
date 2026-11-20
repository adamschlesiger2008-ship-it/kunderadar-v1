import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js';

const $ = id => document.getElementById(id);
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(SUPABASE_PUBLISHABLE_KEY);
let client = null;
let signup = false;

function message(value, error = false) {
  $('authMessage').textContent = value;
  $('authMessage').classList.toggle('is-error', error);
}
function setBusy(busy) {
  $('authSubmit').disabled = busy;
  $('authSubmit').textContent = busy ? 'Vent venligst…' : signup ? 'Opret konto' : 'Log ind';
}
function setMode(nextSignup) {
  signup = nextSignup;
  $('authLoginTab').classList.toggle('is-active', !signup);
  $('authSignupTab').classList.toggle('is-active', signup);
  $('authLoginTab').setAttribute('aria-pressed', String(!signup));
  $('authSignupTab').setAttribute('aria-pressed', String(signup));
  $('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  setBusy(false);
  message('');
}
function showUser(user) {
  $('authGuest').hidden = Boolean(user);
  $('authMember').hidden = !user;
  $('authUserEmail').textContent = user?.email || '';
}
function errorText(error) {
  const value = String(error?.message || 'Ukendt fejl');
  if (/rate limit|after \d+ seconds|too many requests/i.test(value)) return 'Der er sendt for mange forespørgsler. Vent lidt, før du prøver igen.';
  if (/email not confirmed/i.test(value)) return 'Din e-mail er endnu ikke bekræftet. Brug linket i bekræftelsesmailen.';
  if (/invalid login credentials/i.test(value)) return 'E-mail eller adgangskode er forkert.';
  return value;
}

$('authLoginTab').addEventListener('click', () => setMode(false));
$('authSignupTab').addEventListener('click', () => setMode(true));
$('authForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!client) return;
  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;
  setBusy(true);
  message('');
  try {
    const result = signup
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname + '#konto' } })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (signup && !result.data.session) {
      message('Tjek din e-mail for bekræftelseslinket. Hvis du allerede har oprettet kontoen, kan du vælge Log ind.');
    } else {
      showUser(result.data.user);
      message(signup ? 'Din konto er oprettet, og du er logget ind.' : 'Du er logget ind.');
    }
  } catch (error) {
    message(errorText(error), true);
  } finally {
    setBusy(false);
  }
});
$('authLogout').addEventListener('click', async () => {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) message(errorText(error), true);
  else { showUser(null); message('Du er logget ud.'); }
});

async function init() {
  if (!configured) {
    $('authSetup').hidden = false;
    $('authGuest').hidden = true;
    message('Login er ikke aktiveret endnu. Udbuddene kan stadig bruges.');
    return;
  }
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    showUser(data.session?.user || null);
    client.auth.onAuthStateChange((_event, session) => showUser(session?.user || null));
  } catch (error) {
    message('Login kunne ikke startes. Tjek internetforbindelsen og Supabase-indstillingerne. ' + errorText(error), true);
  }
}
init();
