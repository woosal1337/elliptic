"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import {
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TooltipProvider,
} from "@elliptic/ui";
import { useInstanceSettings } from "@/hooks/use-instance-admin";
import { InstanceGeneralSettings } from "@/components/admin/instance-general-settings";
import { InstanceUsers } from "@/components/admin/instance-users";
import { InstanceLicensePanel } from "@/components/admin/instance-license";

export default function InstanceAdminPage() {
  const settings = useInstanceSettings();
  const router = useRouter();

  useEffect(() => {
    if (settings.isError) router.replace("/app");
  }, [settings.isError, router]);

  if (settings.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (settings.isError || !settings.data) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-accent" />
          <h1 className="text-h3 font-semibold text-foreground">Instance administration</h1>
        </div>
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="license">License</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <InstanceGeneralSettings settings={settings.data} />
          </TabsContent>
          <TabsContent value="users">
            <InstanceUsers />
          </TabsContent>
          <TabsContent value="license">
            <InstanceLicensePanel />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
