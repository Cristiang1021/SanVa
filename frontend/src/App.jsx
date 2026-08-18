import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, esPanelAdmin } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Configuraciones from './pages/Configuraciones';
import ReportesVendedor from './pages/ReportesVendedor';

import AdminDashboard from './pages/admin/Dashboard';
import AdminEventos from './pages/admin/Eventos';
import AdminFunciones from './pages/admin/Funciones';
import AdminSecciones from './pages/admin/Secciones';
import AdminVendedores from './pages/admin/Vendedores';
import AdminAdministradores from './pages/admin/Administradores';
import AdminReportes from './pages/admin/Reportes';

import VendedorInicio from './pages/vendedor/Inicio';
import VendedorVenta from './pages/vendedor/Venta';
import VendedorMisVentas from './pages/vendedor/MisVentas';

const homeFor = (rol) => (esPanelAdmin(rol) ? '/admin' : '/vendedor');

function ProtectedRoute({ children, requiredRole = null, allowRoles = null }) {
  const { isAuthenticated, usuario } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowRoles && !allowRoles.includes(usuario?.rol)) {
    return <Navigate to={homeFor(usuario?.rol)} replace />;
  }

  if (requiredRole === 'admin') {
    if (!esPanelAdmin(usuario?.rol)) {
      return <Navigate to={homeFor(usuario?.rol)} replace />;
    }
  } else if (requiredRole && usuario?.rol !== requiredRole) {
    return <Navigate to={homeFor(usuario?.rol)} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { isAuthenticated, usuario } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={homeFor(usuario?.rol)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/cambiar-password" element={<Navigate to="/configuraciones" replace />} />
      <Route path="/admin/correo" element={<Navigate to="/configuraciones" replace />} />

      <Route
        path="/lista-entrada"
        element={
          <ProtectedRoute allowRoles={['admin', 'superadmin', 'vendedor']}>
            <Navigate
              to={esPanelAdmin(usuario?.rol) ? '/admin/reportes?tab=entrada' : '/reportes'}
              replace
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/configuraciones"
        element={
          <ProtectedRoute allowRoles={['admin', 'superadmin', 'vendedor']}>
            <Configuraciones />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reportes"
        element={
          <ProtectedRoute requiredRole="vendedor">
            <ReportesVendedor />
          </ProtectedRoute>
        }
      />

      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/eventos" element={<ProtectedRoute requiredRole="admin"><AdminEventos /></ProtectedRoute>} />
      <Route path="/admin/funciones/:eventoId" element={<ProtectedRoute requiredRole="admin"><AdminFunciones /></ProtectedRoute>} />
      <Route path="/admin/secciones/:funcionId" element={<ProtectedRoute requiredRole="admin"><AdminSecciones /></ProtectedRoute>} />
      <Route path="/admin/vendedores" element={<ProtectedRoute requiredRole="admin"><AdminVendedores /></ProtectedRoute>} />
      <Route path="/admin/administradores" element={<ProtectedRoute requiredRole="admin"><AdminAdministradores /></ProtectedRoute>} />
      <Route path="/admin/reportes" element={<ProtectedRoute requiredRole="admin"><AdminReportes /></ProtectedRoute>} />

      <Route path="/vendedor" element={<ProtectedRoute requiredRole="vendedor"><VendedorInicio /></ProtectedRoute>} />
      <Route path="/vendedor/venta/:funcionId" element={<ProtectedRoute requiredRole="vendedor"><VendedorVenta /></ProtectedRoute>} />
      <Route path="/vendedor/mis-ventas" element={<ProtectedRoute requiredRole="vendedor"><VendedorMisVentas /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
