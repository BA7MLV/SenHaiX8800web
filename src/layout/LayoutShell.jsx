import { Outlet } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { SideMenu } from '../components/SideMenu';
import { TopNav } from '../components/TopNav';

export function LayoutShell() {
  const { isSidebarCollapsed } = useAppContext();

  return (
    <div className="min-h-dvh bg-surface-base text-content-primary">
      <header className="glass-header sticky top-0 z-fixed">
        <TopNav />
      </header>

      <main className="flex h-[calc(100vh-60px)] overflow-hidden">
        <aside
          className={
            isSidebarCollapsed
              ? 'hidden lg:block lg:w-[64px] lg:shrink-0 lg:border-r lg:border-line-subtle'
              : 'hidden lg:block lg:w-[220px] lg:shrink-0 lg:border-r lg:border-line-subtle'
          }
        >
          <SideMenu />
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
