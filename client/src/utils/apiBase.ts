export const getApiBase = (): string => {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  const fallback = 'http://localhost:3001/api';

  if (raw) {
    if (/^https?:\/\//i.test(raw)) {
      return raw.replace(/\/$/, '');
    }
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return new URL(raw, window.location.origin).toString().replace(/\/$/, '');
    }
    return fallback;
  }

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return `${window.location.origin}/api`;
  }

  return fallback;
};

export const getApiOrigin = (apiBase: string): string => {
  try {
    return new URL(apiBase).origin;
  } catch {
    return window.location.origin;
  }
};
