import { CalendarDays, FileText, Newspaper, TrendingUp } from 'lucide-react';
import type { BottomWidget, MetricItem } from '../components/common/types';
export type IpoStatus = '예비심사' | '수요예측' | '청약 예정' | '청약 진행중' | '환불일' | '상장';
export interface Company { id:string; name:string; sector?:string; underwriter:string; status:IpoStatus; date:string; dday:string; color:'green'|'blue'|'purple'|'amber'|'gray'; bookmarked:boolean; memo:string; scheduleStart?:string; scheduleEnd?:string; demandForecastStart?:string; demandForecastEnd?:string; subscriptionStart?:string; subscriptionEnd?:string; refundDate?:string; listingDate?:string; }
export interface Filing { id:string; company:string; title:string; date:string; type:IpoStatus; link:string; }
export interface NewsItem { id:string; company:string; title:string; source:string; date:string; link:string; summary:string; }
export interface ReportItem { id:string; title:string; summary:string; }

function pad2(value: number): string { return String(value).padStart(2, '0'); }
function kstDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
function shortDate(isoDate: string): string { return isoDate.slice(5).replace('-', '.'); }
function dday(isoDate: string, referenceDate: string): string {
  const diff = Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${referenceDate}T00:00:00Z`)) / 86400000);
  if (diff === 0) return 'D-Day';
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

const fallbackReferenceDate = kstDateString();
const fallbackDates = {
  bigwave: addDaysIso(fallbackReferenceDate, 2),
  stradStart: addDaysIso(fallbackReferenceDate, 4),
  stradEnd: addDaysIso(fallbackReferenceDate, 5),
  justekStart: addDaysIso(fallbackReferenceDate, 4),
  justekEnd: addDaysIso(fallbackReferenceDate, 5),
  spacStart: addDaysIso(fallbackReferenceDate, 8),
  spacEnd: addDaysIso(fallbackReferenceDate, 9),
  madup: addDaysIso(fallbackReferenceDate, 9),
  lemonStart: addDaysIso(fallbackReferenceDate, 10),
  lemonEnd: addDaysIso(fallbackReferenceDate, 11),
};

export const companies: Company[] = [
  { id:'company-bigwave-robotics', name:'빅웨이브로보틱스', sector:'로봇 플랫폼 기업', underwriter:'유진투자증권·미래에셋증권', status:'예비심사', date:shortDate(fallbackDates.bigwave), dday:dday(fallbackDates.bigwave, fallbackReferenceDate), color:'blue', bookmarked:false, memo:'로봇 플랫폼 공모 일정과 주관사를 함께 확인하세요.', scheduleStart:fallbackDates.bigwave, scheduleEnd:fallbackDates.bigwave },
  { id:'company-stradvision', name:'스트라드비젼', sector:'자율주행 인식 소프트웨어 기업', underwriter:'KB증권', status:'청약 예정', date:shortDate(fallbackDates.stradStart), dday:dday(fallbackDates.stradStart, fallbackReferenceDate), color:'amber', bookmarked:false, memo:'청약 시작 전 원문 일정과 주관사 공지를 확인하세요.', subscriptionStart:fallbackDates.stradStart, subscriptionEnd:fallbackDates.stradEnd },
  { id:'company-justek', name:'져스텍', sector:'초정밀 모션제어 장비 기업', underwriter:'삼성증권', status:'청약 예정', date:shortDate(fallbackDates.justekStart), dday:dday(fallbackDates.justekStart, fallbackReferenceDate), color:'amber', bookmarked:false, memo:'청약 시작 전 원문 일정을 확인하세요.', subscriptionStart:fallbackDates.justekStart, subscriptionEnd:fallbackDates.justekEnd },
  { id:'company-korea-spac16', name:'한국제16호스팩', sector:'스팩 IPO 기업', underwriter:'한국투자증권', status:'청약 예정', date:shortDate(fallbackDates.spacStart), dday:dday(fallbackDates.spacStart, fallbackReferenceDate), color:'amber', bookmarked:false, memo:'스팩 공모 청약 일정과 주관사를 확인하세요.', subscriptionStart:fallbackDates.spacStart, subscriptionEnd:fallbackDates.spacEnd },
  { id:'company-madup', name:'매드업', sector:'AI 마케팅 솔루션 기업', underwriter:'미래에셋증권', status:'예비심사', date:shortDate(fallbackDates.madup), dday:dday(fallbackDates.madup, fallbackReferenceDate), color:'blue', bookmarked:false, memo:'AI 마케팅 기업 예비심사 일정을 확인하세요.', scheduleStart:fallbackDates.madup, scheduleEnd:fallbackDates.madup },
  { id:'company-lemonhealthcare', name:'레몬헬스케어', sector:'헬스케어 플랫폼 기업', underwriter:'KB증권', status:'청약 예정', date:shortDate(fallbackDates.lemonStart), dday:dday(fallbackDates.lemonStart, fallbackReferenceDate), color:'amber', bookmarked:false, memo:'헬스케어 플랫폼 기업 청약 예정 일정을 확인하세요.', subscriptionStart:fallbackDates.lemonStart, subscriptionEnd:fallbackDates.lemonEnd }
];

export const filings: Filing[] = [
  { id:'filing-1', company:'빅웨이브로보틱스', title:'예비심사 일정 확인', date:fallbackDates.bigwave, type:'예비심사', link:'' },
  { id:'filing-2', company:'스트라드비젼', title:'공모 청약 예정 일정 확인', date:fallbackDates.stradStart, type:'청약 예정', link:'' },
  { id:'filing-3', company:'져스텍', title:'공모 청약 예정 일정 확인', date:fallbackDates.justekStart, type:'청약 예정', link:'' },
  { id:'filing-4', company:'한국제16호스팩', title:'스팩 청약 예정 일정 확인', date:fallbackDates.spacStart, type:'청약 예정', link:'' },
  { id:'filing-5', company:'매드업', title:'예비심사 일정 확인', date:fallbackDates.madup, type:'예비심사', link:'' },
  { id:'filing-6', company:'레몬헬스케어', title:'공모 청약 예정 일정 확인', date:fallbackDates.lemonStart, type:'청약 예정', link:'' }
];

export const news: NewsItem[] = [
  { id:'ipo-news-1', company:'빅웨이브로보틱스', title:'빅웨이브로보틱스 예비심사 일정 확인', source:'마켓데일리', date:shortDate(fallbackReferenceDate), link:'', summary:'로봇 플랫폼 기업 예비심사 일정과 주관사를 함께 봅니다.' },
  { id:'ipo-news-2', company:'스트라드비젼', title:'스트라드비젼 청약 일정 사전 점검', source:'경제신문', date:shortDate(fallbackReferenceDate), link:'', summary:'자율주행 인식 소프트웨어 기업 청약 예정 일정을 확인합니다.' },
  { id:'ipo-news-3', company:'져스텍', title:'져스텍 청약 일정 사전 확인', source:'IPO포커스', date:shortDate(fallbackReferenceDate), link:'', summary:'초정밀 모션제어 기업의 청약 일정을 확인합니다.' },
  { id:'ipo-news-4', company:'한국제16호스팩', title:'한국제16호스팩 청약 일정 확인', source:'증권뉴스', date:shortDate(fallbackReferenceDate), link:'', summary:'스팩 공모 청약 일정과 주관사를 확인합니다.' },
  { id:'ipo-news-5', company:'매드업', title:'매드업 예비심사 일정 확인', source:'마켓데일리', date:shortDate(fallbackReferenceDate), link:'', summary:'AI 마케팅 기업의 예비심사 일정을 확인합니다.' }
];

export const reports: ReportItem[] = [
  { id:'report-1', title:'가까운 공모주 일정', summary:`${shortDate(fallbackDates.stradStart)}~${shortDate(fallbackDates.lemonEnd)} 사이 공모주 청약 예정 기업이 이어져 일정과 주관사를 먼저 확인합니다.` },
  { id:'report-2', title:'동시 일정 체크', summary:`${shortDate(fallbackDates.stradStart)}에는 스트라드비젼과 져스텍 청약 예정 일정이 함께 표시됩니다.` },
  { id:'report-3', title:'공시 확인 순서', summary:'공모 청약일, 주관사, 원문 일정, 정정 공시 순서로 확인합니다.' }
];

export const widgets: BottomWidget[] = [
  { title:'다가오는 일정', action:'일정 캘린더', items:[`${shortDate(fallbackDates.stradStart)} 스트라드비젼`, `${shortDate(fallbackDates.justekStart)} 져스텍`, `${shortDate(fallbackDates.spacStart)} 한국제16호스팩`] },
  { title:'IPO 흐름', action:'타임라인', items:[`${shortDate(fallbackDates.stradStart)} 청약 예정`, `${shortDate(fallbackDates.madup)} 매드업`, `${shortDate(fallbackDates.lemonStart)} 레몬헬스케어`] },
  { title:'뉴스·공시', action:'공시 검색', items:['빅웨이브로보틱스','스트라드비젼','져스텍'] }
];

export const metrics: MetricItem[] = [
  {label:'청약 임박',value:'4건',sub:'가까운 예정 일정 기준',icon:TrendingUp},
  {label:'가까운 일정',value:'2건',sub:`${shortDate(fallbackDates.stradStart)} 시작`,icon:CalendarDays},
  {label:'공모 일정',value:'6건',sub:'공모주 기준',icon:FileText},
  {label:'시장환경',value:'확인',sub:'연동 데이터 기준',icon:Newspaper}
];
