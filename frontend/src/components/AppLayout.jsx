import { useEffect, useState } from 'react';
import Sidebar, { SIDEBAR_EVENT, SIDEBAR_STORAGE_KEY } from './Sidebar';

export default function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  );

  useEffect(() => {
    const onToggle = (e) => {
      setSidebarCollapsed(e.detail?.collapsed ?? localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1');
    };
    window.addEventListener(SIDEBAR_EVENT, onToggle);
    return () => window.removeEventListener(SIDEBAR_EVENT, onToggle);
  }, []);

  const margin = sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]';

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Sidebar />
      <main className={`${margin} min-h-screen transition-[margin] duration-200 ease-out`}>
        <div className="w-full px-6 py-8 lg:px-10 xl:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
