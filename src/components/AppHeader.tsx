import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isDemoMode } from '../lib/supabase';

/** Top bar shared by the map and list views, with a Map ⇄ List toggle. */
export default function AppHeader() {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <header className="app-header">
      <span className="app-title">🗺️ Map4Sale</span>
      {isDemoMode && <span className="badge badge-demo">DEMO</span>}

      <nav className="view-toggle" aria-label="Chế độ xem">
        <NavLink to="/" end>🗺️ <span className="view-toggle-label">Bản đồ</span></NavLink>
        <NavLink to="/list">📋 <span className="view-toggle-label">Danh sách</span></NavLink>
      </nav>

      <div className="app-header-right">
        {isAdmin && <Link to="/admin" className="btn btn-ghost">Quản trị</Link>}
        <span className="user-email">{profile?.email}</span>
        {!isDemoMode && (
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            Đăng xuất
          </button>
        )}
      </div>
    </header>
  );
}
