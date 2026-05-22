export { TABS } from '../data/dashboardData.js';
import { TABS } from '../data/dashboardData.js';

export function getHashTab() {
  if (typeof window === 'undefined') return 'home';
  const value = window.location.hash.replace(/^#\/?/, '').trim().split('?')[0] || 'home';
  return TABS.some((tab) => tab.id === value) ? value : 'home';
}
