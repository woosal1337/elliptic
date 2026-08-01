"use client";

import { useState } from "react";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import {
  useDataSubjectExport,
  useOrg,
  useOrgMembers,
  useRequestErasure,
  useUpdateOrg,
} from "@/hooks/use-org-queries";

const REGIONS = [
  { value: "none", label: "Not declared" },
  { value: "us", label: "United States" },
  { value: "eu", label: "European Union" },
  { value: "uk", label: "United Kingdom" },
  { value: "apac", label: "Asia-Pacific" },
];
const FRAMEWORKS = ["soc2", "iso27001", "gdpr", "hipaa", "ccpa"];

export function ComplianceSettings({ orgId }: { orgId: string }) {
  const org = useOrg(orgId);
  const members = useOrgMembers(orgId);
  const update = useUpdateOrg(orgId);
  const exportSubject = useDataSubjectExport(orgId);
  const erase = useRequestErasure(orgId);
  const [subjectId, setSubjectId] = useState("");

  if (org.isPending || !org.data) return <Skeleton className="h-64 w-full" />;
  const data = org.data;
  const frameworks = data.compliance_frameworks ?? [];

  const toggleFramework = (key: string) => {
    const next = frameworks.includes(key)
      ? frameworks.filter((f) => f !== key)
      : [...frameworks, key];
    update.mutate({ compliance_frameworks: next });
  };

  const runExport = () => {
    if (!subjectId) return;
    exportSubject.mutate(subjectId, {
      onSuccess: (bundle) => {
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `data-subject-${subjectId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  };

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Compliance &amp; data residency
        </h2>
        <p className="text-caption text-muted-foreground">
          Declare your compliance posture and data-residency region. The region is a recorded,
          audited declaration (not enforced storage sharding).
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Data residency region
          <Select
            value={data.residency_region ?? "none"}
            onValueChange={(value) =>
              update.mutate({ residency_region: value === "none" ? null : value })
            }
          >
            <SelectTrigger className="w-60" aria-label="Residency region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((region) => (
                <SelectItem key={region.value} value={region.value}>
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-caption text-muted-foreground">Frameworks</span>
          <div className="flex flex-wrap gap-3">
            {FRAMEWORKS.map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-small uppercase text-foreground">
                <input
                  type="checkbox"
                  checked={frameworks.includes(key)}
                  onChange={() => toggleFramework(key)}
                />
                {key}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Data controller
          <Input
            key={data.data_controller ?? ""}
            defaultValue={data.data_controller ?? ""}
            onBlur={(event) =>
              update.mutate({ data_controller: event.target.value.trim() || null })
            }
            placeholder="Legal entity acting as data controller"
            className="max-w-md"
          />
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          DPO contact
          <Input
            key={data.dpo_contact ?? ""}
            defaultValue={data.dpo_contact ?? ""}
            onBlur={(event) => update.mutate({ dpo_contact: event.target.value.trim() || null })}
            placeholder="dpo@example.com"
            className="max-w-md"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="text-small font-semibold text-foreground">Data-subject requests (GDPR)</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-64" aria-label="Member">
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              {(members.data ?? []).map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.full_name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={runExport}
            loading={exportSubject.isPending}
            disabled={!subjectId}
          >
            <Download className="size-3.5" />
            Export data
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => subjectId && erase.mutate({ user_id: subjectId })}
            loading={erase.isPending}
            disabled={!subjectId}
          >
            <Trash2 className="size-3.5" />
            Request erasure
          </Button>
        </div>
      </div>
    </section>
  );
}
