import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconDashboard,
  IconEvents,
  IconUsers,
  IconReports,
  IconTicket,
  IconSales,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconLogOut,
} from './SidebarIcons';

export const SIDEBAR_STORAGE_KEY = 'sidebarCollapsed';
export const SIDEBAR_EVENT = 'sidebar-toggle';

function NavItem({ to, label, icon: Icon, collapsed, end = false }) {
  const { pathname } = useLocation();
  const active = end ? pathname === to : pathname.startsWith(to);

  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors ${
        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
      } ${
        active
          ? 'bg-primary/[0.07] text-primary'
          : 'text-gray-600 hover:bg-gray-50 hover:text-ink'
      }`}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <Icon
        className={`shrink-0 transition-colors ${
          active ? 'text-primary' : 'text-ink'
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Sidebar() {
  const { usuario, logout, isAdmin, isVendedor, isSuperAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  );

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
    window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: { collapsed: next } }));
  };

  if (!usuario) return null;

  const home = isAdmin ? '/admin' : '/vendedor';

  return (
      <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200/90 bg-white transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      <div
        className={`flex min-h-[88px] items-center justify-center border-b border-gray-100 ${
          collapsed ? 'px-2 py-4' : 'px-5 py-5'
        }`}
      >
        <Link to={home} className="flex w-full items-center justify-center">
          <img
            src="/logo/sanva-shows-ink.png"
            alt="Sanva Shows"
            className={`object-contain ${
              collapsed
                ? 'w-[56px] h-auto'
                : 'w-full max-w-[220px] h-auto'
            }`}
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {isAdmin && (
          <>
            <NavItem to="/admin" label="Dashboard" icon={IconDashboard} collapsed={collapsed} end />
            <NavItem to="/admin/eventos" label="Eventos" icon={IconEvents} collapsed={collapsed} />
            <NavItem to="/admin/vendedores" label="Vendedores" icon={IconUsers} collapsed={collapsed} />
            {isSuperAdmin && (
              <NavItem to="/admin/administradores" label="Administradores" icon={IconUsers} collapsed={collapsed} />
            )}
            <NavItem to="/admin/reportes" label="Reportes" icon={IconReports} collapsed={collapsed} />
          </>
        )}
        {isVendedor && (
          <>
            <NavItem to="/vendedor" label="Vender" icon={IconTicket} collapsed={collapsed} end />
            <NavItem to="/vendedor/mis-ventas" label="Mis ventas" icon={IconSales} collapsed={collapsed} />
            <NavItem to="/reportes" label="Reportes" icon={IconReports} collapsed={collapsed} />
          </>
        )}
        <div className="my-3 border-t border-gray-100" />
        <NavItem to="/configuraciones" label="Configuraciones" icon={IconSettings} collapsed={collapsed} />
      </nav>

      <div className="border-t border-gray-100 p-3">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-primary ring-1 ring-gray-200">
              {iniciales(usuario.nombre_completo)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{usuario.nombre_completo}</p>
              <p className="text-xs capitalize text-gray-500">{usuario.rol}</p>
            </div>
          </div>
        )}

        <div className={`flex gap-1 ${collapsed ? 'flex-col items-center' : ''}`}>
          <button
            type="button"
            onClick={toggle}
            className={`flex items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50 hover:text-ink ${
              collapsed ? 'h-9 w-9' : 'h-9 w-9 shrink-0'
            }`}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>

          <button
            type="button"
            onClick={logout}
            className={`flex items-center gap-2 rounded-lg text-[13px] font-medium text-gray-600 transition hover:bg-gray-50 hover:text-primary ${
              collapsed ? 'h-9 w-9 justify-center' : 'flex-1 px-3 py-2'
            }`}
            title="Cerrar sesión"
          >
            <IconLogOut className="shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
