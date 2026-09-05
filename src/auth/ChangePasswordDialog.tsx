import { useState, type FormEvent } from 'react';
import ExpandOverlay from '../components/ExpandOverlay';
import { isDemoMode } from '../lib/supabase';
import { useAuth } from './AuthContext';

/** Stricter than Supabase's default of 6 — these are shared work accounts. */
const MIN_LENGTH = 8;

/** How long the success message stays up before the dialog closes itself. */
const CLOSE_DELAY_MS = 1200;

interface Props {
  onClose: () => void;
}

/**
 * Lets a signed-in user replace their own password.
 *
 * Accounts are created with a random password the admin hands over, so without
 * this every sale account runs forever on a password its admin also knows.
 */
export default function ChangePasswordDialog({ onClose }: Props) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Everything checkable without a round trip. Returns the first complaint. */
  function localProblem(): string | null {
    if (next.length < MIN_LENGTH) return `Mật khẩu mới phải có ít nhất ${MIN_LENGTH} ký tự.`;
    if (next !== confirm) return 'Xác nhận mật khẩu không khớp.';
    if (next === current) return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = localProblem();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
      // The session survives a password change, so there is nothing to do here
      // but let the user read the confirmation and get out of the way.
      setTimeout(onClose, CLOSE_DELAY_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được mật khẩu.');
      setBusy(false);
    }
  }

  return (
    <ExpandOverlay title="Đổi mật khẩu" size="compact" onClose={onClose}>
      <form className="password-form" onSubmit={onSubmit}>
        {isDemoMode && (
          <p className="demo-note">
            Chế độ demo: chưa cấu hình Supabase nên mật khẩu không thực sự thay đổi.
          </p>
        )}
        <label>
          Mật khẩu hiện tại
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>
        <label>
          Mật khẩu mới
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            autoComplete="new-password"
            placeholder={`Ít nhất ${MIN_LENGTH} ký tự`}
          />
        </label>
        <label>
          Xác nhận mật khẩu mới
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {done && <p className="form-success">Đã đổi mật khẩu.</p>}

        <div className="password-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || done}>
            {busy ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </ExpandOverlay>
  );
}
