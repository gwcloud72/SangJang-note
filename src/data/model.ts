import { CalendarDays, FileText, Newspaper, TrendingUp } from 'lucide-react';
import type { BottomWidget, MetricItem } from '../components/common/types';
export type IpoStatus = '수요예측' | '청약' | '상장' | '예비심사';
export interface Company { id:string; name:string; short:string; underwriter:string; status:IpoStatus; date:string; dday:string; color:'green'|'blue'|'purple'|'amber'|'gray'; bookmarked:boolean; memo:string; }
export interface Filing { id:string; company:string; title:string; date:string; type:IpoStatus; link:string; }
export interface NewsItem { id:string; company:string; title:string; source:string; date:string; link:string; summary:string; }
export interface ReportItem { id:string; title:string; summary:string; }

export const companies: Company[] = [
  { id:'company-rf-materials', name:'RF머트리얼즈', short:'RF', underwriter:'NH투자증권', status:'청약', date:'06.18', dday:'D-6', color:'green', bookmarked:true, memo:'코스닥 공모 청약 시작 일정을 확인하세요.' },
  { id:'company-bigwave-robotics', name:'빅웨이브로보틱스', short:'빅웨이브', underwriter:'유진투자증권·미래에셋증권', status:'청약', date:'06.18', dday:'D-6', color:'green', bookmarked:true, memo:'로봇 플랫폼 공모 일정과 환불일을 함께 확인하세요.' },
  { id:'company-stradvision', name:'스트라드비젼', short:'스트라드', underwriter:'KB증권', status:'청약', date:'06.18', dday:'D-6', color:'green', bookmarked:true, memo:'자율주행 소프트웨어 기업 청약 일정을 확인하세요.' },
  { id:'company-justek', name:'져스텍', short:'져스텍', underwriter:'삼성증권', status:'청약', date:'06.18', dday:'D-6', color:'green', bookmarked:false, memo:'초정밀 모션제어 기업 수요예측 이후 청약 일정을 확인하세요.' },
  { id:'company-pmt', name:'피엠티', short:'피엠티', underwriter:'한국투자증권', status:'청약', date:'06.19', dday:'D-7', color:'green', bookmarked:false, memo:'청약 시작일과 종료일을 공시 기준으로 확인하세요.' },
  { id:'company-newintech', name:'뉴인텍', short:'뉴인텍', underwriter:'신한투자증권', status:'청약', date:'06.22', dday:'D-10', color:'green', bookmarked:false, memo:'다음 주 청약 일정 변동 여부를 확인하세요.' },
  { id:'company-madup', name:'매드업', short:'매드업', underwriter:'미래에셋증권', status:'청약', date:'06.23', dday:'D-11', color:'green', bookmarked:false, memo:'AI 마케팅 기업 공모 청약 일정을 확인하세요.' },
  { id:'company-lemonhealthcare', name:'레몬헬스케어', short:'레몬', underwriter:'KB증권', status:'청약', date:'06.24', dday:'D-12', color:'green', bookmarked:false, memo:'헬스케어 플랫폼 기업 청약 일정을 확인하세요.' }
];

export const filings: Filing[] = [
  { id:'filing-1', company:'RF머트리얼즈', title:'공모 청약 일정 확인', date:'2026-06-18', type:'청약', link:'' },
  { id:'filing-2', company:'빅웨이브로보틱스', title:'공모 청약 일정 확인', date:'2026-06-18', type:'청약', link:'' },
  { id:'filing-3', company:'스트라드비젼', title:'공모 청약 일정 확인', date:'2026-06-18', type:'청약', link:'' },
  { id:'filing-4', company:'져스텍', title:'공모 청약 일정 확인', date:'2026-06-18', type:'청약', link:'' },
  { id:'filing-5', company:'피엠티', title:'공모 청약 일정 확인', date:'2026-06-19', type:'청약', link:'' },
  { id:'filing-6', company:'뉴인텍', title:'공모 청약 일정 확인', date:'2026-06-22', type:'청약', link:'' }
];

export const news: NewsItem[] = [
  { id:'ipo-news-1', company:'스트라드비젼', title:'스트라드비젼 청약 일정 확인', source:'경제신문', date:'06.08', link:'', summary:'DART 청약 달력 기준 6월 18일 시작 일정을 확인합니다.' },
  { id:'ipo-news-2', company:'빅웨이브로보틱스', title:'빅웨이브로보틱스 공모 일정 점검', source:'마켓데일리', date:'06.09', link:'', summary:'로봇 플랫폼 기업 청약 일정과 주관사를 함께 봅니다.' },
  { id:'ipo-news-3', company:'져스텍', title:'져스텍 수요예측 이후 청약 준비', source:'IPO포커스', date:'06.10', link:'', summary:'초정밀 모션제어 기업의 청약 일정과 환불일을 확인합니다.' },
  { id:'ipo-news-4', company:'매드업', title:'매드업 6월 하순 청약 일정 확인', source:'증권뉴스', date:'06.11', link:'', summary:'AI 마케팅 기업의 수요예측과 공모 청약 일정을 확인합니다.' }
];

export const reports: ReportItem[] = [
  { id:'report-1', title:'6월 하순 청약 집중', summary:'06.18~06.25 사이 공모 청약 일정이 몰려 있어 일정별 증거금과 환불일 확인이 필요합니다.' },
  { id:'report-2', title:'동시 청약일 체크', summary:'06.18에는 RF머트리얼즈, 빅웨이브로보틱스, 스트라드비젼, 져스텍 일정이 함께 표시됩니다.' },
  { id:'report-3', title:'공시 확인 순서', summary:'청약일, 주관사, 정정 공시, 환불일 순서로 확인하면 주요 변경사항을 놓치기 쉽지 않습니다.' }
];

export const widgets: BottomWidget[] = [
  { title:'다가오는 일정', action:'일정 캘린더', items:['06.18 스트라드비젼','06.18 져스텍','06.19 피엠티'] },
  { title:'IPO 흐름', action:'타임라인', items:['06.18 청약 집중','06.23 매드업','06.24 레몬헬스케어'] },
  { title:'뉴스·공시', action:'공시 검색', items:['빅웨이브로보틱스','스트라드비젼','져스텍'] }
];

export const metrics: MetricItem[] = [
  {label:'청약 일정',value:'8건',sub:'6월 하순 기준',icon:TrendingUp},
  {label:'가까운 일정',value:'4건',sub:'06.18 시작',icon:CalendarDays},
  {label:'공시 일정',value:'8건',sub:'DART 달력 기준',icon:FileText},
  {label:'관심기업',value:'3건',sub:'저장 항목',icon:Newspaper}
];
