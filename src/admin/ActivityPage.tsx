import { useCallback, useEffect, useMemo, useState } from 'react';
import { flushActivity } from '../lib/activity';
import { ACTIVITY_EVENT_LIMIT, fetchActivityEvents, fetchActivitySummary } from '../lib/api';
import type { ActivityEvent, ActivityEventType, ActivitySummaryRow } from '../lib/types';

const ACTIVITY_LABELS: Record<ActivityEventType, string> = {
  school_view: 'Xem trường',
  search: 'Tìm kiếm',
  filter: 'Lọc',
};

/** `<input type="date">` value for a day offset from today, in local time. */
function dayInput(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * The date inputs are local days but the queries need instants, so both ends are
 * converted properly here — `to` is the start of the day *after* the chosen one,
 * matching the RPC's exclusive upper bound. (Nhật ký đăng nhập compares the UTC
 * prefix of the timestamp instead; realigning that page is out of scope.)
 */
function toRange(from: string, to: string): { fromIso: string; toIso: string } {
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { fromIso: new Date(`${from}T00:00:00`).toISOString(), toIso: end.toISOString() };
}

export default function ActivityPage() {
  const [dateFrom, setDateFrom] = useState(() => dayInput(-6));
  const [dateTo, setDateTo] = useState(() => dayInput(0));
  const [userId, setUserId] = useState('');
  const [summary, setSummary] = useState<ActivitySummaryRow[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { fromIso, toIso } = useMemo(() => toRange(dateFrom, dateTo), [dateFrom, dateTo]);

  const load = useCallback(async () => {
    try {
      // An admin who was just browsing the map has events still buffered.
      await flushActivity();
      const [s, e] = await Promise.all([
        fetchActivitySummary(fromIso, toIso),
        fetchActivityEvents({ userId: userId || undefined, fromIso, toIso }),
      ]);
      setSummary(s);
      setEvents(e);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [fromIso, toIso, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedName = userId
    ? summary.find((r) => r.user_id === userId)?.full_name || 'nhân viên đã chọn'
    : '';

  function setPreset(days: number) {
    setDateFrom(dayInput(-(days - 1)));
    setDateTo(dayInput(0));
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h1>Hoạt động nhân viên</h1>
      </div>

      <div className="inline-form">
        <label className="inline-label">
          Từ ngày
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="inline-label">
          Đến ngày
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <span className="range-presets">
          <button type="button" className="btn btn-ghost" onClick={() => setPreset(1)}>Hôm nay</button>
          <button type="button" className="btn btn-ghost" onClick={() => setPreset(7)}>7 ngày</button>
          <button type="button" className="btn btn-ghost" onClick={() => setPreset(30)}>30 ngày</button>
        </span>
      </div>
      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Lần truy cập gần nhất</th>
              <th>Số phiên</th>
              <th>Số thao tác</th>
              <th>Trường đã xem</th>
              <th>Lượt tìm kiếm</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.user_id}>
                <td>
                  <strong>{row.full_name || row.email}</strong>
                  <br />
                  <span className="muted">{row.email}</span>
                </td>
                <td>
                  {row.last_access_at
                    ? new Date(row.last_access_at).toLocaleString('vi-VN')
                    : '—'}
                </td>
                <td className="summary-num">{row.sessions}</td>
                <td className="summary-num">{row.actions}</td>
                <td className="summary-num">{row.schools_viewed}</td>
                <td className="summary-num">{row.searches}</td>
                <td className="row-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setUserId(row.user_id)}
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
            {summary.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">Chưa có dữ liệu trong khoảng đã chọn.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-toolbar">
        <h2>Chi tiết hoạt động{selectedName && ` — ${selectedName}`}</h2>
        {userId && (
          <button type="button" className="btn btn-ghost" onClick={() => setUserId('')}>
            Tất cả nhân viên
          </button>
        )}
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Nhân viên</th>
              <th>Hành động</th>
              <th>Nội dung</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.occurred_at).toLocaleString('vi-VN')}</td>
                <td>{e.profiles?.full_name || e.profiles?.email || e.user_id}</td>
                <td>{ACTIVITY_LABELS[e.event_type] ?? e.event_type}</td>
                <td>{e.detail || '—'}</td>
                <td className="summary-num">{e.result_count ?? '—'}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">Chưa có hoạt động nào trong khoảng đã chọn.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {events.length >= ACTIVITY_EVENT_LIMIT && (
        <p className="muted">
          Chỉ hiển thị {ACTIVITY_EVENT_LIMIT} hoạt động gần nhất trong khoảng đã chọn.
        </p>
      )}
      <p className="muted">Dữ liệu hoạt động chỉ được lưu trong 30 ngày.</p>
    </div>
  );
}
