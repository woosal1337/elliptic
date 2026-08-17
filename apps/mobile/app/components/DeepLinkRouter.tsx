import { FC, useEffect, useRef } from "react"
import * as Linking from "expo-linking"

import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import { parseEntityLink } from "@/services/deepLink"
import { useEntityLink } from "@/services/useEntityLink"

/**
 * Routes `elliptic://open?…` URLs to the entity they name.
 *
 * The Home Screen and Lock Screen widgets open the app this way — every row is
 * a `Link`, so a tap arrives here as a URL rather than as a notification. The
 * payload is the same one push carries, so both go through `useEntityLink`.
 *
 * React Navigation's own `linking` config cannot do this. It maps paths to
 * screens, and a task lives behind three levels of navigator with an
 * organisation that may have to be switched first. Handling the URL here keeps
 * one routing path instead of two that can drift.
 */
export const DeepLinkRouter: FC = () => {
  const { isAuthenticated } = useAuth()
  const { activeOrg } = useOrg()
  const route = useEntityLink()

  const coldStartChecked = useRef(false)

  useEffect(() => {
    // Cold start: the app was launched by the link. Wait for auth and the org
    // list, because routing has to know which workspace to be in — and there is
    // nowhere to navigate to while the sign-in screen is up.
    if (!isAuthenticated || !activeOrg || coldStartChecked.current) return
    coldStartChecked.current = true
    void Linking.getInitialURL().then((url) => {
      if (!url) return
      const link = parseEntityLink(url)
      if (link) route(link)
    })
  }, [isAuthenticated, activeOrg, route])

  useEffect(() => {
    // Warm: tapped while the app is already running, so the context is up.
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (!isAuthenticated) return
      const link = parseEntityLink(url)
      if (link) route(link)
    })
    return () => sub.remove()
  }, [isAuthenticated, route])

  return null
}
