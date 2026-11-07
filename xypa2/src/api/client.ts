import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import type { Found } from '../logic/scan';

export const API = 'https://xypa-api.vercel.app';
const TOKEN_KEY = 'xypa2.session';

export type Me = { email: string; name: string | null; gmailConnected: boolean };

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});

async function call<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const token = init.auth === false ? null : await getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Request failed (${res.status})`), { status: res.status });
  return body as T;
}

export type AuthResult = { ok: true; me: Me } | { ok: false; reason: 'cancelled' | 'wrong_account' | 'error'; message?: string };

/** Open Google in an in-app browser. `signin` asks for name + email only; `gmail` asks for read-only bank emails. */
export async function authenticate(kind: 'signin' | 'gmail'): Promise<AuthResult> {
  try {
    const redirect = Linking.createURL('auth');
    const { url } = await call<{ url: string }>('/v2/auth/begin', { method: 'POST', body: JSON.stringify({ kind, redirect }), auth: kind === 'gmail' });
    const result = await WebBrowser.openAuthSessionAsync(url, redirect);
    if (result.type !== 'success') return { ok: false, reason: 'cancelled' };
    const q = Linking.parse(result.url).queryParams ?? {};
    if (q.error) return { ok: false, reason: q.error === 'wrong_account' ? 'wrong_account' : q.error === 'cancelled' || q.error === 'access_denied' ? 'cancelled' : 'error', message: String(q.error) };
    const ex = await call<{ token: string; user: Me }>('/v2/auth/exchange', { method: 'POST', body: JSON.stringify({ code: q.code }), auth: false });
    await SecureStore.setItemAsync(TOKEN_KEY, ex.token);
    return { ok: true, me: ex.user };
  } catch (e) {
    return { ok: false, reason: 'error', message: (e as Error).message };
  }
}

export const me = () => call<Me>('/v2/me');
export const disconnectGmail = () => call<{ ok: boolean }>('/v2/gmail', { method: 'DELETE' });
export const deleteAccount = () => call<{ ok: boolean }>('/v2/me', { method: 'DELETE' });

export type ScanProgress = { read: number; total: number; found: number };

/** Read the last 3 months of bank emails: list ids, then parse them in small batches. */
export async function scanGmail(onProgress: (p: ScanProgress) => void): Promise<Found[]> {
  const ids: string[] = [];
  let page: string | null = null;
  do {
    const r: { ids: string[]; next: string | null } = await call(`/v2/scan/ids${page ? `?page=${encodeURIComponent(page)}` : ''}`);
    ids.push(...r.ids);
    page = r.next;
    if (ids.length >= 600) break;
  } while (page);
  const out: Found[] = [];
  onProgress({ read: 0, total: ids.length, found: 0 });
  for (let i = 0; i < ids.length; i += 25) {
    const r = await call<{ transactions: Found[]; read: number }>('/v2/scan/batch', { method: 'POST', body: JSON.stringify({ ids: ids.slice(i, i + 25) }) });
    out.push(...r.transactions.map((t) => ({ ...t, source: 'gmail' as const })));
    onProgress({ read: Math.min(ids.length, i + 25), total: ids.length, found: out.length });
  }
  return out;
}
