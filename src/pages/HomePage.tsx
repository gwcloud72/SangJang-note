import { HeroBanner } from '../components/common/HeroBanner';
import { BottomWidgetPanel, Card, DataTable, SectionHeader, StatsStrip, StatusBadge } from '../components/common/ui';
import { CompanyCard, DayCard, DisclaimerBanner } from '../components/feature/sang';
import type { SangData } from '../data/normalize';
import brandMark from '../assets/home-brand-mark.webp';

interface PageProps { data: SangData; onTabChange: (tab: string) => void; onAction: (text: string) => void; }

function uniqueCompanies(companies: SangData['companies']): SangData['companies'] {
  return Array.from(new Map(companies.map((company) => [company.name, company])).values());
}

export function HomePage({ data, onTabChange, onAction }: PageProps) {
  const today = data.companies[0];
  const watchlist = uniqueCompanies([...data.companies.filter((company) => company.bookmarked), ...data.companies]).slice(0, 4);
  const todayFilings = data.filings.slice(0, 4);
  return <div className="space-y-ds-4">
    <HeroBanner
      kind="sang"
      badge="오늘의 IPO"
      title="IPO 일정과 공시를 한곳에"
      subtitle={`${today.name} ${today.status} 일정이 가장 가깝습니다. 관심기업과 공시를 순서대로 확인하세요.`}
      chips={['수요예측','청약','상장','예비심사']}
      primaryLabel="기업 검색"
      secondaryLabel="공시 검색"
      onPrimary={()=>onTabChange('companies')}
      onSecondary={()=>onTabChange('filings')}
      dense
    brandMarkSrc={brandMark}
    brandMarkAlt="상장노트 브랜드 로고"
    />
    <StatsStrip stats={data.metrics} compact />
    <div className="grid gap-ds-3 2xl:grid-cols-main-420">
      <section>
        <SectionHeader title="관심기업" action="전체 보기" onAction={()=>onTabChange('watch')}/>
        <div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{watchlist.map((company)=><CompanyCard key={company.id} company={company} compact onToggle={()=>onAction(`${company.name} 저장`)}/>)}</div>
      </section>
      <Card padding="normal">
        <SectionHeader title="오늘 확인할 공시" description="최근 접수된 공시를 표 형태로 먼저 확인합니다." action="공시 검색" onAction={()=>onTabChange('filings')}/>
        <DataTable caption="오늘 확인할 공시 요약" columns={[{key:'company',label:'기업'},{key:'title',label:'공시'},{key:'date',label:'일자'},{key:'type',label:'상태'}]} rows={todayFilings.map((item)=>({id:`home-${item.id}`,cells:{company:<b>{item.company}</b>,title:item.title,date:item.date,type:<StatusBadge label={item.type}/>}}))}/>
      </Card>
    </div>
    <section>
      <SectionHeader title="오늘 · D-Day 기준 타임라인" action="일정 보기" onAction={()=>onTabChange('timeline')}/>
      <div className="grid gap-ds-2 lg:grid-cols-3">{data.companies.slice(0,3).map((company)=><DayCard key={company.id} company={company} onOpen={()=>onTabChange('timeline')}/>)}</div>
    </section>
    <DataTable caption="주요 공시 표" columns={[{key:'company',label:'기업'},{key:'title',label:'공시'},{key:'date',label:'일자'},{key:'type',label:'상태'}]} rows={data.filings.slice(0,5).map((item)=>({id:item.id,cells:{company:<b>{item.company}</b>,title:item.title,date:item.date,type:<StatusBadge label={item.type}/>}}))}/>
    <DisclaimerBanner />
    <BottomWidgetPanel widgets={data.widgets} onAction={(label)=>onAction(label)} compact />
  </div>;
}
