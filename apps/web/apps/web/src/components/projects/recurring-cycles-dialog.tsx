"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@elliptic/ui";
import { useGenerateRecurringCycles } from "@/hooks/use-cycle-queries";

export function RecurringCyclesDialog({
  orgId,
  projectId,
  open,
  onOpenChange,
}: {
  orgId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const generate = useGenerateRecurringCycles(orgId, projectId);
  const [baseTitle, setBaseTitle] = useState("Sprint");
  const [count, setCount] = useState(4);
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [cooldownDays, setCooldownDays] = useState(0);
  const [startDate, setStartDate] = useState("");

  const submit = () => {
    if (!baseTitle.trim() || !startDate) return;
    generate.mutate(
      {
        base_title: baseTitle.trim(),
        count,
        duration_weeks: durationWeeks,
        cooldown_days: cooldownDays,
        start_date: startDate,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate recurring cycles</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rc-title">Base title</Label>
            <Input id="rc-title" value={baseTitle} onChange={(e) => setBaseTitle(e.target.value)} />
            <span className="text-caption text-muted-foreground">
              Cycles are named &ldquo;{baseTitle || "Sprint"} 1&rdquo;, &ldquo;{baseTitle || "Sprint"} 2&rdquo;, …
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rc-count">How many</Label>
              <Input
                id="rc-count"
                type="number"
                min={1}
                max={52}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rc-start">First start date</Label>
              <Input id="rc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rc-duration">Duration (weeks)</Label>
              <Input
                id="rc-duration"
                type="number"
                min={1}
                max={12}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rc-cooldown">Cooldown (days)</Label>
              <Input
                id="rc-cooldown"
                type="number"
                min={0}
                max={60}
                value={cooldownDays}
                onChange={(e) => setCooldownDays(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={generate.isPending} disabled={!baseTitle.trim() || !startDate}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
