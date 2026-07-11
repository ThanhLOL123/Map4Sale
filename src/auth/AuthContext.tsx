import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { logLogin } from '../lib/api';
import { DEMO_ADMIN } from '../lib/demoStore';
import { isDemoMode, requireSupabase, supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchOwnProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Demo mode: everyone is a signed-in demo admin so the whole app is browsable.
  const [profile, setProfile] = useState<Profile | null>(isDemoMode ? DEMO_ADMIN : null);
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode || !supabase) return;
    let cancelled = false;

    async function loadSession() {
      const { data } = await supabase!.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const p = await fetchOwnProfile(userId);
        if (!cancelled) setProfile(p && p.is_active ? p : null);
        if (p && !p.is_active) await supabase!.auth.signOut();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSession();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setProfile(null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isDemoMode) return; // demo is always signed in
    const supa = requireSupabase();
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email hoặc mật khẩu không đúng.');
    const p = await fetchOwnProfile(data.user.id);
    if (!p || !p.is_active) {
      await supa.auth.signOut();
      throw new Error('Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên.');
    }
    setProfile(p);
    logLogin(); // spec §4.5 — record IP/location/device server-side
  }, []);

  const signOut = useCallback(async () => {
    if (!isDemoMode) await requireSupabase().auth.signOut();
    setProfile(isDemoMode ? DEMO_ADMIN : null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signOut,
    }),
    [profile, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
