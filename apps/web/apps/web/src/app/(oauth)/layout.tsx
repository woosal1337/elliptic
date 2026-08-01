import Link from "next/link";
import { Logo } from "@elliptic/ui";

export default function OAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.4]" />
      <header className="relative flex items-center justify-center px-6 py-8">
        <Link href="/" className="inline-flex items-center transition-opacity duration-150 hover:opacity-90">
          <Logo size="md" />
        </Link>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-6 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
