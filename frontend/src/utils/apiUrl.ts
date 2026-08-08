export function getApiUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.') && !host.startsWith('10.')) {
      return `${window.location.protocol}//${host.replace(/-frontend/, '-backend')}`;
    }
    return `http://${host}:8080`;
  }
  return 'http://localhost:8080';
}
