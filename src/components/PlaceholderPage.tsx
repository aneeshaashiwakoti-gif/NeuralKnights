import { Link } from 'react-router-dom';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title" className="text-title text-navy-800">{title}</h1>
      <p className="mt-2 text-sm text-neutral-700">The requested page could not be found.</p>
      <p className="mt-3">
        <Link className="focus-ring rounded text-navy-700 underline" to="/overview">Return to overview</Link>
      </p>
    </section>
  );
}
