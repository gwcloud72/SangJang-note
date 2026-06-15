import { CalendarDays, Clock, Star } from 'lucide-react';
import { Card, StatusBadge, Button } from '../common/ui';
import type { Company, IpoStatus } from '../../data/model';

const badgeClass = { green:'company-tone-green', blue:'company-tone-blue', purple:'company-tone-purple', amber:'company-tone-amber', gray:'company-tone-gray' } as const;
const borderClass = { green:'border-l-primary-600', blue:'border-l-blue-700', purple:'border-l-violet-700', amber:'border-l-amber-600', gray:'border-l-ink-400' } as const;
const dotClass: Record<IpoStatus, string> = { 예비심사:'calendar-dot-review', '청약 예정':'calendar-dot-subscribe', '청약 진행중':'calendar-dot-subscribe', 환불일:'calendar-dot-subscribe',  상장:'calendar-dot-listing' };

type IndustryIconRule = { icon: string; label: string; keys: string[] };
const industryIconRules: IndustryIconRule[] = [
  { icon: '🤖', label: '로봇', keys: ['로봇', 'robot'] },
  { icon: '🚗', label: '자율주행', keys: ['자율주행', '모빌리티', '자동차'] },
  { icon: '🩺', label: '헬스케어', keys: ['헬스', '바이오', '의료', 'health'] },
  { icon: '📣', label: '마케팅', keys: ['마케팅', '광고', '커머스'] },
  { icon: '🧪', label: '소재', keys: ['소재', '반도체', 'rf', '전자소재'] },
  { icon: '🔌', label: '전자부품', keys: ['전자부품', '전자', '부품'] },
  { icon: '⚙️', label: '장비', keys: ['장비', '제조', '모션', '정밀', '자동화'] },
  { icon: '💻', label: '소프트웨어', keys: ['소프트웨어', '솔루션', 'ai'] },
];
function industryIconFor(company: Company): { icon: string; label: string } {
  const haystack = `${company.sector ?? ''} ${company.memo} ${company.name}`.toLowerCase();
  const matched = industryIconRules.find((rule) => rule.keys.some((key) => haystack.includes(key.toLowerCase())));
  return matched ?? { icon: '🏢', label: 'IPO 기업' };
}

export function CompanyBadge({ company }: { company: Company }) {
  const industry = industryIconFor(company);
  return <span aria-label={`${industry.label} 아이콘`} title={industry.label} className={`flex h-10 w-10 items-center justify-center rounded-lg text-[21px] leading-none ${badgeClass[company.color]}`}>{industry.icon}</span>;
}


function dateCompact(value?: string) { return value && value.includes('-') ? value.slice(5).replace('-', '.') : value || '미정'; }
function dateRangeCompact(start?: string, end?: string) { if (!start && !end) return '미정'; if (start && end && start !== end) return `${dateCompact(start)}–${dateCompact(end)}`; return dateCompact(start || end); }
function listingLabel(company: Company) { return company.listingDate ? dateCompact(company.listingDate) : '미정'; }
function refundMetaLabel(company: Company) { if (company.refundDate) return `환불 ${dateCompact(company.refundDate)}`; return company.subscriptionStart || company.subscriptionEnd ? '환불일 확인' : ''; }
function scheduleMetaLabel(company: Company) {
  const items = [
    company.subscriptionStart || company.subscriptionEnd ? `청약 ${dateRangeCompact(company.subscriptionStart, company.subscriptionEnd)}` : '',
    refundMetaLabel(company),
    company.listingDate ? `상장 ${listingLabel(company)}` : company.subscriptionStart || company.subscriptionEnd ? '상장 미정' : '',
  ].filter(Boolean);
  return items.join(' · ') || company.date;
}

export function CompanyCard({ company, onToggle, compact = false, showWatchButton = true }: { company: Company; onToggle?: () => void; compact?: boolean; showWatchButton?: boolean }) { return <Card className={`v6-card-hover ${compact ? 'p-ds-2' : 'p-ds-3'}`}><div className="flex items-start justify-between gap-ds-2"><div className="flex min-w-0 items-center gap-ds-2"><CompanyBadge company={company}/><div className="min-w-0"><h3 className="truncate text-[15px] font-bold text-ink-900">{company.name}</h3><p className="truncate text-[13px] text-ink-500">{company.underwriter}</p><p className="truncate text-[11px] text-ink-400 tabular">{scheduleMetaLabel(company)}</p></div></div>{showWatchButton && onToggle ? <button type="button" onClick={onToggle} aria-pressed={company.bookmarked} className="v6-fav-button shrink-0 rounded-full bg-primary-100 p-ds-0.5 text-primary-600"><Star size={17} fill={company.bookmarked?'currentColor':'none'}/></button> : null}</div><div className="mt-ds-2 flex items-center justify-between gap-ds-1"><StatusBadge label={company.status}/><span className="rounded-full bg-ink-100 px-ds-1 py-ds-0.5 text-[13px] text-ink-500 tabular">{company.date}</span></div></Card>; }

