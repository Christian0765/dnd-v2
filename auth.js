// auth.js
// Authentication helper functions.
// Requires: /js/supabase-client.js

async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

async function getUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

async function getMembership(campaignId) {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabaseClient
    .from('memberships')
    .select('*, campaigns(*)')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function isDM(campaignId) {
  const membership = await getMembership(campaignId);
  return membership?.role === 'dm';
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    const banner = document.getElementById('session-banner');
    if (banner) banner.classList.add('show');
    else window.location.href = 'login.html';
  }
});

// Repair missing profile row — runs silently on every page load
async function repairProfile() {
  const user = await getUser();
  if (!user) return;

  const { data: existing } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    const displayName = user.user_metadata?.display_name
      || user.email?.split('@')[0]
      || 'Player';
    const { error } = await supabaseClient
      .from('profiles')
      .insert({ id: user.id, display_name: displayName });
    if (error) {
      console.error('[repairProfile] Failed:', error.message);
    } else {
      console.log('[repairProfile] Missing profile created for', user.id);
    }
  }
}
