import { useEffect, useState, type FormEvent } from 'react';
import {
  createSaleAccount,
  fetchProfiles,
  resetAccountPassword,
  setAccountActive,
} from '../lib/api';
import { isDemoMode } from '../lib/supabase';
import type { Profile } from '../lib/types';

export default function AccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => fetchProfiles().then(setProfiles).catch((e) => setError(String(e)));

  useEffect(() => {
    void reload();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const password = await createSaleAccount(email.trim(), fullName.trim());
      setMessage(
        isDemoMode
          ? 'Đã tạo tài khoản demo.'
          : `Đã tạo tài khoản ${email}. Mật khẩu tạm thời: ${password} — hãy gửi mật khẩu này cho nhân viên (chỉ hiển thị một lần).`,
      );
      setEmail('');
      setFullName('');
      await reload();
    } catch (err) {
      setError(`Tạo tài khoản thất bại: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onToggleActive(p: Profile) {
    const verb = p.is_active ? 'Vô hiệu hóa' : 'Kích hoạt lại';
    if (!window.confirm(`${verb} tài khoản ${p.email}?`)) return;
    try {
      await setAccountActive(p.id, !p.is_active);
      await reload();
    } catch (err) {
      setError(String(err));
    }
  }

  async function onResetPassword(p: Profile) {
    if (!window.confirm(`Đặt lại mật khẩu cho ${p.email}?`)) return;
    try {
      const password = await resetAccountPassword(p.id);
      setMessage(
        isDemoMode
          ? 'Chế độ demo: mật khẩu không thay đổi thật.'
          : `Mật khẩu mới cho ${p.email}: ${password} — hãy gửi mật khẩu này cho nhân viên (chỉ hiển thị một lần).`,
      );
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h1>Tài khoản Sale ({profiles.length})</h1>
      </div>

      <form className="inline-form" onSubmit={onCreate}>
        <input
          type="email"
          required
          placeholder="Email nhân viên"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          placeholder="Họ tên"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Đang tạo…' : '+ Tạo tài khoản Sale'}
        </button>
      </form>
      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className={p.is_active ? '' : 'row-disabled'}>
              <td>{p.full_name || '—'}</td>
              <td>{p.email}</td>
              <td>{p.role === 'admin' ? 'Quản trị' : 'Sale'}</td>
              <td>
                <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                  {p.is_active ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </td>
              <td>{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
              <td className="row-actions">
                {p.role !== 'admin' && (
                  <>
                    <button type="button" className="btn btn-ghost" onClick={() => void onToggleActive(p)}>
                      {p.is_active ? 'Khóa' : 'Mở khóa'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => void onResetPassword(p)}>
                      Đặt lại mật khẩu
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