export function DayCard({ company, onOpen }: { company: Company; onOpen: () => void }) { return <button type="button" onClick={onOpen} className={`v6-list-row w-full rounded-lg border border-ink-200 border-l-3 bg-white p-ds-3 text-left shadow-card transition hover:border-primary-400 hover:shadow-card-hover ${borderClass[company.color]}`}><div className="flex items-center justify-between gap-ds-1"><strong className="truncate text-[15px] text-ink-900">{company.name}</strong><span className="flex shrink-0 items-center gap-ds-0.5 rounded-full bg-ink-100 px-ds-1 py-ds-0.5 text-[13px] text-ink-500"><Clock size={13}/>{company.date}</span></div><div className="mt-ds-2 flex items-center gap-ds-2"><CompanyBadge company={company}/><div className="min-w-0"><p className="truncate text-[13px] text-ink-700">{company.underwriter}</p><p className="truncate text-[11px] text-ink-400 tabular">{scheduleMetaLabel(company)}</p><StatusBadge label={company.status}/></div></div></button>; }

export function DisclaimerBanner() { return <div className="flex flex-wrap items-center gap-x-ds-3 gap-y-ds-1 rounded-lg border border-warn-border bg-warn-bg px-ds-3 py-ds-1.5 text-[13px] text-warn-text"><span>투자 권유가 아닙니다</span><span>공시 원문 확인 필수</span><span>일정 참고용</span><span>최종 판단 이용자 책임</span></div>; }

