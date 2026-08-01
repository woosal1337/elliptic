import { pageMetadata } from "@/lib/seo";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Blocks } from "@/app/docs/_components/blocks";
import { formatDate } from "@/lib/format";
import { sortedReleases } from "./_content/releases";

export const metadata = pageMetadata({
  title: "Changelog",
  description: "Notable changes to Elliptic, newest first.",
  path: "/changelog",
});

export default function ChangelogPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-16 lg:py-24">
          <p className="font-mono text-mono-label uppercase text-muted-foreground">Changelog</p>
          <h1 className="mt-3 font-display text-h1 font-semibold tracking-[-0.02em] text-foreground">
            Changelog
          </h1>
          <p className="mt-3 text-lead text-muted-foreground">
            Notable changes to Elliptic, newest first.
          </p>

          <div className="mt-12 flex flex-col gap-16">
            {sortedReleases.map((release) => (
              <section key={release.version} className="flex flex-col">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-h2 font-semibold tracking-[-0.02em] text-foreground">
                    {release.version}
                  </h2>
                  <span className="font-mono text-mono-label uppercase text-muted-foreground">
                    {formatDate(release.date)}
                  </span>
                </div>
                <div className="mt-2">
                  <Blocks blocks={release.blocks} />
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
