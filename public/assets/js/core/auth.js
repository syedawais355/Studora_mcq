// Studora auth — thin wrapper around Supabase Auth (Google OAuth, PKCE flow).
// We only ever store the user identity; all behavioural data lives in
// localStorage (see core/storage.js). RLS protects the database.
//
// The supabase-js UMD bundle is heavy (~51 KB brotli) and is only needed for
// auth-gated flows (sign-in, bookmarks, mistakes, report-modal). It is no
// longer loaded eagerly via a <script> tag — instead getClient() pulls it in
// on first call, the first time anything in the app actually needs auth.

const SUPABASE_URL = 'https://xwvvxhkfndchpbyyaych.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aU1zXKMOkxXnAofsfnDGwg_zzVTwITR';

// Path to the UMD vendor bundle shipped under /public/assets/vendor/.
// We inject it as a <script> tag (not an ES import) because the vendor file
// is a UMD/IIFE bundle that attaches itself to `window.supabase` — it is not
// an ES module.
const VENDOR_URL = '/assets/vendor/supabase.js';

let _vendorPromise = null;
function loadVendor() {
  if (_vendorPromise) return _vendorPromise;
  _vendorPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.supabase?.createClient) {
      resolve(window.supabase);
      return;
    }
    if (typeof document === 'undefined') {
      reject(new Error('supabase-js vendor cannot be loaded outside a document'));
      return;
    }
    const tag = document.createElement('script');
    tag.src = VENDOR_URL;
    tag.async = true;
    tag.onload = () => {
      if (window.supabase?.createClient) resolve(window.supabase);
      else reject(new Error('supabase-js vendor loaded but window.supabase is missing'));
    };
    tag.onerror = () => reject(new Error('Failed to load supabase-js vendor bundle'));
    document.head.appendChild(tag);
  });
  return _vendorPromise;
}

let _client = null;
let _clientPromise = null;
// Async — the supabase vendor bundle is fetched on first call. Every public
// surface (currentUser, onAuthChange, signIn, signOut) awaits this, so the
// rest of the app never sees the vendor's loading state.
export async function getClient() {
  if (_client) return _client;
  if (_clientPromise) return _clientPromise;
  _clientPromise = (async () => {
    const lib = await loadVendor();
    _client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,   // automatically picks up ?code=… on return
        flowType: 'pkce',           // safer than implicit grant
        storageKey: 'studora.auth',
      },
    });
    return _client;
  })();
  return _clientPromise;
}

// Back-compat alias for any consumer still calling client().
export const client = getClient;

export async function signInWithGoogle() {
  const c = await getClient();
  const { error } = await c.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Land back on whatever page you started from. Supabase will append
      // ?code=… and supabase-js will exchange it on next page load.
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const c = await getClient();
  const { error } = await c.auth.signOut();
  if (error) throw error;
}

export async function currentUser() {
  const c = await getClient();
  const { data, error } = await c.auth.getUser();
  if (error || !data?.user) return null;
  return shape(data.user);
}

export async function currentSession() {
  const c = await getClient();
  const { data } = await c.auth.getSession();
  return data?.session ?? null;
}

// onAuthChange is sync in the supabase API, but we have to await the client
// here. Returns a promise that resolves to the unsubscribe function — callers
// that don't care about unsubscribing can simply ignore the return value.
export function onAuthChange(cb) {
  let unsub = () => {};
  let cancelled = false;
  getClient().then((c) => {
    if (cancelled) return;
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      cb(session?.user ? shape(session.user) : null);
    });
    unsub = () => data.subscription.unsubscribe();
  }).catch(() => { /* vendor failed to load — fire no events, app stays anonymous */ });
  return () => { cancelled = true; unsub(); };
}

// Trim the Supabase user down to just what the UI needs.
function shape(u) {
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email,
    name: meta.full_name || meta.name || u.email?.split('@')[0] || 'student',
    avatar: meta.avatar_url || meta.picture || null,
  };
}
