import { useEffect } from 'react';
import { formatDate, dateRange } from '../utils/dates.js';
import { dDay, normalizeStatus, STATUS_LABELS } from '../utils/status.js';
import {
  formatAmount,
  formatCount,
  formatPrice,
  formatRatio,
  formatTextList,
} from '../utils/formatters.js';

function formatOptionalDate(value, fallback = '미공시') {
  const formatted = formatDate(value);
  return formatted === '-' ? fallback : formatted;
}

const DETAIL_FIELDS = [
  { label: '공시명', key: 'reportName', fallback: '증권신고서' },
  { label: '증권 유형', key: 'securityType', fallback: '확인 필요' },
  { label: '공모 방식', key: 'offeringMethod', fallback: '확인 필요' },
  { label: '주관사', render: (item) => formatTextList(item.underwriters, '주관사 확인 필요') },
  { label: '일반청약 경쟁률', render: (item) => formatRatio(item.subscriptionCompetitionRate) },
  { label: '기관 수요예측 경쟁률', render: (item) => formatRatio(item.demandForecastCompetitionRate) },
  { label: '청약 일정', render: (item) => dateRange(item) },
  { label: '접수일', render: (item) => formatDate(item.receiptDate) },
  { label: '환불일', render: (item) => formatOptionalDate(item.refundDate, '미공시') },
  { label: '상장예정일', render: (item) => formatOptionalDate(item.listingDate, '미정') },
  { label: '납입일', render: (item) => formatDate(item.paymentDate) },
  { label: '배정공고일', render: (item) => formatDate(item.allotmentNoticeDate) },
  { label: '청약 안내일', render: (item) => formatDate(item.subscriptionNoticeDate) },
  { label: '배정 기준일', render: (item) => formatDate(item.allotmentBaseDate) },
  { label: '종목코드', key: 'stockCode', fallback: '미확정' },
  { label: '증권 수량', render: (item) => formatCount(item.stockCount, '주', '미공시') },
  { label: '액면가', render: (item) => formatPrice(item.parValue) },
  { label: '법인코드', key: 'corpCode', fallback: '-' },
  { label: '법인 구분', key: 'corpClass', fallback: '-' },
  { label: '접수번호', key: 'receiptNo', fallback: '-' },
];

export default function DetailModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [item, onClose]);

  if (!item) return null;

  const status = normalizeStatus(item);
  const statusLabel = STATUS_LABELS[status] || '확인 필요';
  const detailNote = item.detailSourceNote || '환불일, 상장예정일, 경쟁률은 공시 원문에 있을 때만 표시됩니다.';

  return (
    <div className="detail-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-modal__head">
          <div>
            <p className="detail-modal__eyebrow">오늘 기준 {dDay(item)} · {statusLabel}</p>
            <h2 id="detail-title">{item.companyName || '-'}</h2>
            <div className="detail-modal__chips">
              <span className={`status-chip status-chip--${status}`}>{statusLabel}</span>
              <span>청약 {dateRange(item)}</span>
              <span>접수 {formatDate(item.receiptDate)}</span>
              {item.detailSource ? <span>원문 추출 상세정보</span> : null}
            </div>
          </div>
          <button type="button" className="detail-close" onClick={onClose} aria-label="상세창 닫기">
            닫기
          </button>
        </div>

        <div className="detail-summary-box">
          <strong>{formatPrice(item.offerPrice)}</strong>
          <span>공모가</span>
          <strong>{formatAmount(item.offerAmount)}</strong>
          <span>공모총액</span>
          <strong>{formatOptionalDate(item.refundDate, '미공시')}</strong>
          <span>환불일</span>
          <strong>{formatOptionalDate(item.listingDate, '미정')}</strong>
          <span>상장예정일</span>
        </div>

        <div className="detail-insight-grid">
          <div className="detail-insight-card">
            <span>일반청약 경쟁률</span>
            <strong>{formatRatio(item.subscriptionCompetitionRate)}</strong>
          </div>
          <div className="detail-insight-card">
            <span>기관 수요예측 경쟁률</span>
            <strong>{formatRatio(item.demandForecastCompetitionRate)}</strong>
          </div>
        </div>

        <div className="detail-grid">
          {DETAIL_FIELDS.map((field) => {
            const value = field.render ? field.render(item) : item[field.key] || field.fallback || '-';

            return (
              <div key={field.label} className="detail-row">
                <span>{field.label}</span>
                <strong>{value || '-'}</strong>
              </div>
            );
          })}
        </div>

        <div className="detail-note">
          <strong>추가 안내</strong>
          <p>{detailNote}</p>
        </div>

        <div className="detail-actions">
          {item.mainMatterUrl && item.mainMatterUrl !== item.dartUrl ? (
            <a className="secondary-link detail-link" href={item.mainMatterUrl} target="_blank" rel="noopener noreferrer">
              관련 공시 보기
            </a>
          ) : null}
          {item.dartUrl ? (
            <a className="primary-link detail-link" href={item.dartUrl} target="_blank" rel="noopener noreferrer">
              공시 원문 보기
            </a>
          ) : (
            <span className="disabled-link">원문 링크 없음</span>
          )}
        </div>
      </section>
    </div>
  );
}
