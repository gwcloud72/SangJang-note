export default function NoticeCard({ warning }) {
  return (
    <section className="notice-card" aria-label="데이터 안내">
      <strong>안내</strong>
      <p>
        본 서비스는 포트폴리오 및 데모 목적으로 제작되었습니다. 투자자문, 투자권유,
        청약 권유 또는 금융상품 판매를 목적으로 하지 않습니다. 실제 청약·투자 판단 전에는
        원문 공시와 증권사 안내를 반드시 확인하세요.
      </p>
      {warning ? <p className="warning-text">데이터 주의사항: {warning}</p> : null}
    </section>
  );
}
