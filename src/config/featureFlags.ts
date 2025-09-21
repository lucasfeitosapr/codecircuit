export function isNewRendererEnabled(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('new-renderer') === 'true';
    }
  } catch (e) {
    // ignore in non-browser environments
  }
  return false;
}
