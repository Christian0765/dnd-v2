// theme.js
// Theme loading, applying, and saving.
// Requires: /js/supabase-client.js

// Load campaign theme and player accent, apply to page
async function loadAndApplyTheme(campaignId, membershipId) {
  try {
    const { data: campaign } = await supabaseClient
      .from('campaigns')
      .select('theme_preset, theme_vars')
      .eq('id', campaignId)
      .single();

    if (campaign?.theme_preset) applyThemePreset(campaign.theme_preset);
    if (campaign?.theme_vars) {
      Object.entries(campaign.theme_vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
      });
    }

    if (membershipId) {
      const { data: membership } = await supabaseClient
        .from('memberships')
        .select('accent_hex')
        .eq('id', membershipId)
        .single();
      if (membership?.accent_hex) applyAccentColor(membership.accent_hex);
    }
  } catch(e) {
    console.warn('[theme] Failed to load theme:', e.message);
  }
}

// Apply a named theme preset
function applyThemePreset(preset) {
  document.documentElement.dataset.theme = preset;
}

// Apply a hex accent color
function applyAccentColor(hex) {
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-rgb', hexToRgb(hex));
  document.documentElement.style.setProperty('--gold', darkenHex(hex, 30));
  document.documentElement.style.setProperty('--gold-light', hex);
}

// Save player's accent color to database
async function saveAccentColor(hex, membershipId) {
  await supabaseClient
    .from('memberships')
    .update({ accent_hex: hex })
    .eq('id', membershipId);
}

// Save campaign theme (DM only)
async function saveCampaignTheme(preset, customVars, campaignId) {
  await supabaseClient
    .from('campaigns')
    .update({ theme_preset: preset, theme_vars: customVars })
    .eq('id', campaignId);
}
