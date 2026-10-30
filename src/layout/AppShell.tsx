import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { PRIMARY_NAV } from '../app/navigation';
import { ROLE_LABELS } from '../domain/permissions';
import { GovernmentUtilityBar, PortalFooter, PortalMasthead } from './PortalChrome';

export function AppShell() {
  const { user, signOut, has } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  if (!user) return null;

  const visibleNav = PRIMARY_NAV.filter((item) => !item.requires || has(item.requires));

  const onSignOut = () => {
    signOut();
    navigate('/sign-in', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <GovernmentUtilityBar />
      <PortalMasthead />
      <header className="bg-navy-700 text-white">
        <div className="portal-width flex flex-wrap items-center justify-between gap-2 px-4 py-2">
          <button
            type="button"
            className="focus-ring inline-flex items-center gap-2 rounded border border-navy-500 px-2 py-1 text-sm lg:hidden"
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
            className={`${navOpen ? 'block' : 'hidden'} w-full lg:block lg:w-auto`}
          >
            <ul className="flex flex-col gap-1 py-2 lg:flex-row lg:flex-wrap lg:items-center lg:py-0">
              {visibleNav.map((item) => (
                <li key={item.key}>
                  <NavLink
                    to={item.path}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) =>
                      `focus-ring block rounded px-2 py-2 text-sm ${
                        isActive ? 'bg-white font-semibold text-navy-800' : 'text-white hover:bg-navy-600'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {has('alerts.manage') && (
              <Link to="/alerts" aria-label="Notifications" className="focus-ring inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-navy-600">
                <Bell size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Notifications</span>
              </Link>
            )}
            <span className="hidden md:inline">
              {user.displayName} · {ROLE_LABELS[user.role]}
            </span>
            <button type="button" onClick={onSignOut} className="focus-ring inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-navy-600">
              <LogOut size={16} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="portal-width min-w-0 flex-1 px-4 py-6">
        <Outlet />
      </main>
      <PortalFooter />
    </div>
  );
}
