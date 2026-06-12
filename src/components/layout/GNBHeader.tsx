import { Bell, ChevronDown, RefreshCw, ScrollText } from 'lucide-react';
import type { NavItem } from '../common/types';

interface GNBHeaderProps {
  appName: string;
  source: string;
  tab: string;
  navItems: NavItem[];
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  liveText: string;
}

export function GNBHeader({ appName, source, tab, navItems, onTabChange, onRefresh, refreshing, liveText }: GNBHeaderProps) {
  const mainItems = navItems.slice(0, 12);
  const moreItems = navItems.slice(12);
  const moreActive = moreItems.some((item) => item.id === tab);
  return <header className="sticky top-0 z-40 flex h-topbar items-center border-b border-ink-200 bg-white px-ds-2 desktop:px-ds-3">
    <div className="mr-ds-2 flex shrink-0 items-center gap-ds-1 desktop:mr-ds-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-900 text-white"><ScrollText size={18} strokeWidth={1.8} /></span><strong className="text-base font-bold text-ink-900 desktop:text-lg">{appName}</strong></div>
    <nav className="flex h-full min-w-0 flex-1 items-center gap-0" aria-label="상단 메뉴">
      {mainItems.map((item) => { const active = tab === item.id; return <button type="button" key={item.id} aria-current={active ? 'page' : undefined} onClick={() => onTabChange(item.id)} className={`flex h-full shrink-0 items-center border-b-3 px-2 text-[13px] transition focus:outline-none focus:ring-4 focus:ring-primary-100 desktop:px-3 desktop:text-sm ${active ? 'border-primary-600 font-semibold text-primary-600' : 'border-transparent text-ink-700 hover:text-primary-600'}`}>{item.label}</button>; })}
      {moreItems.length ? <details className="relative h-full shrink-0">
        <summary className={`flex h-full cursor-pointer list-none items-center gap-1 border-b-3 px-2 text-[13px] transition marker:hidden focus:outline-none desktop:px-3 desktop:text-sm ${moreActive ? 'border-primary-600 font-semibold text-primary-600' : 'border-transparent text-ink-700 hover:text-primary-600'}`}>더보기<ChevronDown size={14} strokeWidth={1.8} /></summary>
        <div className="absolute right-0 top-full z-50 min-w-28 rounded-md border border-ink-200 bg-white p-1 shadow-popover">
          {moreItems.map((item) => { const active = tab === item.id; return <button type="button" key={item.id} aria-current={active ? 'page' : undefined} onClick={() => onTabChange(item.id)} className={`block w-full rounded px-3 py-2 text-left text-sm ${active ? 'bg-primary-50 font-semibold text-primary-600' : 'text-ink-700 hover:bg-ink-50'}`}>{item.label}</button>; })}
        </div>
      </details> : null}
    </nav>
    <div className="hidden shrink-0 items-center gap-ds-1 text-caption text-ink-500 desktop:flex" aria-live="polite"><span className="live-dot h-2 w-2 rounded-full bg-live" />{source} · {liveText}</div>
    <button type="button" onClick={onRefresh} aria-label="알림 확인" className="relative ml-2 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 desktop:flex"><Bell size={19} strokeWidth={1.8} /><span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-up px-1 text-badge-count font-bold text-white ring-2 ring-white">12</span></button>
    <button type="button" onClick={onRefresh} className={`ml-1 flex h-9 shrink-0 items-center gap-ds-1 rounded-md border border-ink-200 px-ds-1 text-caption font-semibold text-ink-700 hover:border-primary-500 hover:text-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 desktop:ml-2 desktop:px-ds-2 ${refreshing ? 'refresh-spin' : ''}`}><RefreshCw size={16} strokeWidth={1.8} /><span className="hidden desktop:inline">새로 고침</span></button>
  </header>;
}