function pad2(value: number) { return String(value).padStart(2, '0'); }
function calendarDateFromParts(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
function kstTodayDate(): Date {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number);
  return calendarDateFromParts(parts[0], parts[1], parts[2]) ?? new Date();
}
function dateKey(date: Date): string { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`; }
function parseFullCalendarDate(value?: string): Date | null {
  const text = String(value ?? '').trim();
  const compact = /^(20\d{2})(\d{2})(\d{2})$/.exec(text);
  if (compact) return calendarDateFromParts(Number(compact[1]), Number(compact[2]), Number(compact[3]));
  const full = /^(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(text);
  if (full) return calendarDateFromParts(Number(full[1]), Number(full[2]), Number(full[3]));
  return null;
}
function parseCalendarDate(value?: string, referenceDate?: string): Date | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const full = parseFullCalendarDate(text);
  if (full) return full;
  const short = /^(\d{1,2})[.\-/](\d{1,2})/.exec(text);
  if (!short) return null;
  const reference = parseFullCalendarDate(referenceDate) ?? kstTodayDate();
  const month = Number(short[1]);
  const day = Number(short[2]);
  let candidate = calendarDateFromParts(reference.getFullYear(), month, day);
  if (!candidate) return null;
  const diffDays = Math.round((candidate.getTime() - reference.getTime()) / 86400000);
  if (diffDays < -210) candidate = calendarDateFromParts(reference.getFullYear() + 1, month, day) ?? candidate;
  if (diffDays > 210) candidate = calendarDateFromParts(reference.getFullYear() - 1, month, day) ?? candidate;
  return candidate;
}
function companyCalendarDate(company: Company, referenceDate?: string): Date | null {
  const statusDate = company.status === '환불일' ? company.refundDate : company.status === '상장' ? company.listingDate : undefined;
  const candidates = [statusDate, company.subscriptionStart, company.scheduleStart, company.date, company.subscriptionEnd, company.scheduleEnd, company.refundDate, company.listingDate];
  for (const candidate of candidates) {
    const date = parseCalendarDate(candidate, referenceDate);
    if (date) return date;
  }
  return null;
}
function maxCalendarDate(date: Date, fallback: Date): Date { return dateKey(date) >= dateKey(fallback) ? date : fallback; }

export function IPOCalendar({ companies, onSelect, compact = false, referenceDate }: { companies: Company[]; onSelect: (company: Company) => void; compact?: boolean; referenceDate?: string }) {
  const today = kstTodayDate();
  const reference = maxCalendarDate(parseCalendarDate(referenceDate) ?? today, today);
  const datedCompanies = companies
    .map((company) => ({ company, date: companyCalendarDate(company, dateKey(reference)) }))
    .filter((item): item is { company: Company; date: Date } => Boolean(item.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.company.name.localeCompare(b.company.name, 'ko'));
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const leadingBlankCount = (firstDay.getDay() + 6) % 7;
  const eventsByDay = new Map<number, Company[]>();
  datedCompanies.forEach(({ company, date }) => {
    if (date.getFullYear() === year && date.getMonth() === month) {
      eventsByDay.set(date.getDate(), [...(eventsByDay.get(date.getDate()) ?? []), company]);
    }
  });
  const referenceKey = dateKey(reference);
  const upcomingCompanies = datedCompanies.filter(({ date }) => dateKey(date) >= referenceKey);
  const firstCompany = upcomingCompanies[0]?.company ?? datedCompanies[0]?.company ?? companies[0];
  const lastCompany = upcomingCompanies[upcomingCompanies.length - 1]?.company ?? datedCompanies[datedCompanies.length - 1]?.company ?? companies[companies.length - 1];
  return <Card className={compact ? 'p-ds-2' : 'p-ds-3'}><div className="mb-ds-2 flex items-center justify-between"><h3 className="text-[15px] font-bold text-ink-900">{year}년 {month + 1}월</h3><div className="flex gap-ds-1">{firstCompany ? <button type="button" onClick={() => onSelect(firstCompany)} className="h-8 rounded-md border border-ink-200 px-ds-1 text-[13px] hover:border-primary-500">첫 일정</button> : null}{lastCompany ? <button type="button" onClick={() => onSelect(lastCompany)} className="h-8 rounded-md border border-ink-200 px-ds-1 text-[13px] hover:border-primary-500">마지막 일정</button> : null}</div></div><div className="grid grid-cols-7 gap-ds-0.5 text-center text-[13px] text-ink-500">{['월','화','수','목','금','토','일'].map((day)=><span key={day} className="py-ds-0.5 text-[11px]">{day}</span>)}{Array.from({ length: leadingBlankCount }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: lastDate }, (_, index) => { const day = index + 1; const dayCompanies = eventsByDay.get(day) ?? []; const company = dayCompanies[0]; const isReferenceDay = day === reference.getDate(); return <button type="button" key={day} disabled={!company} onClick={() => company && onSelect(company)} className={`relative flex h-8 items-center justify-center rounded-full text-[13px] transition-fast duration-fast ${isReferenceDay ? 'v6-calendar-today bg-primary-600 text-white' : company ? 'hover:bg-primary-50' : 'text-ink-300'}`}>{day}{company ? <span className={`absolute bottom-ds-0.5 h-1 w-1 rounded-full ${dotClass[company.status]}`}/> : null}</button>; })}</div><div className="mt-ds-2 flex flex-wrap gap-ds-1">{(['예비심사','청약 예정','청약 진행중','환불일','상장'] as IpoStatus[]).map((label)=><span key={label} className="inline-flex items-center gap-ds-0.5 rounded-full bg-ink-100 px-ds-1 py-ds-0.5 text-[11px] text-ink-500"><span className={`h-1 w-1 rounded-full ${dotClass[label]}`}/>{label === '청약 진행중' ? '청약 진행중' : label}</span>)}</div></Card>;
}

export function StepCard({ number, label, onClick }: { number:number; label:string; onClick:()=>void }) { return <Card className="p-ds-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-[13px] font-bold text-white tabular">{number}</span><h3 className="mt-ds-2 font-bold text-ink-900">{label}</h3><Button variant="secondary" onClick={onClick} className="mt-ds-2 w-full">확인</Button></Card>; }

export function CalendarCard({ company, onOpen }: { company: Company; onOpen: () => void }) { return <button type="button" onClick={onOpen} className="v6-list-row flex w-full items-center gap-ds-2 rounded-md bg-ink-50 px-ds-2 py-ds-1.5 text-left hover:bg-primary-50"><CalendarDays size={16} className="shrink-0 text-primary-600"/><span className="min-w-0 flex-1"><span className="block truncate text-[13px] text-ink-700">{company.date} {company.name}</span><span className="block truncate text-[11px] text-ink-400 tabular">{scheduleMetaLabel(company)}</span></span><StatusBadge label={company.status}/></button>; }
export function formatDateFallback(value: string) { return value || '일정 확인'; }
