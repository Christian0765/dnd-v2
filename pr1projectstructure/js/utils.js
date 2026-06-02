// utils.js
// Shared utility functions used across all pages.
// No dependencies.

// Escape HTML to prevent XSS — call on ALL user-supplied strings
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format a Supabase timestamp for display
function formatDate(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}

// Convert hex color to RGB string (e.g. "196,146,10")
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `${r},${g},${b}`;
}

// Darken a hex color by an amount (0-255)
function darkenHex(hex, amount = 30) {
  const r = Math.max(0, parseInt(hex.slice(1,3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3,5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5,7), 16) - amount);
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

// Debounce a function (use for auto-save on input)
function debounce(fn, delay = 800) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Show a toast notification
// type: 'success' | 'error' | 'info'
function showToast(message, type = 'info', duration = 3000) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  setTimeout(() => toast.classList.remove('show'), duration);
}

// Generate a random 6-char uppercase invite code
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
