import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthContext';
import { PRIMARY_NAV } from '../app/navigation';
import { services } from '../services';
import { GovernmentUtilityBar, PortalFooter, PortalMasthead } from './PortalChrome';

export function AppShell() {
  const { user, signOut, has } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const applicationDetailMatch = location.pathname.match(/^\/applications\/([^/]+)$/);
  const undertakingDetailMatch = location.pathname.match(/^\/compliance\/([^/]+)$/);
  const alertsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => {
      if (!user) throw new Error('Notifications require a signed-in user.');
      return services.notifications.list(user);
    },
    enabled: Boolean(user && has('alerts.manage')),
  });
  const pageName = location.pathname === '/applications/new'
    ? 'New application'
    : applicationDetailMatch
      ? `Application ${applicationDetailMatch[1]}`
      : undertakingDetailMatch
        ? `Undertaking ${undertakingDetailMatch[1]}`
        : PRIMARY_NAV.find((item) => item.path === location.pathname)?.label ?? 'Page not found';

  useEffect(() => {
    document.title = `${pageName} | AICTE SmartFlow`;
  }, [pageName]);

  if (!user) return null;

  const visibleNav = PRIMARY_NAV.filter((item) => !item.requires || has(item.requires));

  const onSignOut = () => {
    signOut();
    navigate('/sign-in', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <GovernmentUtilityBar />
      <PortalMasthead
        user={user}
        unreadCount={alertsQuery.data?.filter((alert) => alert.status === 'open').length ?? 0}
        canViewNotifications={has('alerts.manage')}
        notificationError={alertsQuery.isError}
        onSignOut={onSignOut}
      />
      <header className="bg-navy-700 text-white">
        <div className="portal-width flex flex-wrap items-center justify-between gap-2 px-4">
          <button
            type="button"
            className="focus-ring inline-flex min-h-11 items-center gap-2 border border-navy-500 px-2 py-1 text-sm lg:hidden"
            aria-expanded={navOpen}
            aria-controls="primary-nav"
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? <X size={17} aria-hidden="true" /> : <Menu size={17} aria-hidden="true" />}
            {navOpen ? 'Close menu' : 'Menu'}
          </button>
          <nav
            id="primary-nav"
            aria-label="Primary"
            className={`${navOpen ? 'block' : 'hidden'} w-full overflow-x-auto lg:block lg:w-auto`}
          >
            <ul className="flex flex-col gap-1 py-1 lg:flex-row lg:items-center lg:py-0">
              {visibleNav.map((item) => (
                <li key={item.key}>
                  <NavLink
                    to={item.path}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) =>
                      `primary-nav-link focus-ring block border-b-[3px] px-3 py-3 text-sm ${
                        isActive ? 'border-saffron-500 font-bold text-white' : 'border-transparent text-white hover:bg-navy-600'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="portal-width min-w-0 flex-1 px-4 py-6">
        <Outlet />
      </main>
      <PortalFooter />
    </div>
  );
}
