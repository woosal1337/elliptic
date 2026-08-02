import { Button } from "@elliptic/ui";
import { FileQuestion } from "lucide-react";
import { getDocsBasePath } from "./_lib/base-path";

export default async function DocsNotFound() {
  const basePath = await getDocsBasePath();
  const home = basePath || "/";
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-canvas text-muted-foreground">
        <FileQuestion className="size-6" aria-hidden="true" />
      </span>
      <span className="mt-5 font-mono text-mono-label text-accent">
        Error 404
      </span>
      <h1 className="mt-2 font-display text-h2 font-semibold tracking-[-0.02em] text-foreground">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-body leading-relaxed text-muted-foreground">
        This documentation page doesn&rsquo;t exist or has moved. Use the sidebar to find what you
        need, or head back to the overview.
      </p>
      <div className="mt-8">
        <Button asChild>
          <a href={home}>Back to docs home</a>
        </Button>
      </div>
    </div>
  );
}
