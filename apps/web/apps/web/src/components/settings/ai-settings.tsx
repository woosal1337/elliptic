"use client";

import { useState } from "react";
import { Bot, KeyRound, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AIUsageCard } from "@/components/settings/ai-usage-card";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  IconButton,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
} from "@elliptic/ui";
import type { AIProvider, AIUser } from "@/lib/types";
import {
  useAddAIProviderKey,
  useAIProviderKeys,
  useAIUsers,
  useCreateAIUser,
  useDeleteAIProviderKey,
  useDeleteAIUser,
  useSetDefaultAIProviderKey,
  useUpdateAIUser,
} from "@/hooks/use-ai-queries";
import { useOrg, useUpdateOrg } from "@/hooks/use-org-queries";
import { ErrorState } from "@/components/error-state";

const PROVIDERS: readonly AIProvider[] = ["openai", "anthropic", "ollama", "custom", "bedrock"];
const CONFIGURABLE_PROVIDERS: ReadonlySet<AIProvider> = new Set(["ollama", "custom", "bedrock"]);

const keySchema = z.object({
  name: z.string().min(2, "Give the key a name"),
  key: z.string().min(8, "Paste the full API key"),
});

type KeyValues = z.infer<typeof keySchema>;

function AddKeyForm({ orgId }: { orgId: string }) {
  const addKey = useAddAIProviderKey(orgId);
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [chatModel, setChatModel] = useState("");
  const [region, setRegion] = useState("");
  const form = useForm<KeyValues>({
    resolver: zodResolver(keySchema),
    defaultValues: { name: "", key: "" },
  });
  const configurable = CONFIGURABLE_PROVIDERS.has(provider);

  const onSubmit = form.handleSubmit((values) => {
    addKey.mutate(
      {
        provider,
        name: values.name,
        api_key: values.key,
        base_url: baseUrl.trim() || null,
        chat_model: chatModel.trim() || null,
        region: region.trim() || null,
      },
      {
        onSuccess: () => {
          form.reset();
          setBaseUrl("");
          setChatModel("");
          setRegion("");
        },
      }
    );
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-2" noValidate>
      <Select value={provider} onValueChange={(next) => setProvider(next as AIProvider)}>
        <SelectTrigger className="w-32 capitalize" aria-label="Provider">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROVIDERS.map((value) => (
            <SelectItem key={value} value={value} className="capitalize">
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex min-w-36 flex-1 flex-col gap-1">
        <Input placeholder="Key name" aria-label="Key name" {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-caption text-danger">{form.formState.errors.name.message}</p>
        ) : null}
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <Input
          type="password"
          placeholder="sk-…"
          aria-label="API key"
          autoComplete="off"
          {...form.register("key")}
        />
        {form.formState.errors.key ? (
          <p className="text-caption text-danger">{form.formState.errors.key.message}</p>
        ) : null}
      </div>
      {configurable ? (
        <>
          <Input
            placeholder={provider === "bedrock" ? "AWS region (e.g. us-east-1)" : "Endpoint URL"}
            aria-label={provider === "bedrock" ? "AWS region" : "Endpoint URL"}
            className="min-w-44 flex-1"
            value={provider === "bedrock" ? region : baseUrl}
            onChange={(event) =>
              provider === "bedrock"
                ? setRegion(event.target.value)
                : setBaseUrl(event.target.value)
            }
          />
          <Input
            placeholder="Chat model"
            aria-label="Chat model"
            className="min-w-36 flex-1"
            value={chatModel}
            onChange={(event) => setChatModel(event.target.value)}
          />
        </>
      ) : null}
      <Button type="submit" loading={addKey.isPending}>
        <Plus className="size-4" />
        Add key
      </Button>
    </form>
  );
}

function ProviderKeys({ orgId }: { orgId: string }) {
  const keys = useAIProviderKeys(orgId);
  const setDefault = useSetDefaultAIProviderKey(orgId);
  const deleteKey = useDeleteAIProviderKey(orgId);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Provider keys</CardTitle>
        <CardDescription>
          Bring your own keys. They are stored encrypted and only the masked value is ever shown
          again.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        <AddKeyForm orgId={orgId} />
        {keys.isPending ? (
          <>
            <Skeleton className="h-13 w-full" />
            <Skeleton className="h-13 w-full" />
          </>
        ) : keys.isError ? (
          <ErrorState error={keys.error} onRetry={() => void keys.refetch()} />
        ) : keys.data.length === 0 ? (
          <EmptyState
            icon={<KeyRound />}
            title="No keys yet"
            description="Add a provider key to enable AI summaries and chat."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {keys.data.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 shadow-xs"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-subtle text-muted-foreground">
                    <KeyRound className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 truncate text-small font-medium text-foreground">
                      {key.name}
                      {key.is_default ? (
                        <Badge variant="accent" size="sm">
                          Default
                        </Badge>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2 text-caption text-muted-foreground">
                      <Badge variant="outline" size="sm" className="capitalize">
                        {key.provider}
                      </Badge>
                      <span className="font-mono tracking-wider">••••{key.last4}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-caption text-muted-foreground">
                    Default
                    <Switch
                      checked={key.is_default}
                      onCheckedChange={(checked) =>
                        setDefault.mutate({ keyId: key.id, isDefault: checked })
                      }
                      aria-label={`Make ${key.name} the default key`}
                    />
                  </label>
                  <IconButton
                    aria-label={`Delete ${key.name}`}
                    variant="danger"
                    size="sm"
                    onClick={() => deleteKey.mutate(key.id)}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const aiUserSchema = z.object({
  name: z.string().min(2, "Name the AI user"),
  model: z.string().min(2, "Model id is required"),
  system_prompt: z.string().min(1, "System prompt is required"),
});

type AIUserValues = z.infer<typeof aiUserSchema>;

function AIUserDialog({
  orgId,
  existing,
  trigger,
}: {
  orgId: string;
  existing?: AIUser;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createAIUser = useCreateAIUser(orgId);
  const updateAIUser = useUpdateAIUser(orgId);
  const [provider, setProvider] = useState<AIProvider>(existing?.provider ?? "openai");
  const form = useForm<AIUserValues>({
    resolver: zodResolver(aiUserSchema),
    defaultValues: {
      name: existing?.name ?? "",
      model: existing?.model ?? "",
      system_prompt: existing?.system_prompt ?? "",
    },
  });

  const pending = createAIUser.isPending || updateAIUser.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const input = { ...values, provider };
    const close = () => {
      setOpen(false);
      if (!existing) form.reset();
    };
    if (existing) {
      updateAIUser.mutate({ aiUserId: existing.id, ...input }, { onSuccess: close });
    } else {
      createAIUser.mutate(input, { onSuccess: close });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${existing.name}` : "New AI user"}</DialogTitle>
          <DialogDescription>
            AI users act inside your org with their own name, model, and instructions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-user-name">Name</Label>
              <Input id="ai-user-name" placeholder="Scribe" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-caption text-danger">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(next) => setProvider(next as AIProvider)}>
                <SelectTrigger className="capitalize" aria-label="Provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((value) => (
                    <SelectItem key={value} value={value} className="capitalize">
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-user-model">Model</Label>
              <Input
                id="ai-user-model"
                placeholder="gpt-5.2"
                className="font-mono"
                {...form.register("model")}
              />
              {form.formState.errors.model ? (
                <p className="text-caption text-danger">{form.formState.errors.model.message}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-user-prompt">System prompt</Label>
            <Textarea
              id="ai-user-prompt"
              rows={6}
              placeholder="You summarize meetings for the team…"
              {...form.register("system_prompt")}
            />
            {form.formState.errors.system_prompt ? (
              <p className="text-caption text-danger">{form.formState.errors.system_prompt.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" loading={pending}>
              {existing ? "Save changes" : "Create AI user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AIUsers({ orgId }: { orgId: string }) {
  const aiUsers = useAIUsers(orgId);
  const deleteAIUser = useDeleteAIUser(orgId);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b border-border">
        <div className="flex flex-col gap-1">
          <CardTitle>AI users</CardTitle>
          <CardDescription>Custom agents that work inside this org.</CardDescription>
        </div>
        <AIUserDialog
          orgId={orgId}
          trigger={
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              New AI user
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-5">
        {aiUsers.isPending ? (
          <>
            <Skeleton className="h-13 w-full" />
            <Skeleton className="h-13 w-full" />
          </>
        ) : aiUsers.isError ? (
          <ErrorState error={aiUsers.error} onRetry={() => void aiUsers.refetch()} />
        ) : aiUsers.data.length === 0 ? (
          <EmptyState
            icon={<Bot />}
            title="No AI users yet"
            description="Create one to give your org an in-house assistant."
          />
        ) : (
          aiUsers.data.map((aiUser) => (
            <div
              key={aiUser.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 shadow-xs"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-muted text-accent">
                  <Bot className="size-4" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 truncate text-small font-medium text-foreground">
                    {aiUser.name}
                    {aiUser.is_active ? null : (
                      <Badge variant="neutral" size="sm">
                        Inactive
                      </Badge>
                    )}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    <span className="capitalize">{aiUser.provider}</span>{" "}
                    <span className="font-mono">· {aiUser.model}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <AIUserDialog
                  orgId={orgId}
                  existing={aiUser}
                  trigger={
                    <Button size="sm" variant="ghost">
                      Edit
                    </Button>
                  }
                />
                <IconButton
                  aria-label={`Delete ${aiUser.name}`}
                  variant="danger"
                  size="sm"
                  onClick={() => deleteAIUser.mutate(aiUser.id)}
                >
                  <Trash2 />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AIKillSwitch({ orgId }: { orgId: string }) {
  const org = useOrg(orgId);
  const updateOrg = useUpdateOrg(orgId);
  if (!org.data) return null;
  const enabled = org.data.ai_enabled;

  return (
    <section className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">AI features</h2>
        <p className="text-caption text-muted-foreground">
          {enabled
            ? "AI is on for everyone in this workspace."
            : "AI is turned off — completions, transforms, and AI users are blocked workspace-wide."}
        </p>
      </div>
      <Switch
        checked={enabled}
        disabled={updateOrg.isPending}
        onCheckedChange={(checked) => updateOrg.mutate({ ai_enabled: checked })}
        aria-label="Enable AI for this workspace"
      />
    </section>
  );
}

export function AISettings({ orgId }: { orgId: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <AIKillSwitch orgId={orgId} />
      <AIUsageCard orgId={orgId} />
      <ProviderKeys orgId={orgId} />
      <AIUsers orgId={orgId} />
    </div>
  );
}
