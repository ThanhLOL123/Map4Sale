import { useState } from 'react';
import ChangePasswordDialog from '../auth/ChangePasswordDialog';

/**
 * Header entry point for the password dialog. It owns the open state so the map
 * header and the admin header — which are separate markup — can each drop in
 * one element instead of repeating it.
 */
export default function ChangePasswordButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Đổi mật khẩu
      </button>
      {open && <ChangePasswordDialog onClose={() => setOpen(false)} />}
    </>
  );
}
