import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { COUNTRIES, COUNTRY_CODES } from '../lib/countries';
import { isDemoMode } from '../lib/supabase';
import { useCountry } from '../lib/useCountry';
import ChangePasswordButton from './ChangePasswordButton';

/** Top bar for the map screen. */
export default function AppHeader() {
  const { profile, isAdmin, signOut } = useAuth();
  const [country, setCountry] = useCountry();

  return (
    <header className="app-header">
      <span className="app-title">🗺️ Map4Sale</span>
      {isDemoMode && <span className="badge badge-demo">DEMO</span>}

      {/* Names only, no flag emoji: Windows draws 🇰🇷 🇹🇼 as the letters KR/TW. */}
      <div className="country-switch" role="group" aria-label="Chọn quốc gia">
        {COUNTRY_CODES.map((code) => (
          <button
            key={code}
            type="button"
            className={code === country ? 'active' : ''}
            aria-pressed={code === country}
            onClick={() => code !== country && setCountry(code)}
          >
            {COUNTRIES[code].label}
          </button>
        ))}
      </div>

      <div className="app-header-right">
        {isAdmin && <Link to="/admin" className="btn btn-ghost">Quản trị</Link>}
        <span className="user-email">{profile?.email}</span>
        {/* Unlike Đăng xuất this stays in demo mode, so the dialog is reachable
            without Supabase — the demo note inside explains it saves nothing. */}
        <ChangePasswordButton />
        {!isDemoMode && (
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            Đăng xuất
          </button>
        )}
      </div>
    </header>
  );
}
