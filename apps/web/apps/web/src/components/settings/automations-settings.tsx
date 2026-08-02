"use client";

import { useState } from "react";
import { Plus, Trash2, Wand2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  IconButton,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@elliptic/ui";
import {
  useCreateTriageRule,
  useDeleteTriageRule,
  useTriageRules,
  useUpdateTriageRule,
} from "@/hooks/use-automation-queries";
import {
  ACTION_LABELS,
  TRIGGER_LABELS,
  describeRule,
  type AutomationAction,
  type AutomationActionType,
  type AutomationTrigger,
  type TriageRule,
} from "@/lib/automation";

const ACTION_TYPES = Object.keys(ACTION_LABELS) as AutomationActionType[];
const TRIGGERS = Object.keys(TRIGGER_LABELS) as AutomationTrigger[];

function RuleBuilder({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const create = useCreateTriageRule(orgId);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("on_triage_entry");
  const [isSkill, setIsSkill] = useState(false);
  const [actions, setActions] = useState<AutomationAction[]>([{ type: "label", value: "" }]);

  const updateAction = (index: number, patch: Partial<AutomationAction>) =>
    setActions((prev) => prev.map((action, i) => (i === index ? { ...action, ...patch } : action)));

  const submit = () => {
    const cleaned = actions.filter((action) => action.value.trim().length > 0);
    if (name.trim().length === 0 || cleaned.length === 0) return;
    create.mutate(
      { name: name.trim(), trigger, actions: cleaned, is_skill: isSkill, enabled: true },
      { onSuccess: onDone }
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-name">Name</Label>
        <Input
          id="rule-name"
          placeholder="Route inbound bugs"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Trigger</Label>
        <Select value={trigger} onValueChange={(value) => setTrigger(value as AutomationTrigger)}>
          <SelectTrigger aria-label="Trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGERS.map((value) => (
              <SelectItem key={value} value={value}>
                {TRIGGER_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Actions</Label>
        {actions.map((action, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={action.type}
              onValueChange={(value) => updateAction(index, { type: value as AutomationActionType })}
            >
              <SelectTrigger className="w-44" aria-label="Action type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ACTION_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={action.value}
              placeholder="value"
              aria-label="Action value"
              onChange={(event) => updateAction(index, { value: event.target.value })}
            />
            {actions.length > 1 ? (
              <IconButton
                variant="ghost"
                aria-label="Remove action"
                onClick={() => setActions((prev) => prev.filter((_, i) => i !== index))}
              >
                <X className="size-3.5" />
              </IconButton>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={() => setActions((prev) => [...prev, { type: "label", value: "" }])}
        >
          <Plus className="size-4" />
          Add action
        </Button>
      </div>
      <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
        <div className="flex flex-col">
          <Label htmlFor="rule-skill">Save as an invocable skill</Label>
          <span className="text-caption text-muted-foreground">
            Skills can be run on demand from the triage queue, not just on the trigger.
          </span>
        </div>
        <Switch id="rule-skill" checked={isSkill} onCheckedChange={setIsSkill} />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={create.isPending} onClick={submit}>
          Save automation
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function RuleRow({ orgId, rule }: { orgId: string; rule: TriageRule }) {
  const update = useUpdateTriageRule(orgId);
  const remove = useDeleteTriageRule(orgId);

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-small font-medium text-foreground">
          {rule.name}
          {rule.is_skill ? (
            <Badge variant="accent" size="sm">
              <Wand2 className="size-3" />
              Skill
            </Badge>
          ) : null}
        </span>
        <span className="text-caption text-muted-foreground">{describeRule(rule)}</span>
      </div>
      <Switch
        checked={rule.enabled}
        aria-label="Enable automation"
        disabled={update.isPending}
        onCheckedChange={(checked) => update.mutate({ id: rule.id, enabled: checked })}
      />
      <IconButton
        variant="ghost"
        aria-label="Delete automation"
        disabled={remove.isPending}
        onClick={() => remove.mutate(rule.id)}
      >
        <Trash2 className="size-3.5 text-danger" />
      </IconButton>
    </div>
  );
}

export function AutomationsSettings({ orgId }: { orgId: string }) {
  const rules = useTriageRules(orgId);
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automations & skills</CardTitle>
        <CardDescription>
          Run actions automatically when work hits triage or changes status — auto-label, route,
          assign, set priority. Save a rule as a skill to invoke it on demand. Executions are logged
          in the task&rsquo;s activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-caption font-medium text-muted-foreground">
            Rules
          </span>
          {!adding ? (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              New automation
            </Button>
          ) : null}
        </div>
        {adding ? <RuleBuilder orgId={orgId} onDone={() => setAdding(false)} /> : null}
        {(rules.data ?? []).map((rule) => (
          <RuleRow key={rule.id} orgId={orgId} rule={rule} />
        ))}
        {!adding && (rules.data ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-3 text-caption text-muted-foreground">
            No automations yet. Create one to stop sorting the same items by hand.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
