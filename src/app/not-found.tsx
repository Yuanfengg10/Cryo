import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="panel not-found-panel">
        <p className="eyebrow">Not found</p>
        <h1>This lead doesn&apos;t exist in the current dataset.</h1>
        <p className="hero-text">If you expected to see a lead here, double-check the ID or refresh after your data source is connected.</p>
        <Link className="button button-primary" href="/">
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
