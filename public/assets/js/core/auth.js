// Studora auth — thin wrapper around Supabase Auth (Google OAuth, PKCE flow).
// We only ever store the user identity; all behavioural data lives in
// localStorage (see core/storage.js). RLS protects the database.

const SUPABASE_URL = 'https://xwvvxhkfndchpbyyaych.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aU1zXKMOkxXnAofsfnDGwg_zzVTwITR';

// The UMD bundle (loaded via <script> in index.html) exposes `window.supabase`.
// We grab `createClient` from it once.
function getCreateClient() {
  const lib = (typeof window !== 'undefined') ? window.supabase : null;
  if (!lib?.createClient) {
    throw new Error('supabase-js UMD bundle is missing — check vendor script tag');
  }
  return lib.createClient;
}

let _client = null;
export function client() {
  if (_client) return _client;
  _client = getCreateClient()(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,   // automatically picks up ?code=… on return
      flowType: 'pkce',           // safer than implicit grant
      storageKey: 'studora.auth',
    },
  });
  return _client;
}

export async function signInWithGoogle() {
  const { error } = await client().auth.signInWithOAuth({
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
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

export async function currentUser() {
  const { data, error } = await client().auth.getUser();
  if (error || !data?.user) return null;
  return shape(data.user);
}

export async function currentSession() {
  const { data } = await client().auth.getSession();
  return data?.session ?? null;
}

export function onAuthChange(cb) {
  const { data } = client().auth.onAuthStateChange((_event, session) => {
    cb(session?.user ? shape(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
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
