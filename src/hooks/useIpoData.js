import { useCallback, useEffect, useState } from 'react';

const DATA_URL = `${import.meta.env.BASE_URL}data/ipos.json`;

const EMPTY_PAYLOAD = {
  metadata: {
    source: 'empty',
    notice: 'OpenDART 데이터 갱신 전 상태입니다.',
  },
  items: [],
};

function normalizePayload(payload) {
  return {
    metadata: payload?.metadata || {},
    items: Array.isArray(payload?.items) ? payload.items : [],
  };
}

export function useIpoData() {
  const [payload, setPayload] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const nextPayload = normalizePayload(await response.json());
      setPayload(nextPayload);
      setItems(nextPayload.items);
    } catch (nextError) {
      console.error(nextError);
      setError('데이터 파일을 불러오지 못했습니다. GitHub Actions 실행 상태를 확인해주세요.');
      setPayload(EMPTY_PAYLOAD);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { payload, items, isLoading, error, reload: loadData };
}
