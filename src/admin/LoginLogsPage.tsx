import { useEffect, useMemo, useState } from 'react';
import { fetchLoginLogs, fetchProfiles } from '../lib/api';
import type { LoginLog, Profile } from '../lib/types';

/** Countries considered "expected" for staff logins; anything else is flagged. */
const EXPECTED_COUNTRIES = ['Vietnam', 'South Korea'];

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchLoginLogs(), fetchProfiles()])
      .then(([l, p]) => {
        setLogs(l);
        setProfiles(p);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const shown = useMemo(
    () =>
      logs.filter((log) => {
        if (userId && log.user_id !== userId) return false;
        const day = log.login_at.slice(0, 10);
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
        return true;
      }),
    [logs, userId, dateFrom, dateTo],
  );

  return (
    <div>
      <div className="admin-toolbar">
        <h1>Nhật ký đăng nhập</h1>
      </div>

      <div className="inline-form">
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Tất cả nhân viên</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
          ))}
        </select>
        <label className="inline-label">
          Từ ngày
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="inline-label">
          Đến ngày
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Loại</th>
            <th>Thời gian</th>
            <th>Thành phố</th>
            <th>Quốc gia</th>
            <th>Trình duyệt / thiết bị</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((log) => {
            const suspicious = log.country && !EXPECTED_COUNTRIES.includes(log.country);
            return (
              <tr key={log.id} className={suspicious ? 'row-warning' : ''}>
                <td>{log.profiles?.full_name || log.profiles?.email || log.user_id}</td>
                <td>{log.kind === 'resume' ? 'Mở lại' : 'Đăng nhập'}</td>
                <td>{new Date(log.login_at).toLocaleString('vi-VN')}</td>
                <td>{log.city || '—'}</td>
                <td>
                  {log.country || '—'}
                  {suspicious && <span className="badge badge-warning"> Bất thường</span>}
                </td>
                <td>{log.browser || '—'}</td>
                <td className="muted">{log.ip_address}</td>
              </tr>
            );
          })}
          {shown.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">Chưa có lượt đăng nhập nào.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <p className="muted">
        Vị trí xác định theo IP nên chỉ mang tính tương đối; nhân viên dùng VPN sẽ hiển thị
        vị trí máy chủ VPN.
      </p>
    </div>
  );
}
