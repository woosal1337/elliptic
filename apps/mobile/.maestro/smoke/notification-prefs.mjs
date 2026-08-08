// Smoke test against production: does silencing a category actually stop the
// push while still recording the notification?
//
// Runs as the QA account, in the Maestro QA workspace, so it never touches real
// data. Reads the credential from the environment; it is never printed.
const API = "https://api.elliptic.sh/api/v1";
const email = process.env.MAESTRO_EMAIL, password = process.env.MAESTRO_PASSWORD;
if (!email || !password) { console.error("MAESTRO_EMAIL/PASSWORD not set"); process.exit(1); }

const login = await fetch(`${API}/auth/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) { console.error("login failed:", login.status, (await login.text()).slice(0,200)); process.exit(1); }
// The login payload nests the pair under `tokens`, not a flat access_token.
const auth = (await login.json()).data;
const token = auth.tokens.access_token ?? auth.tokens.access ?? Object.values(auth.tokens)[0];
const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

const orgsRes = (await (await fetch(`${API}/orgs`, { headers: H })).json()).data;
const orgs = Array.isArray(orgsRes) ? orgsRes : (orgsRes?.items ?? []);
const org = orgs.find((o) => /maestro/i.test(o.name)) ?? orgs[0];
if (!org) { console.error("no workspace visible to this account"); process.exit(1); }
console.log("workspace:", org.name);

// Read current preferences, then silence status changes.
const prefsUrl = `${API}/orgs/${org.id}/notifications/preferences`;
const before = (await (await fetch(prefsUrl, { headers: H })).json()).data;
console.log("prefs keys:", Object.keys(before[0] ?? before).filter((k) => k.startsWith("notify")).join(", ") || "(none yet)");

await fetch(prefsUrl, { method: "PUT", headers: H, body: JSON.stringify({ notify_state_change: false }) });
const after = (await (await fetch(prefsUrl, { headers: H })).json()).data;
const ws = (Array.isArray(after) ? after : [after]).find((p) => !p.project_id) ?? after[0];
console.log("notify_state_change now:", ws?.notify_state_change);

// Create a task; its task_created notification belongs to that category.
const projects = (await (await fetch(`${API}/orgs/${org.id}/projects`, { headers: H })).json()).data;
const project = projects.items?.[0] ?? projects[0];
const made = await fetch(`${API}/orgs/${org.id}/projects/${project.id}/tasks`, {
  method: "POST", headers: H, body: JSON.stringify({ title: "Smoke: silenced category" }),
});
const task = (await made.json()).data;
console.log("created:", task.identifier);

await new Promise((r) => setTimeout(r, 1500));
const inbox = (await (await fetch(`${API}/orgs/${org.id}/notifications?status=all`, { headers: H })).json()).data;
const rec = inbox.items.find((n) => n.entity_id === task.id && n.type === "task_created");
console.log(rec ? "RECORDED in inbox (correct: silencing hides the buzz, not the record)"
                : "NOT recorded — wrong, silencing must not suppress the row");

// Restore, so the account is left as found.
await fetch(prefsUrl, { method: "PUT", headers: H, body: JSON.stringify({ notify_state_change: true }) });
await fetch(`${API}/orgs/${org.id}/tasks/${task.id}`, { method: "DELETE", headers: H });
console.log("restored preference and deleted the smoke task");
