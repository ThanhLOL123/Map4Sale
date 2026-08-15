import { Link, NavLink, Outlet } from 'react-router-dom';
import { isDemoMode } from '../lib/supabase';

export default function AdminLayout() {
  return (
    <div className="admin-page">
      <header className="app-header">
        <span className="app-title">🗺️ Map4Sale — Quản trị</span>
        {isDemoMode && <span className="badge badge-demo">DEMO</span>}
        <div className="app-header-right">
          <Link to="/" className="btn btn-ghost">← Về bản đồ</Link>
        </div>
      </header>

      <div className="admin-body">
        <nav className="admin-nav">
          <NavLink to="/admin/universities">🏫 Trường đại học</NavLink>
          <NavLink to="/admin/accounts">👥 Tài khoản Sale</NavLink>
          <NavLink to="/admin/logs">🕒 Nhật ký đăng nhập</NavLink>
          <NavLink to="/admin/activity">📊 Hoạt động nhân viên</NavLink>
        </nav>
        <main className="admin-main">
          {isDemoMode && (
            <p className="demo-note">
              Chế độ demo: thay đổi chỉ lưu trong bộ nhớ trình duyệt và mất khi tải lại trang.
            </p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
