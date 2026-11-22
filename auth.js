import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js';

const $ = id => document.getElementById(id);
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(SUPABASE_PUBLISHABLE_KEY);
let client = null;
let signup = false;
let recovering = false;

function message(value, error = false) {
  $('authMessage').textContent = value;
  $('authMessage').classList.toggle('is-error', error);
}
function setBusy(busy) {
  $('authSubmit').disabled = busy;
  $('authResetSend').disabled = busy;
  $('authRecoverySubmit').disabled = busy;
  $('authSetPasswordSubmit').disabled = busy;
  $('authSubmit').textContent = busy ? 'Vent venligst…' : signup ? 'Opret konto' : 'Log ind';
}
function setMode(nextSignup) {
  signup = nextSignup;
  $('authForgotPanel').hidden = true;
  $('authForm').hidden = false;
  $('authLoginTab').classList.toggle('is-active', !signup);
  $('authSignupTab').classList.toggle('is-active', signup);
  $('authLoginTab').setAttribute('aria-pressed', String(!signup));
  $('authSignupTab').setAttribute('aria-pressed', String(signup));
  $('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  setBusy(false);
  message('');
}
function showUser(user) {
  $('authGuest').hidden = Boolean(user) || recovering;
  $('authMember').hidden = !user || recovering;
  $('authUserEmail').textContent = user?.email || '';
}
function errorText(error) {
  const value = String(error?.message || 'Ukendt fejl');
  if (/rate limit|after \d+ seconds|too many requests/i.test(value)) return 'Der er sendt for mange forespørgsler. Vent lidt, før du prøver igen.';
  if (/email not confirmed/i.test(value)) return 'Din e-mail er endnu ikke bekræftet. Brug linket i bekræftelsesmailen.';
  if (/invalid login credentials/i.test(value)) return 'E-mail eller adgangskode er forkert. Brug Glemt adgangskode, hvis du ikke har en adgangskode endnu.';
  return value;
}

$('authForgotButton').addEventListener('click', () => {
  $('authForm').hidden = true;
  $('authForgotPanel').hidden = false;
  $('authResetEmail').value = $('authEmail').value.trim();
  message('');
});
$('authForgotCancel').addEventListener('click', () => setMode(false));
$('authResetForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!client) return;
  setBusy(true);
  message('');
  try {
    const redirectTo = window.location.origin + '/reset-password.html?recovery=1';
    const { error } = await client.auth.resetPasswordForEmail($('authResetEmail').value.trim(), { redirectTo });
    if (error) throw error;
    message('Hvis kontoen findes, får du en e-mail med et link til at vælge en ny adgangskode. Tjek også spam.');
  } catch (error) { message(errorText(error), true); }
  finally { setBusy(false); }
});
$('authRecoveryForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!client) return;
  const password = $('authNewPassword').value;
  if (password !== $('authRepeatPassword').value) {
    message('Adgangskoderne er ikke ens.', true);
    return;
  }
  setBusy(true);
  message('');
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
    recovering = false;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('password_recovery');
    window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + '#konto');
    $('authRecoveryPanel').hidden = true;
    $('authNewPassword').value = '';
    $('authRepeatPassword').value = '';
    const { data } = await client.auth.getUser();
    showUser(data.user || null);
    message('Din nye adgangskode er gemt. Du er logget ind.');
  } catch (error) { message(errorText(error), true); }
  finally { setBusy(false); }
});
function showRecovery() {
  recovering = true;
  $('authGuest').hidden = true;
  $('authMember').hidden = true;
  $('authRecoveryPanel').hidden = false;
  window.location.hash = 'konto';
  message('Vælg din nye adgangskode herunder.');
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
$('authSetPasswordForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!client) return;
  const password = $('authSetPassword').value;
  if (password !== $('authSetPasswordRepeat').value) {
    message('Adgangskoderne er ikke ens.', true);
    return;
  }
  setBusy(true);
  message('');
  try {
    const { data: sessionData, error: sessionError } = await client.auth.getUser();
    if (sessionError || !sessionData?.user) throw new Error('Din login-session er udløbet. Bed om et nyt nulstillingslink.');
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
    $('authSetPasswordForm').reset();
    message('Adgangskoden er gemt på din konto. Du kan nu bruge den til login.');
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
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
    // Subscribe before restoring the session so the recovery event cannot be missed.
    const isRecoveryReturn = new URL(window.location.href).searchParams.get('password_recovery') === '1';
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (isRecoveryReturn && session)) showRecovery();
      else if (!recovering) showUser(session?.user || null);
    });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (isRecoveryReturn && data.session) showRecovery();
    else if (isRecoveryReturn && !data.session) {
      showUser(null);
      message('Nulstillingslinket kunne ikke bekræftes. Bed om et nyt link, og prøv igen.', true);
    } else if (!recovering) showUser(data.session?.user || null);
  } catch (error) {
    message('Login kunne ikke startes. Tjek internetforbindelsen og Supabase-indstillingerne. ' + errorText(error), true);
  }
}
init();
