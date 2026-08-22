"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@elliptic/ui";

export interface NameDialogRequest {
  title: string;
  /** The field label, also the input's accessible name. */
  label: string;
  description?: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
}

/**
 * The one dialog behind every "give this a name" moment — a folder, a rename.
 * It replaces window.prompt, which renders browser chrome no theme reaches.
 * Open it by setting a request; null closes it.
 */
export function NameDialog({
  request,
  onClose,
}: {
  request: NameDialogRequest | null;
  onClose: () => void;
}) {
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    if (request) setValue(request.initialValue ?? "");
  }, [request]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!request || trimmed.length === 0) return;
    request.onSubmit(trimmed);
    onClose();
  };

  return (
    <Dialog open={request !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-sm">
        {request ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{request.title}</DialogTitle>
              {request.description ? (
                <DialogDescription>{request.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name-dialog-value">{request.label}</Label>
              <Input
                id="name-dialog-value"
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                maxLength={200}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={value.trim().length === 0}>
                {request.submitLabel ?? "Save"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
