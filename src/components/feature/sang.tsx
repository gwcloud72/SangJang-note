import { CalendarDays, Clock, Star } from 'lucide-react';
import { Card, StatusBadge, Button } from '../common/ui';
import type { Company, IpoStatus } from '../../data/model';

const badgeClass = { green:'company-tone-green', blue:'company-tone-blue', purple:'company-tone-purple', amber:'company-tone-amber', gray:'company-tone-gray' } as const;
const borderClass = { green:'border-l-primary-600', blue:'border-l-blue-700', purple:'border-l-violet-700', amber:'border-l-amber-600', gray:'border-l-ink-400' } as const;
const dotClass: Record<IpoStatus, string> = { 수요예측:'calendar-dot-demand', 청약:'calendar-dot-subscribe', 상장:'calendar-dot-listing', 예비심사:'calendar-dot-review' };

export function CompanyBadge({ company }: { company: Company }) { return <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-extrabold ${badgeClass[company.color]}`}>{company.short}</span>; }

export function CompanyCard({ company, onToggle, compact = false }: { company: Company; onToggle: () => void; compact?: boolean }) { return <Card className={compact ? 'p-4' : 'p-5'}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><CompanyBadge company={company}/><div className="min-w-0"><h3 className="truncate font-bold text-ink-900">{company.name}</h3><p className="truncate text-sm text-ink-500">{company.underwriter}</p></div></div><button type="button" onClick={onToggle} aria-pressed={company.bookmarked} className="shrink-0 rounded-full bg-primary-100 p-2 text-primary-600"><Star size={17} fill={company.bookmarked?'currentColor':'none'}/></button></div><div className="mt-4 flex items-center justify-between"><StatusBadge label={company.status}/><span className="text-sm font-bold text-ink-700">{company.dday}</span></div></Card>; }

export function DayCard({ company, onOpen }: { company: Company; onOpen: () => void }) { return <button type="button" onClick={onOpen} className={`w-full rounded-lg border border-ink-200 border-l-3 bg-white p-4 text-left shadow-card transition hover:border-primary-400 hover:shadow-card-hover ${borderClass[company.color]}`}><div className="flex items-center justify-between"><strong className="text-base text-ink-900">{company.dday}</strong><span className="flex items-center gap-1 text-xs text-ink-500"><Clock size={13}/>{company.date}</span></div><div className="mt-4 flex items-center gap-3"><CompanyBadge company={company}/><div><p className="font-semibold text-ink-900">{company.name}</p><StatusBadge label={company.status}/></div></div><p className="mt-3 text-xs text-ink-500">주관사 · {company.underwriter}</p></button>; }

export function DisclaimerBanner() { return <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border border-warn-border bg-warn-bg px-4 py-3 text-sm text-warn-text"><span className="font-semibold">공시 지표 기준</span><span>요약 참고</span><span>공시 원문 기준</span><span>정보 확인용</span></div>; }

function parseCompanyDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  const now = new Date();
  const parts = text.replace(/\./g, '-').split('-').map((part) => part.trim()).filter(Boolean);
  let year = now.getFullYear();
  let month = 0;
  let day = 0;
  if (parts.length >= 3) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2].slice(0, 2));
  } else if (parts.length === 2) {
    month = Number(parts[0]);
    day = Number(parts[1].slice(0, 2));
  }
  if (!month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function IPOCalendar({ companies, onSelect, compact = false }: { companies: Company[]; onSelect: (company: Company) => void; compact?: boolean }) {
  const datedCompanies = companies.map((company) => ({ company, date: parseCompanyDate(company.date) })).filter((item): item is { company: Company; date: Date } => Boolean(item.date));
  const baseDate = datedCompanies[0]?.date ?? new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const leadingBlankCount = (firstDay.getDay() + 6) % 7;
  const eventsByDay = new Map<number, Company[]>();
  datedCompanies.forEach(({ company, date }) => {
    if (date.getFullYear() === year && date.getMonth() === month) {
      eventsByDay.set(date.getDate(), [...(eventsByDay.get(date.getDate()) ?? []), company]);
    }
  });
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const firstCompany = datedCompanies[0]?.company ?? companies[0];
  const lastCompany = datedCompanies[datedCompanies.length - 1]?.company ?? companies[companies.length - 1];
  return <Card className={compact ? 'p-4' : 'p-5'}><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-ink-900">{year}년 {month + 1}월</h3><div className="flex gap-1">{firstCompany ? <button type="button" onClick={() => onSelect(firstCompany)} className="h-8 rounded-md border border-ink-200 px-2 text-xs hover:border-primary-500">첫 일정</button> : null}{lastCompany ? <button type="button" onClick={() => onSelect(lastCompany)} className="h-8 rounded-md border border-ink-200 px-2 text-xs hover:border-primary-500">마지막 일정</button> : null}</div></div><div className="grid grid-cols-7 gap-1 text-center text-caption text-ink-500">{['월','화','수','목','금','토','일'].map((day)=><span key={day} className="py-1 font-medium">{day}</span>)}{Array.from({ length: leadingBlankCount }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: lastDate }, (_, index) => { const day = index + 1; const dayCompanies = eventsByDay.get(day) ?? []; const company = dayCompanies[0]; return <button type="button" key={day} disabled={!company} onClick={() => company && onSelect(company)} className={`relative flex h-8 items-center justify-center rounded-full text-caption ${isCurrentMonth && day === today.getDate() ? 'bg-primary-600 text-white' : company ? 'hover:bg-ink-100' : 'text-ink-300'}`}>{day}{company ? <span className={`absolute bottom-1 h-1 w-1 rounded-full ${dotClass[company.status]}`}/> : null}</button>; })}</div><div className="mt-4 flex flex-wrap gap-2">{(['수요예측','청약','상장','예비심사'] as IpoStatus[]).map((label)=><span key={label} className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-1 text-xs text-ink-600"><span className={`h-1.5 w-1.5 rounded-full ${dotClass[label]}`}/>{label}</span>)}</div></Card>;
}

export function StepCard({ number, label, desc, onClick }: { number:number; label:string; desc:string; onClick:()=>void }) { return <Card className="p-6"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white tabular">{number}</span><h3 className="mt-4 font-bold text-ink-900">{label}</h3><p className="mt-2 text-sm leading-6 text-ink-500">{desc}</p><Button variant="secondary" onClick={onClick} className="mt-4 w-full">확인</Button></Card>; }

export function CalendarCard({ company, onOpen }: { company: Company; onOpen: () => void }) { return <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-md bg-ink-50 px-3 py-2 text-left hover:bg-primary-50"><CalendarDays size={16} className="text-primary-600"/><span className="min-w-0 flex-1 truncate text-sm text-ink-700">{company.date} {company.name}</span><StatusBadge label={company.status}/></button>; }
export function formatDateFallback(value: string) { return value || '일정 확인 중'; }
