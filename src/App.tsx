import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AccountsPage from './admin/AccountsPage';
import AdminLayout from './admin/AdminLayout';
import LoginLogsPage from './admin/LoginLogsPage';
import UniversityFormPage from './admin/UniversityFormPage';
import UniversityListPage from './admin/UniversityListPage';
import { AuthProvider } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import UniversityListView from './list/UniversityListView';
import MapView from './map/MapView';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MapView />} />
            <Route path="/list" element={<UniversityListView />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="universities" replace />} />
              <Route path="universities" element={<UniversityListPage />} />
              <Route path="universities/new" element={<UniversityFormPage />} />
              <Route path="universities/:id/edit" element={<UniversityFormPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="logs" element={<LoginLogsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
