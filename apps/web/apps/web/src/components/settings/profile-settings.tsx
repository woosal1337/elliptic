"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Skeleton } from "@elliptic/ui";
import { useMe, useUpdateProfile } from "@/hooks/use-auth-queries";

export function ProfileSettings() {
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (me.data) setFullName(me.data.full_name);
  }, [me.data]);

  if (me.isPending) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (!me.data) return null;

  const dirty = fullName.trim().length > 0 && fullName.trim() !== me.data.full_name;

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Profile</h2>
        <p className="text-caption text-muted-foreground">Your name and sign-in email.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-name">Full name</Label>
        <Input
          id="account-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-email">Email</Label>
        <Input id="account-email" value={me.data.email} disabled className="max-w-sm" />
      </div>
      <Button
        className="self-start"
        size="sm"
        disabled={!dirty}
        loading={updateProfile.isPending}
        onClick={() => updateProfile.mutate({ full_name: fullName.trim() })}
      >
        Save
      </Button>
    </section>
  );
}
