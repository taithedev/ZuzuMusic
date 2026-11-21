export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const ALLOWED_MIME = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac", "audio/ogg", "audio/mp4"];
export const usernameValid = (s: unknown): s is string =>
  typeof s === "string" && /^[a-zA-Z0-9_]{3,24}$/.test(s);
export const passwordValid = (s: unknown): s is string =>
  typeof s === "string" && s.length >= 12 && s.length <= 200;
export const titleValid = (s: unknown): s is string =>
  typeof s === "string" && s.trim().length >= 1 && s.trim().length <= 120;
export const fileValid = (mime: unknown, size: unknown) =>
  typeof mime === "string" && ALLOWED_MIME.includes(mime) &&
  typeof size === "number" && Number.isInteger(size) && size > 0 && size <= MAX_AUDIO_BYTES;
export const jsonError = (message: string, status = 400) =>
  Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
