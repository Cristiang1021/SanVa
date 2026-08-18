import { useEffect, useState } from 'react';
import Sidebar, { SIDEBAR_EVENT, SIDEBAR_STORAGE_KEY } from './Sidebar';
import { IconMenu } from './SidebarIcons';

const MOBILE_BREAKPOINT = 768;

export default function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onToggle = (e) => {
      setSidebarCollapsed(e.detail?.collapsed ?? localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1');
    };
    window.addEventListener(SIDEBAR_EVENT, onToggle);
    return () => window.removeEventListener(SIDEBAR_EVENT, onToggle);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const sync = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };

    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobile && mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, mobileMenuOpen]);

  const margin = isMobile
    ? 'ml-0'
    : sidebarCollapsed
      ? 'ml-[72px]'
      : 'ml-[260px]';

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {isMobile && mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        isMobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className={`${margin} min-h-screen transition-[margin] duration-200 ease-out`}>
        {isMobile && (
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200/90 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-gray-100"
              aria-label="Abrir menú"
            >
              <IconMenu />
            </button>
            <img
              src="/logo/sanva-shows-ink.png"
              alt="Sanva Shows"
              className="h-8 w-auto object-contain"
            />
          </header>
        )}

        <main className="min-h-[calc(100vh-57px)] md:min-h-screen">
          <div className="w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-10 xl:px-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
