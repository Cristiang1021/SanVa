import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { usuario, logout, isAdmin, isVendedor } = useAuth();

  if (!usuario) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to={isAdmin ? '/admin' : '/vendedor'} className="flex items-center shrink-0">
            <BrandLogo className="h-16 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {isAdmin && (
              <>
                <Link to="/admin" className="text-body hover:text-ink font-500">
                  Dashboard
                </Link>
                <Link to="/admin/eventos" className="text-body hover:text-ink font-500">
                  Eventos
                </Link>
                <Link to="/admin/vendedores" className="text-body hover:text-ink font-500">
                  Vendedores
                </Link>
                <Link to="/admin/reportes" className="text-body hover:text-ink font-500">
                  Reportes
                </Link>
                <Link to="/lista-entrada" className="text-body hover:text-ink font-500">
                  Lista de entrada
                </Link>
                <Link to="/admin/correo" className="text-body hover:text-ink font-500">
                  Correo
                </Link>
              </>
            )}
            {isVendedor && (
              <>
                <Link to="/vendedor" className="text-body hover:text-ink font-500">
                  Vender
                </Link>
                <Link to="/vendedor/mis-ventas" className="text-body hover:text-ink font-500">
                  Mis Ventas
                </Link>
                <Link to="/lista-entrada" className="text-body hover:text-ink font-500">
                  Lista de entrada
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <p className="font-600 text-ink">{usuario.nombre_completo}</p>
              <p className="text-gray-500 text-xs capitalize">{usuario.rol}</p>
              <Link
                to="/cambiar-password"
                className="text-xs text-primary font-600 hover:underline"
              >
                Cambiar contraseña
              </Link>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-600 text-white bg-primary rounded-md hover:bg-primary-dark transition"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
