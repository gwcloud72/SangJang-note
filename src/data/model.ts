import { CalendarDays, FileText, Newspaper, TrendingUp } from 'lucide-react';
import type { BottomWidget, MetricItem } from '../components/common/types';
export type IpoStatus = '예비심사' | '수요예측' | '청약 예정' | '청약 진행중' | '환불일' | '상장';
export interface Company { id:string; name:string; sector?:string; underwriter:string; status:IpoStatus; date:string; dday:string; color:'green'|'blue'|'purple'|'amber'|'gray'; bookmarked:boolean; memo:string; scheduleStart?:string; scheduleEnd?:string; demandForecastStart?:string; demandForecastEnd?:string; subscriptionStart?:string; subscriptionEnd?:string; refundDate?:string; listingDate?:string; }
export interface Filing { id:string; company:string; title:string; date:string; type:IpoStatus; link:string; }
export interface NewsItem { id:string; company:string; title:string; source:string; date:string; link:string; summary:string; }
export interface ReportItem { id:string; title:string; summary:string; }

export const companies: Company[] = [
  { id:'company-bigwave-robotics', name:'빅웨이브로보틱스', sector:'로봇 플랫폼 기업', underwriter:'유진투자증권·미래에셋증권', status:'예비심사', date:'06.16', dday:'D-2', color:'blue', bookmarked:false, memo:'로봇 플랫폼 공모 일정과 주관사를 함께 확인하세요.' },
  { id:'company-stradvision', name:'스트라드비젼', sector:'자율주행 인식 소프트웨어 기업', underwriter:'KB증권', status:'청약 예정', date:'06.18', dday:'D-4', color:'amber', bookmarked:false, memo:'청약 시작 전 원문 일정과 주관사 공지를 확인하세요.', subscriptionStart:'2026-06-18', subscriptionEnd:'2026-06-19' },
  { id:'company-justek', name:'져스텍', sector:'초정밀 모션제어 장비 기업', underwriter:'삼성증권', status:'청약 예정', date:'06.18', dday:'D-4', color:'amber', bookmarked:false, memo:'청약 시작 전 원문 일정을 확인하세요.', subscriptionStart:'2026-06-18', subscriptionEnd:'2026-06-19' },
  { id:'company-korea-spac16', name:'한국제16호스팩', sector:'스팩 IPO 기업', underwriter:'한국투자증권', status:'청약 예정', date:'06.22', dday:'D-8', color:'amber', bookmarked:false, memo:'스팩 공모 청약 일정과 주관사를 확인하세요.', subscriptionStart:'2026-06-22', subscriptionEnd:'2026-06-23' },
  { id:'company-madup', name:'매드업', sector:'AI 마케팅 솔루션 기업', underwriter:'미래에셋증권', status:'예비심사', date:'06.23', dday:'D-9', color:'blue', bookmarked:false, memo:'AI 마케팅 기업 예비심사 일정을 확인하세요.' },
  { id:'company-lemonhealthcare', name:'레몬헬스케어', sector:'헬스케어 플랫폼 기업', underwriter:'KB증권', status:'청약 예정', date:'06.24', dday:'D-10', color:'amber', bookmarked:false, memo:'헬스케어 플랫폼 기업 청약 예정 일정을 확인하세요.', subscriptionStart:'2026-06-24', subscriptionEnd:'2026-06-25' }
];

export const filings: Filing[] = [
  { id:'filing-1', company:'빅웨이브로보틱스', title:'예비심사 일정 확인', date:'2026-06-16', type:'예비심사', link:'' },
  { id:'filing-2', company:'스트라드비젼', title:'공모 청약 예정 일정 확인', date:'2026-06-18', type:'청약 예정', link:'' },
  { id:'filing-3', company:'져스텍', title:'공모 청약 예정 일정 확인', date:'2026-06-18', type:'청약 예정', link:'' },
  { id:'filing-4', company:'한국제16호스팩', title:'스팩 청약 예정 일정 확인', date:'2026-06-22', type:'청약 예정', link:'' },
  { id:'filing-5', company:'매드업', title:'예비심사 일정 확인', date:'2026-06-23', type:'예비심사', link:'' },
  { id:'filing-6', company:'레몬헬스케어', title:'공모 청약 예정 일정 확인', date:'2026-06-24', type:'청약 예정', link:'' }
];

export const news: NewsItem[] = [
  { id:'ipo-news-1', company:'빅웨이브로보틱스', title:'빅웨이브로보틱스 예비심사 일정 확인', source:'마켓데일리', date:'06.14', link:'', summary:'로봇 플랫폼 기업 예비심사 일정과 주관사를 함께 봅니다.' },
  { id:'ipo-news-2', company:'스트라드비젼', title:'스트라드비젼 청약 일정 사전 점검', source:'경제신문', date:'06.14', link:'', summary:'자율주행 인식 소프트웨어 기업 청약 예정 일정을 확인합니다.' },
  { id:'ipo-news-3', company:'져스텍', title:'져스텍 청약 일정 사전 확인', source:'IPO포커스', date:'06.14', link:'', summary:'초정밀 모션제어 기업의 청약 일정을 확인합니다.' },
  { id:'ipo-news-4', company:'한국제16호스팩', title:'한국제16호스팩 청약 일정 확인', source:'증권뉴스', date:'06.14', link:'', summary:'스팩 공모 청약 일정과 주관사를 확인합니다.' },
  { id:'ipo-news-5', company:'매드업', title:'매드업 예비심사 일정 확인', source:'마켓데일리', date:'06.14', link:'', summary:'AI 마케팅 기업의 예비심사 일정을 확인합니다.' }
];

export const reports: ReportItem[] = [
  { id:'report-1', title:'6월 하순 공모주 일정', summary:'06.18~06.25 사이 공모주 청약 예정 기업이 이어져 일정과 주관사를 먼저 확인합니다.' },
  { id:'report-2', title:'동시 일정 체크', summary:'06.18에는 스트라드비젼과 져스텍 청약 예정 일정이 함께 표시됩니다.' },
  { id:'report-3', title:'공시 확인 순서', summary:'공모 청약일, 주관사, 원문 일정, 정정 공시 순서로 확인합니다.' }
];

export const widgets: BottomWidget[] = [
  { title:'다가오는 일정', action:'일정 캘린더', items:['06.18 스트라드비젼','06.18 져스텍','06.22 한국제16호스팩'] },
  { title:'IPO 흐름', action:'타임라인', items:['06.18 청약 예정','06.23 매드업','06.24 레몬헬스케어'] },
  { title:'뉴스·공시', action:'공시 검색', items:['빅웨이브로보틱스','스트라드비젼','져스텍'] }
];

export const metrics: MetricItem[] = [
  {label:'청약 임박',value:'4건',sub:'6월 하순 기준',icon:TrendingUp},
  {label:'가까운 일정',value:'2건',sub:'06.18 시작',icon:CalendarDays},
  {label:'공모 일정',value:'6건',sub:'공모주 기준',icon:FileText},
  {label:'시장환경',value:'4개',sub:'참고 지표',icon:Newspaper}
];
