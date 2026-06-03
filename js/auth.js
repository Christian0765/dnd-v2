// auth.js
// Authentication helper functions.
// Requires: /js/supabase-client.js

// Redirect to login if not signed in. Returns session if authenticated.
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// Get current session or null
async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

// Get current user or null
async function getUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// Get user's membership for a campaign
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

// Check if current user is DM of a campaign
async function isDM(campaignId) {
  const membership = await getMembership(campaignId);
  return membership?.role === 'dm';
}

// Sign out and redirect to login
async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// Handle token expiry — show banner instead of silent failure
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    const banner = document.getElementById('session-banner');
    if (banner) banner.classList.add('show');
    else window.location.href = 'login.html';
  }
});
