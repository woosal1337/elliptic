import { useCallback } from "react"

import { useOrg } from "@/context/OrgContext"

import { type EntityLink, routeToEntity } from "./deepLink"

/**
 * Returns the one function that opens an {@link EntityLink}.
 *
 * The organisation is switched before navigating, and that order is the whole
 * reason this is a hook rather than a plain function. A link can name a
 * workspace the app is not currently in — a push is not per-org, and a widget
 * instance is configured for whichever workspace its owner picked. Opening the
 * entity without switching first fetches it under the wrong organisation and
 * reports it deleted or forbidden, which is what "Couldn't open this task" was
 * actually saying.
 */
export function useEntityLink() {
  const { activeOrg, setActiveOrgId } = useOrg()

  return useCallback(
    (data: EntityLink | undefined) => {
      if (data?.org_id && data.org_id !== activeOrg?.id) setActiveOrgId(data.org_id)
      routeToEntity(data)
    },
    [activeOrg?.id, setActiveOrgId],
  )
}
