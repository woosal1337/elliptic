"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, MessageSquare } from "lucide-react";
import { Button, Input, Skeleton, Textarea, toast } from "@elliptic/ui";
import { api } from "@/lib/api";
import { Markdown } from "@/components/notes/markdown";

interface PublicComment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface PublicPage {
  title: string;
  icon: string | null;
  content_html: string;
  comments: PublicComment[];
}

export default function PublicPagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const queryClient = useQueryClient();
  const key = ["public-page", token];
  const page = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.get<PublicPage>(`/api/v1/public/pages/${token}`, signal),
    retry: false,
  });

  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");

  const comment = useMutation({
    mutationFn: () =>
      api.post<PublicComment>(`/api/v1/public/pages/${token}/comments`, {
        author_name: author.trim() || "Anonymous",
        body: body.trim(),
      }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error("Couldn't post comment"),
  });

  const report = useMutation({
    mutationFn: (commentId: string) =>
      api.post<null>(`/api/v1/public/pages/${token}/comments/${commentId}/report`),
    onSuccess: () => {
      toast.success("Reported — thank you");
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-12">
      {page.isPending ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : page.isError ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <h1 className="text-h4 font-semibold text-foreground">Page not found</h1>
          <p className="mt-1 text-small text-muted-foreground">
            This public link has been unpublished or doesn&apos;t exist.
          </p>
        </div>
      ) : (
        <>
          <article className="flex flex-col gap-4">
            <h1 className="text-h2 font-semibold text-foreground">
              {page.data.icon ? <span className="mr-2">{page.data.icon}</span> : null}
              {page.data.title}
            </h1>
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: page.data.content_html }}
            />
          </article>

          <section className="flex flex-col gap-3 border-t border-border pt-6">
            <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
              <MessageSquare className="size-4" />
              Comments
            </h2>
            <ul className="flex flex-col gap-2">
              {page.data.comments.map((c) => (
                <li key={c.id} className="group rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-caption font-medium text-foreground">{c.author_name}</span>
                    <button
                      type="button"
                      aria-label="Report comment"
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      onClick={() => report.mutate(c.id)}
                    >
                      <Flag className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-1">
                    <Markdown source={c.body} />
                  </div>
                </li>
              ))}
              {page.data.comments.length === 0 ? (
                <p className="text-small text-muted-foreground">Be the first to comment.</p>
              ) : null}
            </ul>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <Input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Your name (optional)"
                className="max-w-xs"
              />
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Add a comment…"
                rows={3}
              />
              <div>
                <Button
                  size="sm"
                  onClick={() => comment.mutate()}
                  loading={comment.isPending}
                  disabled={!body.trim()}
                >
                  Post comment
                </Button>
              </div>
            </div>
          </section>

          <footer className="mt-auto pt-6 text-center text-caption text-muted-foreground">
            Powered by Elliptic
          </footer>
        </>
      )}
    </div>
  );
}
