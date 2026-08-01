"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Send, ShieldOff } from "lucide-react";
import {
  Button,
  Input,
  Logo,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from "@elliptic/ui";
import { usePublicIntakeForm, useSubmitIntakeForm } from "@/hooks/use-intake-form-queries";

export default function PublicIntakeFormPage() {
  const { token } = useParams<{ token: string }>();
  const form = usePublicIntakeForm(token);
  const submit = useSubmitIntakeForm(token);
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<string | null>(null);

  const setAnswer = (key: string, value: string) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  const fieldKey = (label: string) => label.toLowerCase().replace(/ /g, "_").slice(0, 40);

  const onSubmit = () => {
    if (!title.trim()) return;
    submit.mutate(
      { title: title.trim(), answers },
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
          <p className="text-small text-muted-foreground">This form is not available.</p>
        </div>
      ) : reference ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
          <CheckCircle2 className="size-8 text-success" />
          <p className="text-body font-medium text-foreground">Thanks — we received your submission.</p>
          <p className="text-caption text-muted-foreground">Reference: {reference}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6">
          <h1 className="text-h3 font-semibold text-foreground">{form.data.name}</h1>
          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-foreground">Summary</label>
            <Input
              placeholder="A short title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          {form.data.fields.map((field) => {
            const key = field.key ?? fieldKey(field.label);
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-foreground">
                  {field.label}
                  {field.required ? <span className="text-danger"> *</span> : null}
                </label>
                {field.type === "textarea" ? (
                  <Textarea value={answers[key] ?? ""} onChange={(e) => setAnswer(key, e.target.value)} />
                ) : field.type === "select" ? (
                  <Select value={answers[key] ?? ""} onValueChange={(v) => setAnswer(key, v)}>
                    <SelectTrigger aria-label={field.label}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={answers[key] ?? ""} onChange={(e) => setAnswer(key, e.target.value)} />
                )}
              </div>
            );
          })}
          <Button onClick={onSubmit} loading={submit.isPending} disabled={!title.trim()}>
            <Send className="size-4" />
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
