"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@elliptic/ui";
import { PageHeader } from "@/components/page-header";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AccessTokensSettings } from "@/components/settings/access-tokens-settings";
import { TwoFactorSettings } from "@/components/account/two-factor-settings";
import { OAuthAppsSettings } from "@/components/account/oauth-apps-settings";

export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow="Account"
        title="Your account"
        description="Personal profile, preferences, and security — separate from organization settings."
      />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
        <TabsContent value="security" className="flex flex-col gap-6">
          <TwoFactorSettings />
          <AccessTokensSettings />
          <OAuthAppsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
