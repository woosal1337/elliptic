"use client";

import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from "@elliptic/ui";
import {
  type IntakeFormField,
  useCreateIntakeForm,
  useDeleteIntakeForm,
  useIntakeForms,
  useUpdateIntakeForm,
} from "@/hooks/use-intake-form-queries";

const FIELD_TYPES: IntakeFormField["type"][] = ["text", "textarea", "select"];

export function ProjectIntakeForms({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const forms = useIntakeForms(orgId, projectId);
  const create = useCreateIntakeForm(orgId, projectId);
  const update = useUpdateIntakeForm(orgId, projectId);
  const remove = useDeleteIntakeForm(orgId, projectId);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<IntakeFormField[]>([]);

  const addField = () =>
    setFields((current) => [...current, { label: "", type: "text", required: false, options: [] }]);

  const patchField = (index: number, patch: Partial<IntakeFormField>) =>
    setFields((current) => current.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const submit = () => {
    if (!name.trim() || fields.some((f) => !f.label.trim())) return;
    create.mutate(
      { name: name.trim(), fields },
      {
        onSuccess: () => {
          setName("");
          setFields([]);
        },
      }
    );
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/intake-forms/${token}`;
    void navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-small font-semibold text-foreground">Custom intake forms</h3>
        <p className="text-caption text-muted-foreground">
          Public forms with configurable fields; submissions land in this project&rsquo;s triage queue.
        </p>
      </div>

      {forms.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : (forms.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-2">
          {(forms.data ?? []).map((form) => (
            <li
              key={form.id}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-small"
            >
              <span className="flex-1 truncate font-medium text-foreground">{form.name}</span>
              <Badge variant="neutral" size="sm">
                {form.fields.length} field{form.fields.length === 1 ? "" : "s"}
              </Badge>
              {!form.enabled ? <Badge variant="outline" size="sm">Disabled</Badge> : null}
              {canManage ? (
                <>
                  <IconButton aria-label="Copy public link" variant="ghost" size="sm" onClick={() => copyLink(form.token)}>
                    <Copy className="size-4" />
                  </IconButton>
                  <button
                    type="button"
                    className="text-caption text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      update.mutate({ formId: form.id, enabled: !form.enabled })
                    }
                  >
                    {form.enabled ? "Disable" : "Enable"}
                  </button>
                  <IconButton aria-label="Delete form" variant="ghost" size="sm" onClick={() => remove.mutate(form.id)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
          <Input placeholder="Form name (e.g. Bug report)" value={name} onChange={(e) => setName(e.target.value)} />
          {fields.map((field, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Field label"
                value={field.label}
                className="w-44"
                onChange={(e) => patchField(index, { label: e.target.value })}
              />
              <Select value={field.type} onValueChange={(v) => patchField(index, { type: v as IntakeFormField["type"] })}>
                <SelectTrigger aria-label="Field type" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-1 text-caption text-muted-foreground">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => patchField(index, { required: e.target.checked })}
                />
                Required
              </label>
              <IconButton
                aria-label="Remove field"
                variant="ghost"
                size="sm"
                onClick={() => setFields((c) => c.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={addField}>
              <Plus className="size-3.5" />
              Add field
            </Button>
            <Button size="sm" onClick={submit} loading={create.isPending} disabled={!name.trim()}>
              Create form
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
