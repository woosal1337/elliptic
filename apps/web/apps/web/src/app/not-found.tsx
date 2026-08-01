import Link from "next/link";
import { Button, Logo } from "@elliptic/ui";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.4]"
      />
      <header className="relative flex items-center justify-center px-6 py-8">
        <Link
          href="/"
          aria-label="Elliptic home"
          className="inline-flex items-center transition-opacity duration-150 hover:opacity-90"
        >
          <Logo size="md" />
        </Link>
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <span className="font-mono text-mono-label uppercase tracking-wide text-accent">
          Error 404
        </span>
        <h1 className="mt-3 font-display text-h1 font-semibold tracking-[-0.02em] text-foreground">
          This page wandered off
        </h1>
        <p className="mt-3 max-w-md text-body leading-relaxed text-muted-foreground">
          The page you&rsquo;re looking for doesn&rsquo;t exist, moved, or never did. Let&rsquo;s get
          you back to something real.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://docs.company.chele.bi">Read the docs</a>
          </Button>
        </div>
      </main>
    </div>
  );
}
