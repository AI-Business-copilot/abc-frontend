import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), refreshSession: vi.fn(), signOut: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));

describe('authenticated API client', () => {
  beforeEach(() => {
    vi.resetModules();
    auth.getSession.mockReset().mockResolvedValue({ data: { session: { access_token: 'old-token' } }, error: null });
    auth.refreshSession.mockReset().mockResolvedValue({ data: { session: { access_token: 'new-token' } }, error: null });
    auth.signOut.mockReset().mockResolvedValue({ error: null });
  });
  it('preserves caller headers and sends the current bearer token', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    const { apiFetch } = await import('@/lib/api-client');
    await apiFetch('/sales', { method: 'POST', body: '{}', headers: { 'X-Request-ID': 'request' } });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/sales$/);
    expect(init.headers.get('Authorization')).toBe('Bearer old-token');
    expect(init.headers.get('Content-Type')).toBe('application/json');
    expect(init.headers.get('X-Request-ID')).toBe('request');
  });
  it('lets the browser set the multipart boundary for file uploads', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    const { apiFetch } = await import('@/lib/api-client');
    const body = new FormData();
    body.append('photo', new Blob(['image']), 'photo.jpg');
    await apiFetch('/upload', { method: 'POST', body });
    expect(fetch.mock.calls[0][1].headers.has('Content-Type')).toBe(false);
    expect(fetch.mock.calls[0][1].body).toBe(body);
  });
  it('refreshes and retries an unauthorized request exactly once', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(new Response('{"id":1}'));
    vi.stubGlobal('fetch', fetch);
    const { apiJson } = await import('@/lib/api-client');
    expect(await apiJson('/sales')).toEqual({ id: 1 });
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer new-token');
  });
  it('re-reads a session rotated by another tab when refreshing fails', async () => {
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('rotated') });
    auth.getSession.mockResolvedValueOnce({ data: { session: { access_token: 'old-token' } }, error: null })
      .mockResolvedValueOnce({ data: { session: { access_token: 'rotated-token' } }, error: null });
    const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    const { apiFetch } = await import('@/lib/api-client');
    await apiFetch('/sales');
    expect(fetch.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer rotated-token');
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  it('expires a repeatedly rejected session and consumes its notice only once', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    vi.stubGlobal('fetch', fetch);
    const { apiFetch, SessionExpiredError, consumeAuthNotice, SESSION_EXPIRED_MESSAGE } = await import('@/lib/api-client');
    await expect(apiFetch('/sales')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
    expect(consumeAuthNotice()).toBe(SESSION_EXPIRED_MESSAGE);
    expect(consumeAuthNotice()).toBe('');
  });
  it('rejects missing sessions before making an HTTP request', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { apiFetch, SessionExpiredError } = await import('@/lib/api-client');
    await expect(apiFetch('/sales')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{ error: 'Denied' }, { message: 'Denied' }])('shows API errors without refreshing a forbidden session', async payload => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 403 })));
    const { apiJson } = await import('@/lib/api-client');
    await expect(apiJson('/sales')).rejects.toThrow('Denied');
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });
  it('handles empty success and non-JSON errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response('upstream unavailable', { status: 502 })));
    const { apiJson } = await import('@/lib/api-client');
    expect(await apiJson('/sales')).toBeUndefined();
    await expect(apiJson('/sales')).rejects.toThrow(/502/);
  });
  it('recognizes session error codes and ignores ordinary errors', async () => {
    const { isSessionExpiredError, hasStoredAuthSession } = await import('@/lib/api-client');
    expect(isSessionExpiredError(Object.assign(new Error('auth failed'), { code: 'invalid_jwt' }))).toBe(true);
    expect(isSessionExpiredError(new Error('Session is expired'))).toBe(true);
    expect(isSessionExpiredError(new Error('Network unavailable'))).toBe(false);
    expect(isSessionExpiredError(null)).toBe(false);
    window.localStorage.setItem('theme', 'dark');
    expect(hasStoredAuthSession()).toBe(false);
    window.localStorage.setItem('sb-project-auth-token', 'session');
    expect(hasStoredAuthSession()).toBe(true);
  });
});
