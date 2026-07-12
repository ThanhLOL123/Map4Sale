import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isDemoMode } from '../lib/supabase';

/** Top bar for the map screen. */
export default function AppHeader() {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <header className="app-header">
      <span className="app-title">🗺️ Map4Sale</span>
      {isDemoMode && <span className="badge badge-demo">DEMO</span>}

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
