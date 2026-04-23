export default function Hero({ summary, isLoading }) {
  const statusText = isLoading
    ? '데이터 확인중'
    : summary.source === 'OpenDART'
      ? '자동 갱신 데이터'
      : '연동 대기중';

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__copy">
        <div className="hero__eyebrow">공시 데이터 기반 · 포트폴리오 데모</div>
        <h1 id="hero-title">상장 일정을<br />한눈에 기록합니다.</h1>
        <p>
          OpenDART 공시 데이터를 정적 JSON으로 정리해 청약 시작일, 종료일, 납입일을
          한 화면에서 확인하는 일정 기록형 MVP입니다.
        </p>
        <div className="hero__actions">
          <a className="primary-link" href="#finder">노트 열어보기</a>
          <span className="hero-note">GitHub Actions 데이터 갱신 · Pages 자동 배포</span>
        </div>
      </div>

      <aside className="hero-card" aria-label="서비스 요약">
        <div className="hero-card__top">
          <span className="status-dot" />
          <span>{statusText}</span>
        </div>
        <strong className="hero-card__price">
          {isLoading ? '-' : `${summary.open.toLocaleString('ko-KR')}건`}
        </strong>
        <p>오늘 기준 진행중 일정</p>
        <div className="mini-chart" aria-hidden="true">
          {[42, 56, 44, 72, 62, 84].map((height, index) => (
            <span key={`${height}-${index}`} style={{ height: `${height}%` }} />
          ))}
        </div>
      </aside>
    </section>
  );
}
