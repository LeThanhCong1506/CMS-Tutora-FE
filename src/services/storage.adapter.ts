/**
 * Web-only storage adapter for admin portal.
 *
 * Wraps localStorage with an in-memory cache so the axios request interceptor
 * (hot-path, must be sync) can read user data without an async round-trip.
 *
 * NOTE: For the user-facing Agora-Frontend repo, this file has an additional
 * branch for Zalo Mini App (zmp-sdk async storage). Admin runs web-only, so
 * the Zalo branch is stripped here. See plan: t-i-mu-n-t-ch-resource-shimmering-wren.md
 */

// In-memory cache — sync getter for hot-path calls (request interceptor, etc.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _cachedUserData: any = null;

const USER_KEY = "TUTORA_user_data";

export const storageAdapter = {
  async get(key: string): Promise<string | null> {
    return Promise.resolve(localStorage.getItem(key));
  },

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
    if (key === USER_KEY) {
      _cachedUserData = JSON.parse(value);
    }
    return Promise.resolve();
  },

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
    if (key === USER_KEY) {
      _cachedUserData = null;
    }
    return Promise.resolve();
  },

  /**
   * Sync getter for hot-path (request interceptor) — reads from in-memory cache,
   * falls back to localStorage if not yet hydrated.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCachedUser(): any {
    if (_cachedUserData) return _cachedUserData;
    const data = localStorage.getItem(USER_KEY);
    _cachedUserData = data ? JSON.parse(data) : null;
    return _cachedUserData;
  },

  updateCachedTokens(accessToken: string, refreshToken: string): void {
    if (_cachedUserData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _cachedUserData = { ..._cachedUserData, accessToken, refreshToken } as any;
    }
  },
};
