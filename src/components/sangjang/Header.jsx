import { TABS } from '../../data/dashboardData.js';

export default function Header({ tab, setTab, updatedAt }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="hidden h-[64px] items-center justify-between px-7 md:flex">
        <a
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            setTab('home');
          }}
          aria-label="상장노트 홈"
          className="text-[22px] font-extrabold tracking-tight text-slate-950"
        >
          상장노트
        </a>
        <nav aria-label="주요 메뉴" className="flex h-full items-center gap-10 text-[14px] font-bold text-slate-800">
          {TABS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                setTab(item.id);
              }}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`flex h-full items-center border-b-[3px] px-1 ${tab === item.id ? 'border-blue-600 text-slate-950' : 'border-transparent hover:text-blue-700'}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-[13px] font-medium text-slate-500">
          <span>기준일&nbsp; {updatedAt}</span>
          <button type="button" onClick={() => window.location.reload()} aria-label="IPO 데이터 새로고침" className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-700">
            ↻ 새로고침
          </button>
        </div>
      </div>
      <div className="grid h-[60px] grid-cols-[40px_1fr_40px] items-center px-4 md:hidden">
        <span aria-hidden="true" />
        <a
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            setTab('home');
          }}
          aria-label="상장노트 홈"
          className="text-center text-[20px] font-extrabold tracking-tight text-slate-950"
        >
          상장노트
        </a>
        <button type="button" onClick={() => window.location.reload()} aria-label="새로고침" className="grid size-9 place-items-center rounded-xl text-lg text-slate-700">
          ↻
        </button>
      </div>
      <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-[100] flex gap-2 overflow-x-auto border-t border-slate-200 bg-white/95 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-14px_32px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        {TABS.map((item) => (
          <a
            key={`mobile-${item.id}`}
            href={`#${item.id}`}
            onClick={(event) => {
              event.preventDefault();
              setTab(item.id);
            }}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-extrabold transition ${tab === item.id ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
