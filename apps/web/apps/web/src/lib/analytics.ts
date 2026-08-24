/**
 * Self-hosted Open Analytics (getopen.so), running on igris through Coolify.
 *
 * Four hostnames, because the dashboard, the api, the collector and the
 * realtime stream are four services and not four paths. Only the collector
 * appears in the page the visitor loads.
 *
 * One site covers all three hostnames this app answers on — elliptic.sh,
 * docs.elliptic.sh and app.elliptic.sh. The collector matches its allowlist on
 * a host boundary, so the single entry `elliptic.sh` admits the subdomains too,
 * and the domain arrives as a report dimension rather than a separate site.
 * That is what keeps "read the docs, then sign up" one funnel.
 *
 * `OA_TRACKING_KEY` is public on purpose. It is write-only: it names the site
 * an event belongs to and reads nothing back, so it ships in the HTML the same
 * way a Plausible domain or a GA measurement id does.
 */
export const OA_COLLECTOR_URL = "https://oa-c.chele.bi";
export const OA_API_URL = "https://oa-api.chele.bi";
export const OA_DASHBOARD_URL = "https://oa.chele.bi";
export const OA_TRACKING_KEY = "oa_pk_pJLZuR6GHdW7HkSq8EVG5enhjRKNYnhc";

/**
 * Event names sent from this site.
 *
 * Written down in one place because the funnels and the reports in the
 * dashboard match on these strings: renaming one here without renaming it
 * there breaks a report quietly, months later.
 *
 * Pageviews and route changes need none of these — the tracker patches the
 * history API, so every App Router navigation is counted with no code. These
 * name the decisions: the calls to action, the way out to the docs, and the
 * links that leave for GitHub or X.
 */
export const OA_EVENTS = {
  signupClick: "signup_click",
  loginClick: "login_click",
  contactClick: "contact_click",
  docsClick: "docs_click",
  navClick: "nav_click",
  footerClick: "footer_click",
  outbound: "outbound_click",
} as const;

/**
 * Attributes that turn any element into a tracked click.
 *
 * The tracker reads `data-oa-event` and every `data-oa-prop-*` beside it on
 * click, walking up from the clicked node with `closest()`. An event therefore
 * needs no client component and no handler — which is what keeps these usable
 * inside server components, and on a `<Button asChild>` that renders someone
 * else's element.
 *
 * Property names must be lowercase: the HTML parser lowercases attribute names
 * before the tracker ever sees them, so `data-oa-prop-linkHost` would arrive as
 * `linkhost` and quietly disagree with whatever the dashboard was told to
 * expect.
 */
export function eventProps(
  name: string,
  props?: Record<string, string | number | undefined>,
): Record<string, string> {
  const attrs: Record<string, string> = { "data-oa-event": name };
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value !== undefined && value !== "") {
      attrs[`data-oa-prop-${key.toLowerCase()}`] = String(value);
    }
  }
  return attrs;
}

/**
 * The host an outbound link points at, or undefined when it is not a URL we
 * can read. The host and not the full URL: a path can carry a token or an
 * email, and the question this answers is "where does my traffic go".
 */
export function linkHost(href: string): string | undefined {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

const EXTERNAL = /^https?:\/\//;

/**
 * The attributes for one marketing link, chosen from where it points.
 *
 * Every marketing surface renders the same handful of destinations — sign up,
 * log in, contact, the docs, an outbound link — and each one names itself
 * differently in the nav, the hero and the footer. Deciding the event here
 * rather than at each call site is what stops "Start free" and "Sign up" from
 * arriving as two conversions.
 *
 * `place` is where the visitor clicked it, so one event answers both "how many
 * signed up" and "which surface sent them".
 */
export function linkProps(href: string, place: string): Record<string, string> {
  if (EXTERNAL.test(href)) {
    const host = linkHost(href);
    const name = host === "docs.elliptic.sh" ? OA_EVENTS.docsClick : OA_EVENTS.outbound;
    return eventProps(name, { place, host, href });
  }

  const path = href.split(/[?#]/)[0] ?? href;
  if (path === "/signup") return eventProps(OA_EVENTS.signupClick, { place });
  if (path === "/login") return eventProps(OA_EVENTS.loginClick, { place });
  if (path === "/contact") return eventProps(OA_EVENTS.contactClick, { place });
  if (path === "/docs" || path.startsWith("/docs/")) {
    return eventProps(OA_EVENTS.docsClick, { place, href });
  }
  return eventProps(place === "footer" ? OA_EVENTS.footerClick : OA_EVENTS.navClick, {
    place,
    href,
  });
}
