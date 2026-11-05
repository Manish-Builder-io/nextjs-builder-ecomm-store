import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">404</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink">Page not found</h1>
      <p className="mt-3 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-contrast hover:bg-brand-hover">Go home</Link>
        <Link href="/collections/all" className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-alt">Shop all</Link>
      </div>
    </main>
  );
}
