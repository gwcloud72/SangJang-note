import { useEffect, useMemo, useState } from 'react';
import { readJson } from '../lib/http.js';
import { formatDateTime } from '../lib/format.js';
import { parseItems } from '../lib/ipoData.js';

const BASE_URL = import.meta.env.BASE_URL;
const IPO_DATA_URL = `${BASE_URL}data/ipos.json`;
const IPO_REPORT_URL = `${BASE_URL}data/ipo-ai-report.json`;

export function useIpoData() {
  const [payload, setPayload] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([readJson(IPO_DATA_URL, null), readJson(IPO_REPORT_URL, null)]).then(([nextPayload, nextReport]) => {
      if (!mounted) return;
      setPayload(nextPayload);
      setReport(nextReport);
    });
    return () => { mounted = false; };
  }, []);

  const isLive = Array.isArray(payload?.items) && payload.items.length > 0;
  const items = useMemo(() => parseItems(payload), [payload]);
  const reportLines = Array.isArray(report?.lines) && report.lines.length ? report.lines.slice(0, 3) : [];
  return { items, reportLines, updatedAt: formatDateTime(payload?.metadata?.updatedAt || report?.metadata?.generatedAt), isLive };
}
