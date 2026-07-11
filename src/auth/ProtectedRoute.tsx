import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { profile, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="page-loading">Đang tải…</div>;
  }
  if (!profile) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
