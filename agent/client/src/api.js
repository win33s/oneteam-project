import { useEffect, useState, useCallback, useRef } from "react";

async function request(method, url, body) {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body = {}) => request("POST", url, body),
  put: (url, body = {}) => request("PUT", url, body),
};

/** GET 결과를 상태로 들고 있는 훅. intervalMs를 주면 그 주기로 다시 불러온다. */
export function useApi(url, { intervalMs } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const reload = useCallback(async () => {
    if (!urlRef.current) return;
    const requested = urlRef.current;
    try {
      const next = await api.get(requested);
      if (requested === urlRef.current) { setData(next); setError(null); }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    setData(null);
    reload();
    if (!intervalMs) return;
    const t = setInterval(reload, intervalMs);
    return () => clearInterval(t);
  }, [url, intervalMs, reload]);

  return { data, error, reload, setData };
}

export const won = (n) => `${Math.round(n || 0).toLocaleString("ko-KR")}원`;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
export function dateLabel(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일(${WEEKDAYS[date.getDay()]})`;
}
export function addDaysStr(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  const p = (x) => String(x).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
