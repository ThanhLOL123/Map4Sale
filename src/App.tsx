import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AccountsPage from './admin/AccountsPage';
import ActivityPage from './admin/ActivityPage';
import AdminLayout from './admin/AdminLayout';
import LoginLogsPage from './admin/LoginLogsPage';
import UniversityFormPage from './admin/UniversityFormPage';
import UniversityListPage from './admin/UniversityListPage';
import { AuthProvider } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import MapView from './map/MapView';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MapView />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="universities" replace />} />
              <Route path="universities" element={<UniversityListPage />} />
              <Route path="universities/new" element={<UniversityFormPage />} />
              <Route path="universities/:id/edit" element={<UniversityFormPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="logs" element={<LoginLogsPage />} />
              <Route path="activity" element={<ActivityPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
