"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TriageQueue } from "@/components/triage/triage-queue";

export default function TriagePage() {
  const { orgId } = useParams<{ orgId: string }>();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Triage"
      />
      <TriageQueue orgId={orgId} />
    </div>
  );
}
