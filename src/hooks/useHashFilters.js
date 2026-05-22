import { TABS } from '../config/navigation.js';
import { DEFAULT_FILTERS, normalizeSort } from '../lib/dashboardFilters.js';

export function readHashState() {
  if (typeof window === 'undefined') return { tab: 'home', filters: DEFAULT_FILTERS };
  const [rawTab, rawQuery = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const tab = TABS.some((item) => item.id === rawTab) ? rawTab : 'home';
  const params = new URLSearchParams(rawQuery);
  return {
    tab,
    filters: {
      query: params.get('q') || '',
      market: params.get('market') || DEFAULT_FILTERS.market,
      status: params.get('status') || DEFAULT_FILTERS.status,
      period: params.get('period') || DEFAULT_FILTERS.period,
      sort: normalizeSort(params.get('sort') || DEFAULT_FILTERS.sort),
    },
  };
}

export function writeHashState(tab, filters) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.market !== DEFAULT_FILTERS.market) params.set('market', filters.market);
  if (filters.status !== DEFAULT_FILTERS.status) params.set('status', filters.status);
  if (filters.period !== DEFAULT_FILTERS.period) params.set('period', filters.period);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  const hash = `#${tab}${params.toString() ? `?${params.toString()}` : ''}`;
  if (window.location.hash !== hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
}
