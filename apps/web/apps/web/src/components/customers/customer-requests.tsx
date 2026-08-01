"use client";

import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
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
} from "@elliptic/ui";
import {
  type RequestStatus,
  useCreateCustomerRequest,
  useCustomerRequests,
  useDeleteCustomerRequest,
  useUpdateCustomerRequest,
} from "@/hooks/use-customer-queries";

const STATUSES: RequestStatus[] = ["open", "planned", "in_progress", "closed"];
const STATUS_VARIANT: Record<RequestStatus, "neutral" | "warning" | "success"> = {
  open: "neutral",
  planned: "warning",
  in_progress: "warning",
  closed: "success",
};

export function CustomerRequests({ orgId, customerId }: { orgId: string; customerId: string }) {
  const requests = useCustomerRequests(orgId, customerId);
  const create = useCreateCustomerRequest(orgId, customerId);
  const update = useUpdateCustomerRequest(orgId, customerId);
  const remove = useDeleteCustomerRequest(orgId, customerId);
  const [title, setTitle] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    create.mutate({ title: title.trim() }, { onSuccess: () => setTitle("") });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="New request (e.g. SSO support)"
          value={title}
          className="h-8 flex-1"
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button size="sm" onClick={submit} loading={create.isPending} disabled={!title.trim()}>
          <Plus className="size-3.5" />
          Add request
        </Button>
      </div>
      {requests.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (requests.data ?? []).length === 0 ? (
        <p className="text-caption text-muted-foreground/70">No requests yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {(requests.data ?? []).map((request) => (
            <li
              key={request.id}
              className="group flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 text-small"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">{request.title}</span>
              {request.task_ids.length > 0 ? (
                <Badge variant="neutral" size="sm">
                  {request.task_ids.length} linked
                </Badge>
              ) : null}
              {request.source_url ? (
                <a
                  href={request.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Open source"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
              <Select
                value={request.status}
                onValueChange={(value) =>
                  update.mutate({ requestId: request.id, status: value as RequestStatus })
                }
              >
                <SelectTrigger className="h-7 w-32" aria-label="Request status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption} className="capitalize">
                      {statusOption.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={STATUS_VARIANT[request.status]} size="sm" className="capitalize">
                {request.status.replace("_", " ")}
              </Badge>
              <IconButton
                aria-label="Delete request"
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove.mutate(request.id)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
