const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function token() { return sessionStorage.getItem('adminToken'); }
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` };
}

async function req(method, path, body, auth = false) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: auth ? authHeaders() : { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// Public
export const lookupGuest   = (firstName, lastName) => req('POST', '/api/guests/lookup', { firstName, lastName });
export const submitRsvp    = (payload) => req('POST', '/api/rsvp', payload);
export const getSettings   = () => req('GET', '/api/settings');

// Admin auth
export const adminLogin    = (password) => req('POST', '/api/admin/login', { password });
export const changePassword = (password) => req('PUT', '/api/admin/password', { password }, true);

// Admin — guests
export const getGuests     = () => req('GET', '/api/guests', null, true);
export const addGuest      = (g) => req('POST', '/api/guests', g, true);
export const updateGuest   = (id, g) => req('PUT', `/api/guests/${id}`, g, true);
export const deleteGuest   = (id) => req('DELETE', `/api/guests/${id}`, null, true);
export const importGuests  = (guests) => req('POST', '/api/guests/import', { guests }, true);

// Admin — responses
export const getResponses  = () => req('GET', '/api/rsvp', null, true);
export const clearResponses = () => req('DELETE', '/api/rsvp', null, true);

// Admin — settings
export const updateSettings = (s) => req('PUT', '/api/settings', s, true);
