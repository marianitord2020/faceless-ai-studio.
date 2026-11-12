/**
 * Session tokens for Faceless AI Studio.
 *
 * APP_PASSCODE stays in Cloudflare Secrets. Browsers receive an HMAC-signed,
 * short-lived bearer session rather than storing or resending the master code.
 * Rotating APP_PASSCODE invalidates all existing sessions.
 */
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function b64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(str) {
  if (typeof str !== 'string' || !/^[A-Za-z0-9_-]+$/.test(str)) return null;
  try {
    const binary = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - str.length % 4) % 4));
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  } catch { return null; }
}
async function signingKey(secret) {
  if (typeof secret !== 'string' || secret.length < 16) throw Error('APP_PASSCODE inválido.');
  const material = encoder.encode('faceless-session-v1:' + secret);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', digest, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}
export async function issueSession(secret, origin, now = Date.now()) {
  const issued = Math.floor(now / 1000);
  const expires = Math.floor((now + SESSION_MS) / 1000);
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = ['fs1', issued.toString(36), expires.toString(36), nonce].join('.');
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload + ':' + origin)));
  return {token: payload + '.' + b64url(signature), expiresAt: expires * 1000};
}
export async function validateSession(token, secret, origin, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 350 || !token.startsWith('fs1.')) return false;
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== 'fs1') return false;
  if (![parts[1], parts[2]].every(x => /^[0-9a-z]{1,12}$/.test(x))) return false;
  const issued = parseInt(parts[1], 36) * 1000;
  const expires = parseInt(parts[2], 36) * 1000;
  if (!Number.isSafeInteger(issued) || !Number.isSafeInteger(expires) || now >= expires ||
      issued > now + 60000 || expires <= issued || expires - issued > SESSION_MS + 2000) return false;
  const nonce = fromBase64Url(parts[3]), sig = fromBase64Url(parts[4]);
  if (!nonce || nonce.length !== 16 || !sig || sig.length !== 32) return false;
  const payload = parts.slice(0, 4).join('.');
  try {
    return await crypto.subtle.verify('HMAC', await signingKey(secret), sig, encoder.encode(payload + ':' + origin));
  } catch { return false; }
}
export const SESSION_LIFETIME_DAYS = SESSION_MS / (24 * 60 * 60 * 1000);
