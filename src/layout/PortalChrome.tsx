import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
import type { DemoUser } from '../domain/types';
import { ROLE_LABELS } from '../domain/permissions';
import { formatDateTime } from '../domain/labels';
import { getLastDataRefresh, subscribe } from '../mock/store';

type FontScale = 'small' | 'default' | 'large';

const FONT_SCALE_VALUES: Record<FontScale, string> = {
  small: '14px',
  default: '16px',
  large: '18px',
};

function readPreference<T extends string>(key: string, values: readonly T[], fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return values.includes(stored as T) ? stored as T : fallback;
  } catch (error) {
    console.warn(`Unable to read portal preference "${key}".`, error);
    return fallback;
  }
}

function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Unable to save portal preference "${key}".`, error);
  }
}

export function GovernmentUtilityBar() {
  const [fontScale, setFontScale] = useState<FontScale>(() =>
    readPreference('smartflow-font-scale', ['small', 'default', 'large'], 'default'),
  );
  const [highContrast, setHighContrast] = useState(() =>
    readPreference('smartflow-high-contrast', ['true', 'false'], 'false') === 'true',
  );

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SCALE_VALUES[fontScale];
    writePreference('smartflow-font-scale', fontScale);
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.dataset.highContrast = String(highContrast);
    writePreference('smartflow-high-contrast', String(highContrast));
  }, [highContrast]);

  return (
    <>
      <div className="tricolour-strip" aria-hidden="true">
        <span className="saffron" />
        <span className="white" />
        <span className="green" />
      </div>
      <div className="portal-utility">
        <div className="portal-width flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1 text-xs">
          <span className="font-medium">Government of India</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a className="skip-link focus-ring" href="#main-content">Skip to main content</a>
            <div className="inline-flex items-center gap-1" role="group" aria-label="Text size">
              <button type="button" className="utility-control" aria-label="Decrease text size" onClick={() => setFontScale('small')}>A-</button>
              <button type="button" className="utility-control" aria-label="Default text size" onClick={() => setFontScale('default')}>A</button>
              <button type="button" className="utility-control" aria-label="Increase text size" onClick={() => setFontScale('large')}>A+</button>
            </div>
            <button
              type="button"
              className="utility-control"
              aria-pressed={highContrast}
              onClick={() => setHighContrast((enabled) => !enabled)}
            >
              {highContrast ? 'Standard contrast' : 'High contrast'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function PortalMasthead({
  user,
  unreadCount = 0,
  onSignOut,
  canViewNotifications = false,
  notificationError = false,
}: {
  user?: DemoUser | null;
  unreadCount?: number;
  onSignOut?: () => void;
  canViewNotifications?: boolean;
  notificationError?: boolean;
}) {
  return (
    <div className="bg-navy-800 text-white">
      <div className="portal-width flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2">
        <Link to="/overview" className="focus-ring text-white no-underline">
          <span className="block text-xl font-semibold leading-tight">AICTE SmartFlow</span>
          <span className="hidden text-xs text-neutral-100 sm:block">
            Integrated approval workflow, compliance and alert management
          </span>
        </Link>
        {user && (
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
            {canViewNotifications && (
              <Link to="/alerts" className="focus-ring inline-flex min-h-8 items-center gap-2 text-white underline">
                <Bell size={16} aria-hidden="true" />
                <span>Notifications</span>
                <span
                  className="border border-white px-1.5 py-0.5 text-xs tabular-nums"
                  aria-label={notificationError ? 'Unread alert count unavailable' : `${unreadCount} unread alerts`}
                  title={notificationError ? 'Unread alert count unavailable' : undefined}
                >
                  {notificationError ? '!' : unreadCount}
                </span>
              </Link>
            )}
            <span className="max-w-64 text-right">
              {user.displayName} · {ROLE_LABELS[user.role]}
            </span>
            {onSignOut && (
              <button type="button" onClick={onSignOut} className="focus-ring inline-flex min-h-8 items-center gap-2 text-white underline">
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PortalFooter() {
  const [now, setNow] = useState(() => new Date());
  const [lastRefresh, setLastRefresh] = useState(getLastDataRefresh);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
      setLastRefresh(getLastDataRefresh());
    }, 60_000);
    const unsubscribe = subscribe(() => setLastRefresh(getLastDataRefresh()));
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, []);

  return (
    <footer className="border-t-4 border-saffron-500 bg-navy-900 text-white">
      <div className="portal-width flex flex-wrap items-start justify-between gap-3 px-4 py-4 text-xs leading-relaxed">
        <p className="max-w-3xl">
          Prototype build. This is not an official AICTE service and does not issue approvals. Institutions, users and records shown are fictional.
        </p>
        <div className="text-right tabular-nums">
          <p><time dateTime={now.toISOString()}>{formatDateTime(now.toISOString())}</time></p>
          <p>Last data refresh: <time dateTime={lastRefresh}>{formatDateTime(lastRefresh)}</time></p>
        </div>
      </div>
    </footer>
  );
}
