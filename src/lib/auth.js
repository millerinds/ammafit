import 'server-only';

import { cookies } from 'next/headers';

const SESSION_COOKIE = 'ammafit_admin_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function getAuthConfig() {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const sessionSecret = process.env.AUTH_SECRET;

  if (!username || !passwordHash || !sessionSecret) {
    throw new Error('Autenticação do admin não configurada. Defina ADMIN_USERNAME, ADMIN_PASSWORD_HASH e AUTH_SECRET.');
  }

  return { username, passwordHash, sessionSecret };
}

function safeEqual(left, right) {
  const a = encoder.encode(String(left));
  const b = encoder.encode(String(right));
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signPayload(payload, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyAdminCredentials(username, password) {
  const config = getAuthConfig();
  const [iterationsValue, saltValue, storedHash] = config.passwordHash.split(':');
  const iterations = Number(iterationsValue);
  if (!Number.isInteger(iterations) || iterations < 210000 || !saltValue || !storedHash) {
    throw new Error('ADMIN_PASSWORD_HASH possui formato inválido.');
  }

  const passwordKey = await crypto.subtle.importKey('raw', encoder.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64UrlToBytes(saltValue), iterations },
    passwordKey,
    256,
  );
  const suppliedHash = bytesToBase64Url(new Uint8Array(derivedBits));
  return safeEqual(username, config.username) && safeEqual(suppliedHash, storedHash);
}

export async function createAdminSession() {
  const { sessionSecret } = getAuthConfig();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ role: 'admin', exp: expiresAt })));
  const signature = await signPayload(payload, sessionSecret);

  (await cookies()).set(SESSION_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
    priority: 'high',
  });
}

export async function destroyAdminSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isAdminAuthenticated() {
  try {
    const { sessionSecret } = getAuthConfig();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return false;

    const [payload, signature] = token.split('.');
    if (!payload || !signature || !safeEqual(signature, await signPayload(payload, sessionSecret))) return false;

    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    return session.role === 'admin' && Number(session.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error('Não autorizado. Entre novamente no painel administrativo.');
  }
}
