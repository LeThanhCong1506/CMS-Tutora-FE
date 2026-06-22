/**
 * Avatar helpers for the Admin Portal.
 */

/**
 * Build a deterministic fallback avatar URL (initials on a colored circle)
 * for users without an uploaded avatar.
 *
 * Uses ui-avatars.com — the same service already used by the user-management
 * and portal-layout avatars — replacing the now-defunct via.placeholder.com.
 *
 * @param name - Display name used to derive the initials.
 * @returns A ready-to-use image URL.
 */
export const getFallbackAvatar = (name: string | null | undefined): string => {
  const safeName = name?.trim() || 'Người dùng';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=random`;
};

/**
 * Wrap a URL as a CSS `background-image` value.
 *
 * Quotes the URL so values containing spaces or special characters (e.g.
 * Cloudinary filenames like ".../ChatGPT Image 9 thg 5.jpg") don't break the
 * CSS url() token and silently render blank. Escapes embedded backslashes and
 * double-quotes for safety.
 *
 * @param url - The image URL.
 * @returns e.g. `url("https://.../a b.jpg")`
 */
export const cssBackgroundUrl = (url: string): string => {
  const safe = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `url("${safe}")`;
};
