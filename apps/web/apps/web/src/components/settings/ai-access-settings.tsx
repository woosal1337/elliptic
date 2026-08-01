"use client";

import { Badge, Button, Card, CardContent, Spinner } from "@companyos/ui";
import { useGrants, useRevokeGrant } from "@/hooks/use-oauth-queries";

export function AIAccessSettings() {
  const grants = useGrants();
  const revoke = useRevokeGrant();

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-medium text-foreground">AI Access</h2>
        <p className="text-small text-muted-foreground">
          Apps and devices that can read and update your Elliptic brain on your behalf.
        </p>
      </div>

      {grants.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (grants.data ?? []).length === 0 ? (
        <p className="text-small text-muted-foreground">No AI clients are connected yet.</p>
      ) : (
        (grants.data ?? []).map((grant) => (
          <Card key={grant.grant_id}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex flex-col gap-2">
                <span className="text-small font-medium text-foreground">
                  {grant.client_name} · {grant.org_name}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {grant.scopes.map((scope) => (
                    <Badge key={scope}>{scope}</Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                loading={revoke.isPending}
                onClick={() => revoke.mutate(grant.grant_id)}
              >
                Revoke
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
