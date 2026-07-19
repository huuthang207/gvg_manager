export type Tab = 'dashboard' | 'gvg-lineup' | 'attendance';

const getActiveTabStorageKey = (userId: string, guildId: string) => `gvg_active_tab_${userId}_${guildId}`;

export function isTab(value: string | null): value is Tab {
  return value === 'dashboard' || value === 'gvg-lineup' || value === 'attendance';
}

export function readStoredActiveTab(userId: string, guildId: string) {
  const storedTab = localStorage.getItem(getActiveTabStorageKey(userId, guildId));
  return isTab(storedTab) ? storedTab : null;
}

export function writeStoredActiveTab(userId: string, guildId: string, tab: Tab) {
  localStorage.setItem(getActiveTabStorageKey(userId, guildId), tab);
}

export function clearStoredActiveTab(userId: string, guildId: string) {
  localStorage.removeItem(getActiveTabStorageKey(userId, guildId));
}
