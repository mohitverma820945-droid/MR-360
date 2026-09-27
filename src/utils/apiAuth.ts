export function getStoredUserId(): string {
  try {
    // 1. Logged in account in local storage
    const raw = localStorage.getItem('zynyx_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }

    // 2. Persistent guest device ID per browser/device
    let devId = localStorage.getItem('zynyx_device_user_id');
    if (!devId) {
      devId = 'usr_guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem('zynyx_device_user_id', devId);
    }
    return devId;
  } catch {
    return 'usr_mohit_owner';
  }
}

export function getAuthHeaderObj(): Record<string, string> {
  const userId = getStoredUserId();
  return { 'x-user-id': userId };
}
