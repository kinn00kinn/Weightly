import { createAuthClient } from 'better-auth/react';

export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
export const authClient = createAuthClient({ baseURL: API_BASE || window.location.origin });

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
    ...options,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}
