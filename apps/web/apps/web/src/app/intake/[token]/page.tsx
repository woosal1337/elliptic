"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Send, ShieldOff } from "lucide-react";
import { Button, Input, Logo, Skeleton, Textarea } from "@elliptic/ui";
import { usePublicIntakeForm, useSubmitIntake } from "@/hooks/use-intake-queries";

export default function PublicIntakePage() {
  const { token } = useParams<{ token: string }>();
  const form = usePublicIntakeForm(token);
  const submit = useSubmitIntake(token);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  const onSubmit = () => {
    if (!title.trim()) return;
    submit.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        submitter_name: name.trim() || null,
        submitter_email: email.trim() || null,
      },
      { onSuccess: (result) => setReference(result.reference) }
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-6 py-12">
      <Logo className="h-7 w-auto" />

      {form.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : form.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
          <ShieldOff className="size-8 text-muted-foreground" />
          <h1 className="text-h4 font-semibold text-foreground">Form unavailable</h1>
          <p className="text-small text-muted-foreground">
            This intake form is no longer accepting submissions.
          </p>
        </div>
      ) : reference ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
          <CheckCircle2 className="size-9 text-success" />
          <h1 className="text-h4 font-semibold text-foreground">Request received</h1>
          <p className="text-small text-muted-foreground">
            Thanks! Your request was logged as{" "}
            <span className="font-mono text-foreground">{reference}</span>. The {form.data.project_name}{" "}
            team will take it from here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-xs">
          <div className="flex flex-col gap-1">
            <h1 className="text-h4 font-semibold text-foreground">
              Submit a request to {form.data.project_name}
            </h1>
            <p className="text-small text-muted-foreground">
              {form.data.org_name} · No account needed.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="intake-title" className="text-caption font-medium text-foreground">
              Summary
            </label>
            <Input
              id="intake-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="A short summary of your request"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="intake-desc" className="text-caption font-medium text-foreground">
              Details
            </label>
            <Textarea
              id="intake-desc"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Anything that helps us understand and prioritize it"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="intake-name" className="text-caption font-medium text-foreground">
                Your name (optional)
              </label>
              <Input
                id="intake-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="intake-email" className="text-caption font-medium text-foreground">
                Email (optional)
              </label>
              <Input
                id="intake-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <Button
            onClick={onSubmit}
            loading={submit.isPending}
            disabled={title.trim().length === 0}
            className="self-start"
          >
            <Send className="size-4" />
            Submit request
          </Button>
          {submit.isError ? (
            <p className="text-caption text-danger">Could not submit — please try again.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
