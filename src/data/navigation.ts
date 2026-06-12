import { Activity, Bell, BookOpen, CalendarDays, FileSearch, FileText, Heart, Home, Newspaper, Search, Star, StickyNote, Users } from 'lucide-react';
import type { NavItem } from '../components/common/types';
export const NAV_ITEMS: NavItem[] = [
  { id:'home', label:'홈', icon:Home }, { id:'watch', label:'관심기업', icon:Heart }, { id:'companies', label:'기업 목록', icon:Users }, { id:'filings', label:'공시 검색', icon:FileSearch }, { id:'calendar', label:'일정 캘린더', icon:CalendarDays }, { id:'timeline', label:'타임라인', icon:CalendarDays }, { id:'news', label:'뉴스', icon:Newspaper }, { id:'market', label:'시장환경', icon:Activity }, { id:'reports', label:'리포트', icon:BookOpen }, { id:'ai', label:'공시 요약', icon:FileText }, { id:'alerts', label:'알림', icon:Bell }, { id:'favorites', label:'즐겨찾기', icon:Star }, { id:'memo', label:'메모', icon:StickyNote }, { id:'settings', label:'출처', icon:FileText }
];
