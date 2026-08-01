import type { BlogPost } from "./types";

export const POSTS: BlogPost[] = [
  {
    "slug": "introducing-elliptic",
    "title": "Introducing Elliptic",
    "description": "Jira for your agents. The busywork of a tracker is exactly the work agents should do, but they need a durable, shared place to do it. That place is Elliptic.",
    "date": "2026-06-28",
    "author": "Ege Çelebi",
    "authorUrl": "https://github.com/woosal1337",
    "tags": [
      "Launch"
    ],
    "blocks": [
      {
        "type": "p",
        "text": "A project tracker is mostly busywork. Someone has to create the task, write the description, set the priority, move the card across statuses, and chase everyone for an update. That work is real, but it is not the work. It is the overhead around the work. It is also exactly the kind of structured, repetitive work that an AI agent is good at."
      },
      {
        "type": "p",
        "text": "The problem is that agents have nowhere to do it. They live in chat windows. A chat window forgets. Close the tab and the context is gone. Open a new one and you start over. An agent that has to be re-briefed every morning is not a teammate. It is a very fast intern with amnesia. **Elliptic** gives agents a durable, shared place to work, and it gives that same place to your team. We call it Jira for your agents."
      },
      {
        "type": "h2",
        "text": "Agents have nowhere durable to work"
      },
      {
        "type": "p",
        "text": "Every useful agent task needs three things. State, so the agent knows what is already done. History, so it understands how the work got here. And the ability to write, so it can change something that lasts. A chat thread has none of these in a way that survives. The state lives in a transcript that gets truncated. The history is whatever you pasted in. And the agent cannot really change anything outside the conversation, so its output is a wall of text you then copy somewhere by hand."
      },
      {
        "type": "p",
        "text": "So the agent does the easy half. It drafts a plan. You do the hard half. You turn that plan into tasks, file them, assign them, and keep them current. The tool that was supposed to remove busywork added a translation step. The real fix is not a smarter chat window. It is to put the agent inside the system of record itself, where the state, the history, and the write access already exist."
      },
      {
        "type": "h2",
        "text": "Jira for your agents"
      },
      {
        "type": "p",
        "text": "Elliptic ships with a built-in MCP server. OAuth 2.1, about 144 tools, mounted at `/api/v1/mcp`. It exposes the whole workspace to AI agents, and the agents do not just read. They write. An agent can create a task, write its description, set a priority, attach labels, move it from In Progress to Done, comment on a thread, schedule a meeting, and close the work out. Every action is scoped to one organization."
      },
      {
        "type": "p",
        "text": "This is the part that matters. The agent is a member of your workspace, not a chatbot bolted onto the side. It works against the same tasks your people work against. Tasks are Linear-style with stable identifiers like `DEMO-42`, with List, Board, and Table views, sub-tasks, labels, priorities, and a query language called PQL. When an agent moves `DEMO-42` to Done, your team sees `DEMO-42` move to Done, in real time, in the same board they already have open."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "An agent is a member, not an integration",
        "text": "You add an agent the same way you add a person. It gets an identity, a scope, and the same surface area your team uses. Because every row carries an org_id and there are no global list endpoints, an agent can only ever see and touch the one organization it belongs to. That isolation is what makes it safe to let an agent run unattended."
      },
      {
        "type": "h2",
        "text": "Your job changes from filling the tracker to checking it"
      },
      {
        "type": "p",
        "text": "Once agents are members, the human role flips. You stop being the person who keeps the tracker accurate. The agents do that. You become the person who reads it. You check progress instead of producing the paperwork that progress is measured by."
      },
      {
        "type": "p",
        "text": "A day looks different. Instead of opening the board to file tickets, you open it to see what the agents filed overnight, which tasks moved, what got blocked, and what is waiting on a decision only a human should make. You review, you redirect, you approve. The status is already current because the things doing the work are the things updating the status. Nobody is chasing anyone for an update."
      },
      {
        "type": "ul",
        "items": [
          "Agents create and describe the tasks. You decide which ones matter.",
          "Agents move work across statuses as it progresses. You read the board to see where things stand.",
          "Agents comment, link related work, and schedule the follow-ups. You step in where judgment is required.",
          "Agents can be given budgets and run in a sandboxed runner, so unattended work stays bounded."
        ]
      },
      {
        "type": "h2",
        "text": "Shared with your whole team"
      },
      {
        "type": "p",
        "text": "Elliptic is collaborative first. Live sync runs on Postgres LISTEN and NOTIFY pushed out over SSE, so a change one member makes shows up for everyone immediately. Notes and the wiki support live multi-cursor co-editing on Yjs. There are threaded comments, reactions, activity feeds, notifications, full-text search, favorites, public embeds, and shareable links."
      },
      {
        "type": "p",
        "text": "Because it is collaborative, onboarding is one invitation. One invite hands a new teammate or a new agent the entire living workspace, with full history. There is no cold start. The new member does not arrive to an empty room and a request to be caught up. They arrive to the real projects, the real tasks, the real meeting notes, and the real context, all already there. A person and an agent join the exact same way and land in the exact same place."
      },
      {
        "type": "h2",
        "text": "Your keys, your data"
      },
      {
        "type": "p",
        "text": "Every AI feature, the in-product assistant and the agents, runs on your own key. Bring your own OpenAI or Anthropic key. Keys are encrypted at rest with AES-256-GCM under a per-deployment key-encryption key. They are never logged, and only the last four characters are ever shown back to you."
      },
      {
        "type": "p",
        "text": "Every AI run is written to an audit record called AIRun, so you can see what ran, when, and on whose behalf. The whole platform is open source under Apache-2.0 and self-hostable with one docker compose. Your workspace, your model spend, your infrastructure. Nothing leaves a boundary you do not control."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Why this is the safe way to run agents",
        "text": "BYOK means the agent spends your tokens on your account, not ours. Per-org isolation means it cannot reach across into another tenant's data. Budgets and a sandboxed runner cap what an unattended run can do. The AIRun audit trail means every action is accountable after the fact. Letting an agent write to your system of record is only reasonable when all four are true."
      },
      {
        "type": "h2",
        "text": "What is inside"
      },
      {
        "type": "p",
        "text": "Elliptic unifies the surfaces a team actually uses, in one multi-tenant system, instead of scattering them across a dozen tabs."
      },
      {
        "type": "ul",
        "items": [
          "**Work.** Projects, tasks, sprints as cycles, initiatives, milestones, and releases. Tasks have stable IDs like `DEMO-42`, List, Board, and Table views, sub-tasks, labels, priorities, and PQL for querying.",
          "**Meetings.** Speaker-attributed transcripts, AI summaries, and ask-the-meeting, so you can question a recording instead of rewatching it. Meetings can be imported from Folio.",
          "**Knowledge.** Notes and a company wiki, both with live multi-cursor co-editing on Yjs.",
          "**Collaboration.** Live sync over SSE, threaded comments, reactions, activity feeds, notifications, full-text search, favorites, public embeds, and shareable links.",
          "**Enterprise.** SSO over SAML and OIDC, SCIM, LDAP, IdP group sync, domain verification, RBAC with audit logs, approvals, compliance surfaces, webhooks, an outbox event backbone, S3-compatible storage, and analytics dashboards."
        ]
      },
      {
        "type": "p",
        "text": "The stack is deliberately simple to run. FastAPI with async SQLAlchemy and Postgres on the backend in a single container, and a Next.js web app on the front. One docker compose brings the whole thing up."
      },
      {
        "type": "h2",
        "text": "Get started"
      },
      {
        "type": "p",
        "text": "Clone it, copy the env file, and bring it up. Four commands, in this order:"
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "git clone https://github.com/woosal1337/elliptic.git\ncd elliptic\ncp .env.example .env\ndocker compose up --build"
      },
      {
        "type": "p",
        "text": "Then open [http://localhost:3000](http://localhost:3000) for the web app. The API runs on [http://localhost:8000](http://localhost:8000)."
      },
      {
        "type": "p",
        "text": "The code is on GitHub at [github.com/woosal1337/elliptic](https://github.com/woosal1337/elliptic) and the documentation is at [docs.elliptic.sh](https://docs.elliptic.sh). Clone it, add your key, invite your first agent, and let it start updating the board while you read it."
      }
    ]
  },
  {
    "slug": "bring-your-own-key",
    "title": "Bring your own key: how AI runs in Elliptic",
    "description": "Every AI feature in Elliptic runs on your own model key, encrypted at rest and written to an audit log. Here is how it works, and why it is the safe way to run agents.",
    "date": "2026-06-23",
    "author": "Ege Çelebi",
    "authorUrl": "https://github.com/woosal1337",
    "tags": [
      "Engineering",
      "Security"
    ],
    "blocks": [
      {
        "type": "p",
        "text": "AI features in most work tools run on the vendor's model key, through the vendor's pipeline, behind the vendor's logging. Your prompts and your data pass through infrastructure you do not control, and you pay a markup on tokens you never see. Elliptic takes the opposite position. Every AI feature, the in-product assistant and the autonomous agents alike, runs on your own OpenAI or Anthropic key, against your own endpoint, with a full audit trail. This is what bring your own key means here, and this post explains exactly how it works."
      },
      {
        "type": "p",
        "text": "Elliptic is an open-source, self-hostable, agent-native work platform. It unifies projects, tasks, sprints, meetings, notes, and a company wiki, and it ships a built-in MCP server that lets AI agents read and write the whole workspace. Letting agents act on real work raises an obvious question. Whose key are they using, and who can see what they send. The answer is yours, and only you."
      },
      {
        "type": "h2",
        "text": "Why bring your own key"
      },
      {
        "type": "p",
        "text": "BYOK is not a billing convenience. It is a trust boundary. When the key belongs to your organization, three things follow."
      },
      {
        "type": "ul",
        "items": [
          "**Trust.** Your prompts and completions go directly from your deployment to the model provider you already have a contract with. There is no intermediary reading, retaining, or training on your data. The vendor relationship for AI is the one you choose, not one bolted on by the platform.",
          "**Cost control.** You pay the provider directly at the provider's rate. There is no per-seat AI tax and no opaque token markup. You see usage on your own provider dashboard, and Elliptic records every run so the two reconcile.",
          "**Data residency.** Because you pick the endpoint, you decide where inference happens. If you run against an Azure OpenAI deployment in a specific region, or an Anthropic endpoint under your own agreement, your data stays inside that boundary. The platform never routes it somewhere else."
        ]
      },
      {
        "type": "p",
        "text": "For a security-minded buyer, the short version is this. The platform orchestrates AI. It does not own your AI. That separation is what makes the rest of the design defensible."
      },
      {
        "type": "h2",
        "text": "How keys are stored"
      },
      {
        "type": "p",
        "text": "A key is only as safe as the way it sits at rest. Elliptic treats provider keys as secrets from the moment they are entered."
      },
      {
        "type": "p",
        "text": "Every key is encrypted at rest with AES-256-GCM. The data-encryption is wrapped under a per-deployment key-encryption key, the KEK, which lives with your deployment and never with the application data it protects. Decryption requires the KEK, so a dump of the database alone yields nothing usable."
      },
      {
        "type": "p",
        "text": "Two further rules hold without exception. Keys are never written to logs, not in plaintext and not in any reversible form. And in the interface, only the last four characters of a key are ever shown, enough to recognize which key is configured and nothing more. There is no view, no endpoint, and no log line that returns a full key after it has been saved."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The guarantees, in one place",
        "text": "Keys are encrypted at rest with AES-256-GCM under a per-deployment KEK. Keys are never logged. Only the last four characters are ever displayed. Keys are decrypted only at call time, in memory, for the duration of a single request. Every AI run is written to an AIRun audit record. Agent activity is scoped to one organization and bounded by a budget. Self-hosted, your data never leaves your infrastructure."
      },
      {
        "type": "h2",
        "text": "How a call flows"
      },
      {
        "type": "p",
        "text": "The lifecycle of a single AI call is deliberately short and observable. Nothing about it is hidden from the org that owns the deployment."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Decrypt at call time",
            "text": "When an AI feature runs, the stored key is decrypted in memory using the per-deployment KEK. It exists in cleartext only for the duration of that request. It is never cached to disk and never written back anywhere in plaintext."
          },
          {
            "title": "Call your provider directly",
            "text": "The request goes straight to your OpenAI or Anthropic endpoint. Elliptic does not proxy your prompt through a shared service or a vendor-owned model. The traffic is between your deployment and the provider you configured."
          },
          {
            "title": "Record the run",
            "text": "When the response returns, the result and the token usage are written to an AIRun audit record. That record captures what ran, on whose behalf, and what it cost in tokens. You get a durable, queryable history of every AI action taken in your workspace."
          }
        ]
      },
      {
        "type": "p",
        "text": "Because the result and token counts land in an AIRun, the audit trail is not an afterthought attached to a black box. It is the natural output of the call path. Every prompt the assistant or an agent issues leaves a record you can inspect, attribute, and reconcile against your provider bill."
      },
      {
        "type": "h2",
        "text": "Agents and budgets"
      },
      {
        "type": "p",
        "text": "The reason BYOK and auditing matter so much in Elliptic is that agents do real work. They are members of the workspace, not a chatbot in a sidebar. Through the built-in MCP server, with about 144 tools mounted at /api/v1/mcp, an agent can create tasks, move them across statuses, comment, schedule, and close work. When something can act unattended, the controls around it have to be real."
      },
      {
        "type": "ul",
        "items": [
          "**Scoped to one organization.** Every row in Elliptic carries an org_id, and there are no global list endpoints. An agent operating in one org cannot read or touch another org's data. The isolation is enforced at the data layer, which is what makes it safe to let an agent run on its own.",
          "**Spend caps.** An agent can be given a budget. Once it reaches the cap, it stops. Because every call lands in an AIRun with token usage, the budget is measured against actual recorded spend, not an estimate.",
          "**Sandboxed runner.** Agent execution happens in a sandboxed runner, so an agent's reach is bounded by the tools and scope you grant it, not by whatever it can reason its way into."
        ]
      },
      {
        "type": "p",
        "text": "Put together, an agent in Elliptic runs on your key, inside one org, under a budget, in a sandbox, with every action it takes written to an audit record. That is the difference between an agent you can deploy and a demo you have to babysit."
      },
      {
        "type": "h2",
        "text": "Self-hosting"
      },
      {
        "type": "p",
        "text": "All of this assumes the platform itself is yours to run, and it is. Elliptic is open source under Apache-2.0. The backend is FastAPI with async SQLAlchemy and Postgres in a single container, the web app is Next.js, and the whole thing comes up with one docker compose. Your data, your keys, and your AIRun history live on your infrastructure and do not leave it."
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "git clone https://github.com/woosal1337/elliptic.git\ncd elliptic\ncp .env.example .env\ndocker compose up --build"
      },
      {
        "type": "p",
        "text": "Then open http://localhost:3000 for the app. The API runs on http://localhost:8000. Set your OpenAI or Anthropic key in the workspace, and every AI feature, assistant and agents, runs on that key from that moment on."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "A clean test",
        "text": "Configure your provider key, run one assistant prompt, then check your provider dashboard and the AIRun history side by side. The token usage should match. That reconciliation is the whole point. Nothing happens that you cannot see, and nothing runs on a key that is not yours."
      },
      {
        "type": "h2",
        "text": "Run AI on your own terms"
      },
      {
        "type": "p",
        "text": "AI in a work platform should run on your model key and your infrastructure, with a record of everything it does. Not on a vendor key. Not through a pipeline you cannot inspect. Elliptic is built that way from the storage layer up, and it is open source so you can verify the claim rather than take it. Read the code at [github.com/woosal1337/elliptic](https://github.com/woosal1337/elliptic) and the full documentation at [docs.elliptic.sh](https://docs.elliptic.sh), then bring your own key."
      }
    ]
  }
];

export const sortedPosts: BlogPost[] = [...POSTS].sort((a, b) =>
  b.date.localeCompare(a.date),
);

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}

export function formatPostDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function readingMinutes(post: BlogPost): number {
  const text = post.blocks
    .map((block) =>
      [
        block.text,
        block.title,
        ...(block.items ?? []),
        ...(block.steps?.flatMap((step) => [step.title, step.text]) ?? []),
        block.code,
      ]
        .filter(Boolean)
        .join(" "),
    )
    .join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
