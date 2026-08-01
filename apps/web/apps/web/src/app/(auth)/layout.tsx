import Link from "next/link";
import { Logo } from "@elliptic/ui";
import { Check } from "lucide-react";

const HIGHLIGHTS = [
  "Boards, tasks, and sprints your agents run with you",
  "A built-in MCP server, so agents work over your tools",
  "Bring your own OpenAI or Anthropic key",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-border bg-canvas text-foreground lg:flex lg:flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.5]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 size-[520px] rounded-full bg-accent/15 blur-3xl"
        />
        <div className="relative flex flex-1 items-stretch justify-center px-12 py-14">
          <div className="flex w-full max-w-sm flex-col justify-between gap-16">
            <Link href="/" className="inline-flex w-fit items-center transition-opacity duration-150 hover:opacity-90">
              <Logo size="md" />
            </Link>
            <div className="flex flex-col gap-8">
              <p className="text-balance font-display text-h2 font-semibold tracking-[-0.025em]">
                Jira for your agents.
              </p>
              <ul className="flex flex-col gap-4">
                {HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-small text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-caption text-muted-foreground">© 2026 Elliptic</p>
          </div>
        </div>
      </aside>

      <main className="flex flex-col bg-background">
        <div className="flex items-center justify-between px-6 py-6 lg:hidden">
          <Link href="/" className="inline-flex items-center transition-opacity duration-150 hover:opacity-90">
            <Logo size="md" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
