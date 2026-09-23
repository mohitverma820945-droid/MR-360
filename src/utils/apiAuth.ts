export function getStoredUserId(): string | undefined {
  try {
    const raw = localStorage.getItem('zynyx_current_user');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.id;
  } catch {
    return undefined;
  }
}

export function getAuthHeaderObj(): Record<string, string> {
  const userId = getStoredUserId();
  if (userId) {
    return { 'x-user-id': userId };
  }
  return {};
}
