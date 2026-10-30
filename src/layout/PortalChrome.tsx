import { Link } from 'react-router-dom';

export function GovernmentUtilityBar() {
  return (
    <div className="portal-utility">
      <div className="portal-width flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
        <span>Government of India</span>
        <a className="focus-ring rounded underline" href="#main-content">Skip to main content</a>
      </div>
    </div>
  );
}

export function PortalMasthead() {
  return (
    <>
      <div className="tricolour-strip" aria-hidden="true">
        <span className="saffron"></span><span className="white"></span><span className="green"></span>
      </div>
      <div className="bg-white">
        <div className="portal-width px-4 py-4">
          <Link to="/overview" className="focus-ring rounded text-navy-800">
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-700">
              All India Council for Technical Education
            </span>
            <span className="block text-2xl font-semibold">AICTE SmartFlow</span>
          </Link>
        </div>
      </div>
    </>
  );
}

export function PortalFooter() {
  return (
    <footer className="border-t border-neutral-300 bg-white">
      <div className="portal-width px-4 py-4 text-xs leading-relaxed text-neutral-700">
        Prototype build. This is not an official AICTE service and does not issue approvals. Institutions, users and records shown are fictional.
      </div>
    </footer>
  );
}
