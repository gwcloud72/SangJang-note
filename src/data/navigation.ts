import { BookOpen, CalendarDays, FileSearch, Home, Users } from 'lucide-react';
import type { NavItem } from '../components/common/types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '오늘', icon: Home },
  { id: 'companies', label: '기업', icon: Users },
  { id: 'calendar', label: '일정', icon: CalendarDays },
  { id: 'ai', label: '원문 일정', icon: FileSearch },
  { id: 'news', label: 'IPO 이슈', icon: BookOpen },
];
