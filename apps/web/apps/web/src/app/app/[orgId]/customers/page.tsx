"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
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
  type ContractStatus,
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/hooks/use-customer-queries";
import { ErrorState } from "@/components/error-state";
import { CustomerRequests } from "@/components/customers/customer-requests";

const STATUSES: ContractStatus[] = ["prospect", "trial", "active", "churned"];
const STATUS_VARIANT: Record<ContractStatus, "neutral" | "warning" | "success" | "danger"> = {
  prospect: "neutral",
  trial: "warning",
  active: "success",
  churned: "danger",
};

export default function CustomersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [search, setSearch] = useState("");
  const customers = useCustomers(orgId, search || undefined);
  const create = useCreateCustomer(orgId);
  const update = useUpdateCustomer(orgId);
  const remove = useDeleteCustomer(orgId);
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim() }, { onSuccess: () => setName("") });
  };

  const rows = customers.data ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
      <div className="flex items-center gap-2">
        <Building2 className="size-5 text-muted-foreground" />
        <h1 className="text-h3 font-semibold text-foreground">Customers</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            value={search}
            className="pl-8"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Input
          placeholder="New customer name"
          value={name}
          className="w-56"
          onChange={(event) => setName(event.target.value)}
        />
        <Button onClick={submit} loading={create.isPending} disabled={!name.trim()}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {customers.isPending ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : customers.isError ? (
        <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-10 text-center text-small text-muted-foreground">
          No customers yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((customer) => (
            <li
              key={customer.id}
              className="group flex flex-col rounded-lg border border-border bg-surface"
            >
              <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-small font-semibold text-foreground">{customer.name}</span>
                <span className="truncate text-caption text-muted-foreground">
                  {[customer.industry, customer.email].filter(Boolean).join(" · ") || "—"}
                </span>
              </div>
              {customer.employees ? (
                <span className="text-caption text-muted-foreground">{customer.employees} ppl</span>
              ) : null}
              <Select
                value={customer.contract_status ?? "none"}
                onValueChange={(value) =>
                  update.mutate({
                    customerId: customer.id,
                    contract_status: value as ContractStatus,
                  })
                }
              >
                <SelectTrigger className="h-8 w-32" aria-label="Contract status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption} className="capitalize">
                      {statusOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customer.contract_status ? (
                <Badge variant={STATUS_VARIANT[customer.contract_status]} size="sm" className="capitalize">
                  {customer.contract_status}
                </Badge>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded((current) => (current === customer.id ? null : customer.id))}
              >
                Requests
              </Button>
              <IconButton
                aria-label={`Delete ${customer.name}`}
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove.mutate(customer.id)}
              >
                <Trash2 className="size-4" />
              </IconButton>
              </div>
              {expanded === customer.id ? (
                <CustomerRequests orgId={orgId} customerId={customer.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
