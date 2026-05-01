export default function NoticeCard({ warning }) {
  return (
    <section id="notice" className="sidebar-card notice-card" aria-labelledby="notice-title">
      <h2 id="notice-title">데이터 안내</h2>
      <ul>
        <li>OpenDART 기반 수집</li>
        <li>GitHub Actions로 정적 데이터 생성</li>
        <li>투자 권유가 아닌 정보 정리용 데모</li>
      </ul>
      {warning ? <p className="warning-text">{warning}</p> : null}
    </section>
  );
}
