import type { DocPage } from "./types";

export const DOC_PAGES: DocPage[] = [
  {
    "title": "Overview & Getting Started",
    "slug": "overview-getting-started",
    "description": "What Elliptic is, the one BYOK rule, and how to create an account, start or join a workspace, run the get-started checklist, and find your way around.",
    "blocks": [
      {
        "type": "h2",
        "text": "What Elliptic is"
      },
      {
        "type": "p",
        "text": "Elliptic is an agent-native work platform. The shortest way to describe it is **Jira for your agents and your team**: humans and AI agents share the same projects, tasks, board, notes, meetings, and the same connected history of everything that happened. There is no separate AI bolt-on and no second tool for the bots. An agent picks up a task, moves it across the board, writes a note, or answers a question over exactly the same surfaces you do."
      },
      {
        "type": "p",
        "text": "Instead of scattering work across a project tracker, a notes app, a meeting recorder, and a chat tool, Elliptic keeps your projects, tasks, notes, meetings, calendar, and a complete activity feed in one connected system. Every item keeps its context, so when you open a task you can see the meeting it came from, the note that referenced it, and everything that has happened to it since."
      },
      {
        "type": "p",
        "text": "It works the way a modern issue tracker does, with a fast board of Linear-style tasks, but it reaches further than tasks. Meetings get transcripts and AI summaries that capture what was decided and who owns it. A single activity feed threads tasks, meetings, and decisions into one timeline. And a **company brain** lets your team and your agents ask questions across all of it at once."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Agents are first-class members",
        "text": "An agent in Elliptic is not a chatbot in a corner. It is a member that operates the real product, the same board, notes, meetings, and search, through the **company-brain MCP**. That is what agent-native means here: the same surfaces, the same rules, the same audit trail, whether a person or an agent did the work. See **Company-Brain MCP** and **Set up your agent** when you are ready to give an agent its own seat."
      },
      {
        "type": "h2",
        "text": "The one rule: BYOK"
      },
      {
        "type": "p",
        "text": "There is one rule that shapes every AI feature in Elliptic: **bring your own key (BYOK)**. Every AI feature runs on your organization's own model key. You store an OpenAI or Anthropic API key once, at the organization level, and all AI work, meeting summaries, asking a meeting, the company brain, and your agents, runs on that key."
      },
      {
        "type": "p",
        "text": "There is no hidden pooled model and no shared bill. Elliptic never quietly routes your prompts through a model account you do not control. The cost lands on your own provider invoice, the data stays under your control, and you decide which provider and which model your organization uses."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Set up your key early",
        "text": "AI surfaces stay dormant until a key exists. If you are an owner or admin, add an OpenAI or Anthropic key under **Settings** soon after you create your organization, so summaries, the brain, and agents are ready the moment your team reaches for them. Until a key is connected, the AI features are simply quiet, the rest of the product works fully without one."
      },
      {
        "type": "h2",
        "text": "Create your account"
      },
      {
        "type": "p",
        "text": "Your account is your personal login, identified by your email address and protected by a password. It carries your full name and follows you across every organization you belong to. One account can be a member of many organizations at once."
      },
      {
        "type": "p",
        "text": "On the hosted instance, head to [elliptic.sh](https://elliptic.sh) and choose **Start free**, which opens the sign-up page. If you are self-hosting, open your own instance's URL instead."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open sign-up",
            "text": "Go to the home page and select Start free, or go straight to the Create your account page."
          },
          {
            "title": "Enter your details",
            "text": "Provide your full name, your email address, and a password. The password must be at least 8 characters."
          },
          {
            "title": "Create the account",
            "text": "Select Create account. If your instance has email sending configured, Elliptic sends a 6-digit verification code and takes you to the Verify your email page. If email is not configured, your account is verified automatically and you go straight to choosing a workspace."
          }
        ]
      },
      {
        "type": "h3",
        "text": "Verifying your email"
      },
      {
        "type": "p",
        "text": "Email verification turns on automatically whenever your instance has an email provider configured. When it is on, Elliptic emails you a **6-digit code** right after sign-up and you confirm it before you can use the account."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Read the code",
            "text": "Open the email from Elliptic and copy the 6-digit code. The code is valid for a limited time, so use it promptly."
          },
          {
            "title": "Enter it",
            "text": "On the Verify your email page, type the 6 digits and select Verify. Elliptic signs you in and continues to the workspace chooser."
          },
          {
            "title": "Need a new code?",
            "text": "If the code did not arrive or has expired, select Resend code. There is a short cooldown between resends, and a fresh code replaces the previous one."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "When verification is skipped",
        "text": "On an instance with no email provider, for example a local or evaluation setup, registration **auto-verifies** your account and there is no code step. The behavior is identical otherwise. This is why the same build works whether or not email sending is wired up."
      },
      {
        "type": "p",
        "text": "Already have an account? Use the **Sign in** link instead. You enter your email and password, and Elliptic drops you back into your most recent workspace. Sessions are kept in secure cookies, so you do not re-enter your password every visit."
      },
      {
        "type": "p",
        "text": "If your instance has them configured, the sign-in page also offers **Continue with Google** or **Continue with GitHub**, and **single sign-on** by company domain, so you can sign in without a password. To sign out, open the user menu at the bottom-left of the workspace and choose Log out."
      },
      {
        "type": "h2",
        "text": "Create or join a workspace"
      },
      {
        "type": "p",
        "text": "An **organization** (org), also called a workspace, is the shared home for one company or team. Your projects, tasks, notes, meetings, people, and your model key all live inside an organization. The entire app lives under `/app/<org-id>`, so every screen you open belongs to exactly one org. There are two ways in: create your own, or accept an invite."
      },
      {
        "type": "h3",
        "text": "Create a new workspace"
      },
      {
        "type": "p",
        "text": "If you are starting a fresh company workspace, you create the organization and automatically become its **owner**."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the workspace chooser",
            "text": "Right after sign-up you land on Choose a workspace. If you already belong to orgs, you can also create one from the org switcher at the top of the sidebar."
          },
          {
            "title": "Start a new organization",
            "text": "Select New organization (or Create organization if this is your very first one)."
          },
          {
            "title": "Name it",
            "text": "Enter a name such as Acme Inc. The name must be at least 2 characters. Elliptic generates a URL-friendly slug from the name automatically, you never set one by hand."
          },
          {
            "title": "Create",
            "text": "Select Create. You become the owner, Elliptic seeds a default task workflow for the org, and it takes you straight into your projects with the first-project dialog open, so you can start working immediately."
          }
        ]
      },
      {
        "type": "p",
        "text": "The slug is derived from your name, for example Acme Inc becomes `acme-inc`. Slugs are unique across the instance, so if your name produces one that is already taken, Elliptic appends a short random suffix automatically (for example `acme-inc-4f9a2c`). The slug is stable, renaming your org later does not change it."
      },
      {
        "type": "h3",
        "text": "Join by invite"
      },
      {
        "type": "p",
        "text": "If a teammate is adding you to an existing organization, an admin or owner sends an invitation tied to your email address. You accept it through a **one-time link** that is valid for **7 days** and can be used only once, by the exact email it was issued to."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the invite link",
            "text": "Click the invite link your admin shared. It opens the Join page, which shows the organization, the role you are being given, and the email the invite was sent to."
          },
          {
            "title": "Sign in with the invited email",
            "text": "You must be signed in with the exact email address the invite was sent to. If you do not have an account yet, create one with that email; if you are signed in as someone else, switch to the invited address first."
          },
          {
            "title": "Accept",
            "text": "Once you are signed in with the matching email, Elliptic accepts the invite for you and drops you into the organization's projects. If your email needs verification first, finish that step before accepting."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Invites expire and are single-use",
        "text": "An invitation is valid for **7 days** and can only be accepted **once**, by the email it was issued to. If the link has expired, was already used, was revoked, or was sent to a different address, the Join page tells you which, ask your admin to send a fresh one."
      },
      {
        "type": "h3",
        "text": "Switch between workspaces"
      },
      {
        "type": "p",
        "text": "If you belong to more than one organization, you move between them from the org switcher at the top of the sidebar."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the switcher",
            "text": "Select the organization name at the top of the sidebar."
          },
          {
            "title": "Pick another org",
            "text": "Choose any organization from the list. A checkmark marks the one you are in. Elliptic switches you over and opens that org's projects."
          },
          {
            "title": "Or create a new one",
            "text": "Select New organization at the bottom of the switcher to spin up another workspace."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Elliptic remembers where you left off",
        "text": "Your most recently used organization is remembered on your device, so the next time you open Elliptic it takes you right back to it. If you belong to exactly one organization, you skip the chooser entirely and land straight in your workspace."
      },
      {
        "type": "h2",
        "text": "First steps"
      },
      {
        "type": "p",
        "text": "A brand-new workspace shows a **get-started checklist** on your home view. It is not a static tour, each item flips to done automatically as Elliptic detects the matching thing in your org, computed from live counts. The card shows your progress and disappears on its own once every step is complete (you can also dismiss it). Here is what it tracks:"
      },
      {
        "type": "table",
        "headers": [
          "Step",
          "What it means",
          "Done when"
        ],
        "rows": [
          [
            "Create your first project",
            "Spin up a container for related work, where tasks live.",
            "Your org has at least one project."
          ],
          [
            "Add a work item",
            "Create your first task on the board.",
            "Your org has at least one task."
          ],
          [
            "Invite a teammate",
            "Bring a second person into the org by invite.",
            "The org has more than one member."
          ],
          [
            "Plan a cycle",
            "Set up a cycle (a time-boxed sprint of work).",
            "Your org has at least one cycle."
          ],
          [
            "Write a note or doc",
            "Capture a spec, decision, or research note.",
            "Your org has at least one note."
          ],
          [
            "Connect an AI provider",
            "Add your OpenAI or Anthropic key (this is BYOK).",
            "Your org has at least one provider key stored."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Each row links straight to where you do that work, so the checklist doubles as a launchpad. Connecting an AI provider is the step that turns on every AI surface in the product, including your agents, so it is worth doing early."
      },
      {
        "type": "h2",
        "text": "Find your way around"
      },
      {
        "type": "p",
        "text": "Once you are inside an organization, every page shares the same frame: a **sidebar** on the left, a **top bar** across the top, and your current view filling the rest of the screen."
      },
      {
        "type": "h3",
        "text": "The sidebar"
      },
      {
        "type": "p",
        "text": "The left sidebar is how you move between sections. At the very top sits the **org switcher**, showing your current organization. Below it, navigation is grouped into two sections, **Personal** (what is on your plate) and **Workspace** (the shared surfaces of the org). Your user menu sits at the bottom."
      },
      {
        "type": "table",
        "headers": [
          "Section",
          "Item",
          "What it opens"
        ],
        "rows": [
          [
            "Personal",
            "My Tasks",
            "Every task assigned to you across all projects, in one personal list."
          ],
          [
            "Personal",
            "Inbox",
            "Your personal inbox of things needing your attention."
          ],
          [
            "Personal",
            "Assistant",
            "Your AI assistant, working on your org's own model key."
          ],
          [
            "Personal",
            "Triage",
            "Incoming items to sort and route, with a live count badge."
          ],
          [
            "Personal",
            "Notes",
            "Your notes and documents."
          ],
          [
            "Workspace",
            "Projects",
            "All projects and their task boards. The default landing page."
          ],
          [
            "Workspace",
            "Initiatives",
            "Larger bodies of work that span projects."
          ],
          [
            "Workspace",
            "Releases",
            "Shipping milestones and what is going out in them."
          ],
          [
            "Workspace",
            "Customers",
            "The customers your work is tied to."
          ],
          [
            "Workspace",
            "Meetings",
            "Recorded meetings with transcripts and AI summaries."
          ],
          [
            "Workspace",
            "Calendar",
            "A time-based view of the organization."
          ],
          [
            "Workspace",
            "Activity",
            "The live, organization-wide activity feed."
          ],
          [
            "Workspace",
            "Query",
            "Ask the company brain across every surface at once."
          ],
          [
            "Workspace",
            "Dashboards",
            "Saved views and metrics about your work."
          ],
          [
            "Workspace",
            "Settings",
            "Org settings, members and invites, and your model key."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Star a project and a **Favorites** group appears in the sidebar for fast access to it. The sidebar is otherwise yours to arrange. Drag any item to reorder it, or use its options menu to **Pin to top** or **Move to More**, a collapsible group at the bottom that keeps your nav focused. On a wide layout you can also collapse the whole sidebar to icons. Your arrangement is remembered on your device."
      },
      {
        "type": "h3",
        "text": "The top bar"
      },
      {
        "type": "p",
        "text": "The bar across the top of every page shows the name of the section you are in. On the right it carries the tools you will reach for constantly:"
      },
      {
        "type": "ul",
        "items": [
          "**Quick add.** A fast way to capture a task from anywhere in the app.",
          "**Search and command palette.** Select Search, or press ⌘K (Ctrl-K on Windows), to jump anywhere or run quick actions without leaving the keyboard. One query spans projects, tasks, meetings, and notes, and the same palette can create a project, note, task, or calendar event, or import a meeting, on the spot.",
          "**Help menu.** Links into the docs and help.",
          "**Notification bell.** Surfaces alerts about things that need you, mentions, assignments, and updates from across the organization."
        ]
      },
      {
        "type": "h3",
        "text": "The user menu"
      },
      {
        "type": "p",
        "text": "At the bottom-left of the sidebar is your user menu, showing your name and email. Open it to jump to your **Account**, open **Org settings**, or **Log out** of your account."
      },
      {
        "type": "h2",
        "text": "Where to go next"
      },
      {
        "type": "p",
        "text": "You now have an account, a workspace, and a feel for how to get around. From here, dive into the section that matches what you want to do:"
      },
      {
        "type": "ul",
        "items": [
          "**Organizations & Members**, how orgs, roles, invites, and teams fit together.",
          "**Projects & Tasks**, create projects, run the Linear-style board, assign and prioritize work, and use My Tasks.",
          "**AI, Brain & Automations**, add your OpenAI or Anthropic key, use the company brain, and put automations to work, all on BYOK.",
          "**Company-Brain MCP**, the technical guide to the surface your agents operate over.",
          "**Set up your agent**, give an AI member its own seat and let it work the board alongside your team."
        ]
      }
    ]
  },
  {
    "title": "Core concepts",
    "slug": "core-concepts",
    "description": "The building blocks that make up Elliptic, from accounts and organizations to work items, planning layers, knowledge surfaces, and the agents that operate it all over the company-brain MCP.",
    "blocks": [
      {
        "type": "h2",
        "text": "The shape of Elliptic"
      },
      {
        "type": "p",
        "text": "Elliptic is built from a small set of building blocks that fit together the same way for everyone. Once you can picture how they nest, every screen in the product reads as a different view onto the same few things. This page is the map. It names each concept, says what it is, and points you to the guide that covers it in depth."
      },
      {
        "type": "p",
        "text": "The framing to keep in mind is **Jira for your agents**. Everything below is a surface a human can use and an agent can drive. Your AI members are not bolted on the side, they are first-class members that operate these same boards, notes, and meetings over the company-brain MCP, running on your organization's own model key."
      },
      {
        "type": "h2",
        "text": "How the model fits together"
      },
      {
        "type": "p",
        "text": "Read it as a nesting doll. Your **account** is your single login. An account belongs to one or more **organizations**, and an organization is a fully isolated workspace. Inside an organization, people are grouped into **teams** (teamspaces), and teams own **projects**. A project is a container of **work items** (tasks, bugs, stories, epics), and a work item can have **sub-tasks** beneath it. That is the spine: Account, Organization, Team, Project, Work item, Sub-task."
      },
      {
        "type": "p",
        "text": "Layered across that spine are the surfaces that give the work context. **Notes and wiki pages** hold the thinking. **Meetings** capture conversations as transcripts and AI summaries. The **activity feed** threads every change into one timeline. The **calendar** places dated work on a grid, and the **inbox** routes what needs you personally. None of these replace the spine, they wrap around it, so a task can point back to the meeting it came from and the note that specified it."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Everything below lives inside an organization",
        "text": "With one exception, your account, every concept on this page is scoped to a single organization. Projects, tasks, notes, meetings, labels, model keys, and agents all belong to exactly one org and are invisible to every other org. That isolation is the rule that makes the rest of the model safe to share."
      },
      {
        "type": "h2",
        "text": "Account vs organization"
      },
      {
        "type": "h3",
        "text": "Account"
      },
      {
        "type": "p",
        "text": "Your **account** is your personal, global identity: your full name, your email, and your password. It is the one thing in Elliptic that is not scoped to an organization. The same account follows you across every org you belong to, and you switch between them from the organization switcher in the sidebar without logging out."
      },
      {
        "type": "h3",
        "text": "Organization"
      },
      {
        "type": "p",
        "text": "An **organization** (or org, or workspace) is a shared, fully isolated home for one company or team. It has a name you choose and a unique URL-friendly **slug** that Elliptic generates from that name. Every project, task, note, meeting, person, model key, and agent lives inside exactly one organization, and people you invite see only the org they were invited to."
      },
      {
        "type": "p",
        "text": "An organization also carries a few behavior settings that change how it operates:"
      },
      {
        "type": "ul",
        "items": [
          "**AI on or off.** A single switch (`ai_enabled`) turns every AI feature in the org on or off at once. With it off, no AI surface will run.",
          "**Block backward transitions.** When enabled (`block_backward_transitions`), a work item cannot move back into an earlier category band, for example out of a Done status into an In Progress one, keeping progress strictly forward-only.",
          "**Data residency.** An optional region pin (`residency_region`) records where the org's data should live.",
          "**Compliance.** Optional compliance frameworks, a data controller, and a DPO contact can be recorded on the org for governance."
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Switching orgs is free",
        "text": "Because your account is global, belonging to several organizations is normal. Elliptic remembers the org you used last and drops you back into it, and if you belong to exactly one org it skips the chooser entirely. See [Organizations & Members](/docs/organizations-teams-members) for the full setup."
      },
      {
        "type": "h2",
        "text": "People and roles"
      },
      {
        "type": "p",
        "text": "Everyone with access to an org is a **member** of it, and every member holds exactly one organization role. The roles are a strict hierarchy, each one outranking the one below:"
      },
      {
        "type": "table",
        "headers": [
          "Role",
          "Rank",
          "In one line"
        ],
        "rows": [
          [
            "Owner",
            "Highest",
            "Full control, including managing other owners and the org's existence. The org creator becomes the owner."
          ],
          [
            "Admin",
            "High",
            "Day-to-day management: people, teams, projects, invites, settings, and the model key. Cannot grant the owner role."
          ],
          [
            "Member",
            "Middle",
            "Does the work: projects, tasks, notes, meetings, calendar, and activity. The default for invited people."
          ],
          [
            "Guest",
            "Lowest",
            "Limited access, intended for outside collaborators rather than full members of the org."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Teams (teamspaces)"
      },
      {
        "type": "p",
        "text": "A **team** (teamspace) groups members inside an org and gives them a shared home: a name, an optional lead, and a **charter** describing what the team is for. Teams are how projects get owned. A project can be owned by a team, and a team can also be linked to many projects, granting its members a project role on each. So org roles answer \"what can you do across the workspace\" and teams answer \"which slice of the work is yours\". Projects carry their own project-level roles (admin, member, commenter, viewer) as a second axis on top of the org role."
      },
      {
        "type": "h2",
        "text": "Agents as first-class members"
      },
      {
        "type": "p",
        "text": "This is the concept that makes Elliptic different from a normal tracker. An **agent** (an AI user) is not a chatbot pinned to the corner of the screen, it is a real member of your organization with its own identity. An agent has a name, a provider, a specific model, and a **system prompt** that fixes its behavior, and it shows up wherever members show up."
      },
      {
        "type": "p",
        "text": "Four properties make an agent a true member rather than a feature:"
      },
      {
        "type": "ul",
        "items": [
          "**It has an identity.** An agent is a named entity in your org, so it can be referenced and held accountable like a person. Work items even carry a dedicated bot-assignee field, so a task can be assigned to an agent directly.",
          "**It runs on the org's key.** Every call an agent makes runs on your organization's own model key (BYOK). The cost lands on your provider bill, and the data never enters a shared pool.",
          "**It carries a budget.** Each agent can be given a monthly spend cap, set in cents per month (`budget_monthly_cents`), so an automated member can never run away with your bill.",
          "**It acts through MCP with a member's permissions.** An agent reaches the workspace through the built-in company-brain MCP server, authenticated by a token scoped to an org and a set of permissions. It can only ever do what that grant allows, and only inside the org it is connected to."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Same surfaces, same rules",
        "text": "An agent does not get a private API of its own. It creates tasks, moves them across the board, writes notes, and reads the brain through the exact same operations a person does, bounded by the exact same permissions. That is what \"first-class member\" means here. The full lifecycle, create, budget, pause, edit, delete, lives in [AI, Brain & Automations](/docs/ai-brain-automations)."
      },
      {
        "type": "h2",
        "text": "Work hierarchy"
      },
      {
        "type": "p",
        "text": "Work lives in projects and is tracked as work items, with planning layers above and around them. This is where the day-to-day actually happens."
      },
      {
        "type": "h3",
        "text": "Project"
      },
      {
        "type": "p",
        "text": "A **project** is a container for related work inside an org: a product area, a workstream, an initiative made concrete. Each project has a short **key** (up to six characters, like `WEB` or `API`) that prefixes every work item in it, an optional lead, an optional target date, a set of feature toggles, and a configurable estimate scale. A project can be private or public, and its key is unique within the org."
      },
      {
        "type": "h3",
        "text": "Work item"
      },
      {
        "type": "p",
        "text": "A **work item** (task) is the unit of work. Every item gets a stable id of the form `KEY-number` (for example `WEB-142`), numbered per project, so a meeting summary or a chat message can point straight back at it. A work item has a **kind**, one of task, bug, story, or epic, plus a title, description, priority, and an assignee. The assignee can be a person or, through the bot-assignee field, an agent."
      },
      {
        "type": "h3",
        "text": "Statuses and immutable categories"
      },
      {
        "type": "p",
        "text": "A work item moves through **statuses** like Backlog, Todo, In Progress, In Review, Done, and Cancelled. Statuses are renameable and recolorable, but each one is permanently bound to one of five **immutable categories**: backlog, unstarted, started, completed, or cancelled. The categories are fixed in code and never editable. That is deliberate, they are the stable spine that progress math, ordering, and AI summaries read no matter how a team renames its statuses."
      },
      {
        "type": "h3",
        "text": "Sub-tasks"
      },
      {
        "type": "p",
        "text": "Any work item can have **sub-tasks**, child items nested under a parent. This is how an epic breaks into stories, or a story into the tasks that deliver it. The nesting respects each type's level, so you cannot file a higher-level item under a lower-level one, though same-level nesting (a task under a task) stays allowed."
      },
      {
        "type": "h3",
        "text": "The planning layers"
      },
      {
        "type": "p",
        "text": "Around and above the board sit the layers that organize work over time and across projects. A work item can be attached to any of them:"
      },
      {
        "type": "table",
        "headers": [
          "Layer",
          "Scope",
          "What it is"
        ],
        "rows": [
          [
            "Cycle",
            "Project",
            "A time-boxed iteration (a sprint), with a start and end date, that work items are pulled into for a fixed window."
          ],
          [
            "Milestone",
            "Project",
            "A date-anchored delivery checkpoint that work items are linked to and counted toward."
          ],
          [
            "Module",
            "Project",
            "A feature or workstream grouping that gathers related work items under a named area, with its own lead and dates."
          ],
          [
            "Initiative",
            "Organization",
            "A cross-project strategic grouping that sits above projects and rolls several of them up under one goal."
          ],
          [
            "Release",
            "Organization",
            "A versioned deliverable that work items are tagged into, carrying a version and a changelog of what shipped."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Cycles, milestones, and modules organize work inside one project. Initiatives and releases operate at the org level, spanning projects. The full mechanics live in [Projects & Tasks](/docs/projects-and-tasks)."
      },
      {
        "type": "h2",
        "text": "Customizing work"
      },
      {
        "type": "p",
        "text": "The defaults work out of the box, but every team shapes its work differently. Four building blocks let you adapt the system without leaving it:"
      },
      {
        "type": "ul",
        "items": [
          "**Labels.** Org-scoped tags with a display color that you attach to work items to slice and filter them. A label name is unique within the org.",
          "**Custom properties.** Project-scoped custom fields on work items, typed as text, number, date, select, checkbox, or URL, for the attributes your team tracks that the built-in fields do not cover.",
          "**Saved views.** A named, reusable slice of the board, its filters, grouping, ordering, and display, saved once and reused. A view can be personal to you or shared with the whole org.",
          "**Workflow statuses and transitions.** Rename, recolor, reorder, and add statuses within their fixed categories, and define which transitions between them are allowed, so the board matches how your team actually works while the categories underneath stay stable."
        ]
      },
      {
        "type": "h2",
        "text": "Knowledge surfaces"
      },
      {
        "type": "p",
        "text": "Tasks are only part of the picture. The surfaces below hold the context around the work, and because everything is connected, that context stays attached to the items it belongs to."
      },
      {
        "type": "table",
        "headers": [
          "Surface",
          "What it holds"
        ],
        "rows": [
          [
            "Notes & wiki",
            "Markdown pages for specs, decisions, research, and meeting prep. Pages nest into a tree and can be tied to a project."
          ],
          [
            "Meetings",
            "Recorded conversations that become a speaker-attributed transcript plus an AI-generated summary you can ask questions of."
          ],
          [
            "Activity feed",
            "One live, org-wide timeline of every meaningful change, who did what and when, across tasks, notes, and meetings."
          ],
          [
            "Calendar",
            "A time-based grid view of the organization, where dated work and meetings show up where you expect them."
          ],
          [
            "Inbox",
            "Your personal stream of notifications, mentions, assignments, and updates that need your attention."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Notes, the activity feed, the calendar, and the inbox are covered in [Notes, Activity & Calendar](/docs/notes-activity-calendar-inbox), and meetings have their own guide in [Meetings](/docs/meetings)."
      },
      {
        "type": "h2",
        "text": "The AI brain"
      },
      {
        "type": "p",
        "text": "The AI layer reads across every surface above, projects, tasks, transcripts, notes, and activity, so one question can be answered from all of it at once. Three pieces make it work, and they share a single rule: everything runs on your organization's own key."
      },
      {
        "type": "h3",
        "text": "BYOK keys"
      },
      {
        "type": "p",
        "text": "**BYOK** (bring your own key) is the foundation. An admin or owner stores an OpenAI or Anthropic key once at the org level. It is encrypted at rest and only ever shown masked, just the last four characters. Every AI feature in the org, summaries, answers, agents, runs on that key, so the cost lands on your provider bill and your data stays under your control. You can mark one key as the default per provider and rotate keys by adding a new one and deleting the old."
      },
      {
        "type": "h3",
        "text": "The company brain"
      },
      {
        "type": "p",
        "text": "The **company brain** is a set of cross-project tools that answer the questions you actually have when you sit down. **Catch me up** returns everything that changed in the org since a moment you choose. **Resume** points at a project and reconstructs where you left off, the in-flight tasks, recent notes, and recent activity. **Open threads** pulls together your assigned tasks, the tasks you created, and your triage queue, with the closed ones filtered out, into one honest snapshot of your plate."
      },
      {
        "type": "h3",
        "text": "The company-brain MCP server"
      },
      {
        "type": "p",
        "text": "The built-in **MCP server** is what exposes all of this to agents and external AI clients. It is a single endpoint that presents the workspace, tasks, projects, notes, meetings, activity, the brain, and more, as tools an AI can call. A connected client authenticates with a scoped token, and every call runs with a member's permissions inside one org. This is the doorway your first-class agents come through, and the technical details are in [Company-Brain MCP](/docs/company-brain-mcp)."
      },
      {
        "type": "h2",
        "text": "Glossary"
      },
      {
        "type": "p",
        "text": "Every concept on this page, and the guide that documents it in full:"
      },
      {
        "type": "table",
        "headers": [
          "Concept",
          "In one line",
          "Documented in"
        ],
        "rows": [
          [
            "Account",
            "Your global, personal login across all orgs.",
            "[Overview](/docs)"
          ],
          [
            "Organization",
            "A fully isolated workspace for one company.",
            "[Organizations & Members](/docs/organizations-teams-members)"
          ],
          [
            "Roles",
            "Owner, admin, member, guest, in strict order.",
            "[Organizations & Members](/docs/organizations-teams-members)"
          ],
          [
            "Team (teamspace)",
            "A group of members that owns projects.",
            "[Organizations & Members](/docs/organizations-teams-members)"
          ],
          [
            "Project",
            "A keyed container of work items.",
            "[Projects & Tasks](/docs/projects-and-tasks)"
          ],
          [
            "Work item",
            "A KEY-number task, bug, story, or epic.",
            "[Projects & Tasks](/docs/projects-and-tasks)"
          ],
          [
            "Statuses & categories",
            "Renameable statuses over immutable categories.",
            "[Projects & Tasks](/docs/projects-and-tasks)"
          ],
          [
            "Cycles, milestones, modules",
            "Project-level planning layers.",
            "[Projects & Tasks](/docs/projects-and-tasks)"
          ],
          [
            "Initiatives & releases",
            "Org-level grouping and versioned deliverables.",
            "[Projects & Tasks](/docs/projects-and-tasks)"
          ],
          [
            "Labels, properties, views, workflow",
            "The ways you customize work.",
            "[Projects & Tasks](/docs/projects-and-tasks)"
          ],
          [
            "Notes & wiki",
            "Markdown pages for the thinking around work.",
            "[Notes, Activity & Calendar](/docs/notes-activity-calendar-inbox)"
          ],
          [
            "Meetings",
            "Transcripts plus AI summaries you can ask.",
            "[Meetings](/docs/meetings)"
          ],
          [
            "Activity, calendar, inbox",
            "The timeline, the grid, and your personal stream.",
            "[Notes, Activity & Calendar](/docs/notes-activity-calendar-inbox)"
          ],
          [
            "Agents (AI users)",
            "First-class AI members on the org's key.",
            "[AI, Brain & Automations](/docs/ai-brain-automations)"
          ],
          [
            "BYOK & the company brain",
            "Your key, plus catch-up, resume, open threads.",
            "[AI, Brain & Automations](/docs/ai-brain-automations)"
          ],
          [
            "Company-brain MCP",
            "The server that exposes it all to agents.",
            "[Company-Brain MCP](/docs/company-brain-mcp)"
          ]
        ]
      }
    ]
  },
  {
    "title": "Projects & tasks",
    "slug": "projects-and-tasks",
    "description": "How projects contain and shape work, and how work items move through Elliptic: permanent keys, statuses and immutable categories, kinds and conversion, relations, the board and list and calendar, Your Work, and the agent-native surfaces behind all of it.",
    "blocks": [
      {
        "type": "h2",
        "text": "Projects and tasks: the core of Elliptic"
      },
      {
        "type": "p",
        "text": "Projects are how you group a stream of work, and work items (tasks) are the individual pieces of it. Together they are the spine that everything else in Elliptic hangs off: meetings turn into tasks, notes spin off tasks, the activity log records every status change, and your inbox is driven by tasks you are assigned to or watching. If you have used Linear, the model will feel familiar. Every work item gets a short, human identifier like `WEB-42`, moves through a small set of statuses, and lives on a board you can drag work across."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Where this lives",
        "text": "Projects live at **elliptic.sh → Projects**. Each project opens to its own workspace with tabs for Overview, Updates, Board, Tasks, Epics, Calendar, Register, Insights, Members, and Settings, plus (when their feature toggle is on) Timeline, Cycles, Milestones, Modules, Meetings, and Notes. **Your Work** in the sidebar collects the tasks assigned to and created by you across every project."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Everything here is agent-native",
        "text": "Every action on this page is also an MCP tool. An AI agent that is a member of your org operates the same surfaces a person does, on the org's own model key (BYOK), with the same permissions. `create_project`, `create_task`, `transition_task_status`, `add_task_relation`, `subscribe_task`, `get_task_board`, and `list_my_tasks` are the same operations the web app calls. So \"Jira for your agents\" is literal: an agent can pick up a task, move it, relate it, and close the loop without a human in the middle."
      },
      {
        "type": "h2",
        "text": "Projects as containers"
      },
      {
        "type": "p",
        "text": "A project is a named container for related work, scoped to your organization. It holds tasks, meetings, and notes, plus a living brief (the Overview) where you write the vision and pin links. Each project has a permanent **key**, an optional **icon**, a **lead**, a **default assignee**, a **target date**, an **estimate scale**, a set of project **labels**, and the **members** who can see and work in it. A project can also belong to a team."
      },
      {
        "type": "h3",
        "text": "The project key"
      },
      {
        "type": "p",
        "text": "The key is the most important decision you make when creating a project, because it becomes permanent shorthand for every task inside it. A project keyed `WEB` produces tasks `WEB-1`, `WEB-2`, `WEB-3`, and so on. The key must be **2 to 6 uppercase letters** (`WEB`, `OPS`, `GROWTH`) and must be **unique within your organization**, so two projects cannot share a key. Pick something short and obvious. It is what people will type and say out loud."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Choose the key carefully",
        "text": "The key is set at creation and is not editable afterward through the app. The name, description, icon, lead, default assignee, target date, team, and status can all be changed later, but task identifiers are built from the key, so changing it would rewrite every identifier. Get it right the first time."
      },
      {
        "type": "h3",
        "text": "Creating a project"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Projects and click New project",
            "text": "From the Projects page, click **New project**. If you have no projects yet, the empty state offers the same button."
          },
          {
            "title": "Enter a name",
            "text": "Type a clear name like \"Website redesign\". The name must be 1 to 255 characters."
          },
          {
            "title": "Set the key",
            "text": "Enter 2 to 6 uppercase letters, for example WEB. If a project in your org already uses that key, creation is rejected and you will need a different one."
          },
          {
            "title": "Add a description (optional)",
            "text": "Describe what the project is about. You can flesh this out later in the Overview brief with rich formatting, mentions, and links."
          },
          {
            "title": "Create",
            "text": "Click Create project. You become its first member with the **admin** project role automatically, and you land in its workspace ready to add tasks."
          }
        ]
      },
      {
        "type": "p",
        "text": "When you create a project, the org also records a \"project created\" entry in the activity log, so the team can see it appear."
      },
      {
        "type": "h3",
        "text": "Fields you set on a project"
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "Editable later",
          "Notes"
        ],
        "rows": [
          [
            "Name",
            "Yes",
            "1 to 255 characters."
          ],
          [
            "Key",
            "No",
            "2 to 6 uppercase letters, unique per org. Fixed at creation."
          ],
          [
            "Icon",
            "Yes",
            "A short icon string shown next to the project."
          ],
          [
            "Description / brief",
            "Yes",
            "Edited as rich text in the Overview tab, autosaved."
          ],
          [
            "Lead",
            "Yes",
            "Optional person who owns the project."
          ],
          [
            "Default assignee",
            "Yes",
            "Optional person new tasks are assigned to when you do not pick someone. Without one, a new task falls to whoever created it."
          ],
          [
            "Target date",
            "Yes",
            "Optional ship date."
          ],
          [
            "Team",
            "Yes",
            "Optional owning team."
          ],
          [
            "Estimate scale",
            "Yes",
            "An ordered list of allowed estimate values (story points, t-shirt sizes, or your own)."
          ],
          [
            "Labels",
            "Yes",
            "Project-level label values, alongside the org-wide labels."
          ],
          [
            "Status",
            "Yes",
            "Active or Archived. Archiving freezes task editing."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Per-feature tab toggles"
      },
      {
        "type": "p",
        "text": "Not every project needs every surface. A project's **features** are a set of per-tab toggles you flip in Settings, and each one shows or hides a tab. **Timeline**, **Cycles**, **Milestones**, **Modules**, **Meetings**, and **Notes** are all toggleable. They are on by default. Turn off the ones a given project does not use to keep its workspace focused. The core tabs (Overview, Updates, Board, Tasks, Epics, Calendar, Register, Insights, Members, Settings) are always present."
      },
      {
        "type": "h3",
        "text": "The living brief and linked artifacts"
      },
      {
        "type": "p",
        "text": "The Overview tab is a living brief, not a static description. It is a rich-text editor where you write the project's vision and context. It autosaves as you edit. Alongside it, a **Linked artifacts** list holds external URLs, each with a label, so the Figma file, the spec doc, the PR, and the dashboard all sit one click away from the work."
      },
      {
        "type": "h2",
        "text": "Project lifecycle"
      },
      {
        "type": "p",
        "text": "A project's status is **Active** or **Archived**. Archiving keeps the project and its full history intact but takes it out of active flow. Archived projects show an \"Archived\" badge, and you cannot create or change tasks inside an archived project until you set it active again."
      },
      {
        "type": "h3",
        "text": "Deleting and restoring"
      },
      {
        "type": "p",
        "text": "Deleting a project is an **admin** action and is a **soft delete**. The project disappears from the active list but is recoverable for **30 days**. Within that window an admin can open the deleted-projects list and restore one back to active. After 30 days it falls out of the recovery window and can no longer be restored."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Archive vs delete",
        "text": "Archive when work is done but you want to keep the project visible and its history browsable. Delete only when you want it gone, and remember you have a 30-day grace period to undo it."
      },
      {
        "type": "h3",
        "text": "Auto-archive and auto-close"
      },
      {
        "type": "p",
        "text": "A project can be set to manage its own end-of-life. **Auto-archive** archives the project after a chosen number of idle days. **Auto-close** transitions stale open work items to a chosen status after a chosen number of days. Both are optional timers configured per project (1 to 3650 days), and either can be cleared back off. They keep finished work from lingering without anyone tending it."
      },
      {
        "type": "h3",
        "text": "Portfolio project states"
      },
      {
        "type": "p",
        "text": "Active and Archived are the operational status. On top of that, an org can define its own **portfolio states**, the customizable lifecycle labels a project sits in (for example \"Discovery\", \"In build\", \"Shipped\"). Each org state rolls up into one of six fixed groups: **Draft**, **Planning**, **Execution**, **Monitoring**, **Completed**, and **Cancelled**. Admins create, recolor, reorder, and delete states. On the Projects page you can **group by state** to see the whole portfolio organized by where each project is in its lifecycle, with the fixed groups giving a stable spine regardless of how you name your states."
      },
      {
        "type": "h2",
        "text": "Project visibility and membership"
      },
      {
        "type": "p",
        "text": "A project is either **private** or **public**. A private project is visible only to its members. A public project is discoverable by anyone in the org and can be joined without an invitation."
      },
      {
        "type": "h3",
        "text": "Browse and join"
      },
      {
        "type": "p",
        "text": "The **Browse** page is the directory of public, active projects. Each row shows the project, its lead, and its **member count**, and lets you **join** in one click. Joining adds you as a member straight away. This is how someone finds the project they should be contributing to without waiting for an admin to add them. (A guest who joins lands as a commenter rather than a full member.)"
      },
      {
        "type": "h3",
        "text": "Project members and project roles"
      },
      {
        "type": "p",
        "text": "Members are the people who can work in a project. Assignees must be members, so you cannot assign a task to someone who is not on the project. On top of the org-wide role, every project member also carries a **project role**, a second axis that controls what they can do inside that one project:"
      },
      {
        "type": "table",
        "headers": [
          "Project role",
          "What it grants in the project"
        ],
        "rows": [
          [
            "Admin",
            "Full control: manage members, settings, and all work items."
          ],
          [
            "Member",
            "Create and edit work items and contribute fully."
          ],
          [
            "Commenter",
            "Comment and participate, but not change the work items."
          ],
          [
            "Viewer",
            "Read-only access to the project."
          ]
        ]
      },
      {
        "type": "p",
        "text": "A few rules keep projects sane: a person must already belong to your org before you can add them to a project, you cannot remove yourself, and a project must always keep at least one member, so the last member cannot be removed. Org **guests** are capped at the lower two project roles (viewer or commenter), so an outside collaborator can never be made a project admin. When you are added to a project, you get a notification."
      },
      {
        "type": "h3",
        "text": "Subscriptions"
      },
      {
        "type": "p",
        "text": "Independently of membership, you can **subscribe** to a project to opt into its notification stream. Subscribing and unsubscribing is a personal toggle and does not affect your access or anyone else's. Membership is about who can work in the project. Subscription is about what lands in your inbox."
      },
      {
        "type": "h2",
        "text": "Project updates and templates"
      },
      {
        "type": "h3",
        "text": "State of Project updates (RAG)"
      },
      {
        "type": "p",
        "text": "On the Updates tab you post a **State of Project** update: a short written summary paired with a **RAG health** signal, **On track**, **At risk**, or **Off track**. Updates are stamped with who posted them and when, and they stack into a running history so anyone can scroll the project's health over time. This is the lightweight status report that replaces the weekly \"how's it going\" thread."
      },
      {
        "type": "h3",
        "text": "Project templates"
      },
      {
        "type": "p",
        "text": "When you have a project shape you repeat (a launch, a client onboarding, a sprint scaffold), save it as a **project template**. The template captures a snapshot of the project's config, its visibility, feature toggles, estimate scale, and labels, plus its current top-level work items as **seed items** (each seed remembers its title, status, priority, and kind). Instantiating the template creates a brand-new project from that snapshot: you give it a name and a fresh key, and it arrives pre-populated with the seed work items, ready to run."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Shape one project the way you like it",
            "text": "Set the features, estimate scale, labels, and a starter set of work items on a project that represents your repeatable process."
          },
          {
            "title": "Save it as a template",
            "text": "Save the project as a template with a name and optional description. The config and seed items are snapshotted at that moment."
          },
          {
            "title": "Instantiate when you need it",
            "text": "Create a new project from the template, supplying a new name and a new 2-to-6-letter key. The seed work items are created in the new project automatically."
          }
        ]
      },
      {
        "type": "h2",
        "text": "Work items: the anatomy"
      },
      {
        "type": "p",
        "text": "Every work item gets a stable identifier of the form `KEY-number`, for example `WEB-42`. The number is assigned **per project** and counts up from 1: the first task in `WEB` is `WEB-1`, the next is `WEB-2`. Numbering is allocated under a per-project row lock, so even if several people (or agents) create tasks at the same moment, no two ever collide on a number. The identifier is what you reference in conversation, search, and links."
      },
      {
        "type": "h3",
        "text": "Title and description"
      },
      {
        "type": "p",
        "text": "A work item has a **title** (1 to 500 characters, required) and an optional rich **description** where the real context lives: the problem, the links, the plan. The description supports the same block editing as notes and the project brief."
      },
      {
        "type": "h3",
        "text": "Kinds and conversion"
      },
      {
        "type": "p",
        "text": "Every work item has a **kind**: **Task**, **Bug**, **Story**, or **Epic**. A task is the ordinary unit of work. A bug is a defect. A story is a user-facing slice. An epic is a top-level container for a larger body of work. You can **convert** a work item from one kind to another at any time, and conversion is smart about staying valid: promoting to an **epic** detaches it from any parent (epics are top-level), converting to a plain **task** clears bug severity, and converting to a **bug** with no severity yet defaults it to Medium so the item stays valid."
      },
      {
        "type": "h3",
        "text": "Bugs: severity, release-blocker, and SLA"
      },
      {
        "type": "p",
        "text": "A bug must always carry a **severity**: **Low**, **Medium**, **High**, or **Critical**. You cannot save a bug without one, and converting a bug to a plain task clears it. Severity does real work. If a bug has no explicit due date, Elliptic derives one automatically as an SLA from the severity:"
      },
      {
        "type": "table",
        "headers": [
          "Severity",
          "SLA due date",
          "Use it for"
        ],
        "rows": [
          [
            "Critical",
            "1 day",
            "Production is down or data is at risk."
          ],
          [
            "High",
            "3 days",
            "A serious defect with real user impact."
          ],
          [
            "Medium",
            "7 days",
            "A bug that needs fixing but has a workaround."
          ],
          [
            "Low",
            "30 days",
            "A minor or cosmetic issue."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Any work item can also be flagged a **release blocker**, an explicit marker that it must be resolved before the next release ships. Together these support a zero-bug practice where every bug carries an explicit severity, a deadline, and a clear answer to \"does this hold the release?\""
      },
      {
        "type": "h3",
        "text": "Type hierarchy levels"
      },
      {
        "type": "p",
        "text": "Kinds also carry an org-scoped **hierarchy level** that governs nesting. By default an Epic is level 3, a Story is level 2, and a Task and a Bug are level 1. The rule is that a child may not nest under a parent of a strictly lower level, so you cannot file an epic under a task, but same-level nesting (a task under a task) stays allowed. Admins can adjust the levels per kind to match how their org thinks about its work breakdown."
      },
      {
        "type": "h2",
        "text": "Core fields"
      },
      {
        "type": "h3",
        "text": "Statuses and immutable categories"
      },
      {
        "type": "p",
        "text": "A work item moves through a fixed set of statuses. Six appear as columns on the board, in this order:"
      },
      {
        "type": "table",
        "headers": [
          "Status",
          "What it means",
          "Category"
        ],
        "rows": [
          [
            "Backlog",
            "Captured but not committed to.",
            "Backlog"
          ],
          [
            "Todo",
            "Committed, not started.",
            "Unstarted"
          ],
          [
            "In Progress",
            "Actively being worked on.",
            "Started"
          ],
          [
            "In Review",
            "Work done, awaiting review.",
            "Started"
          ],
          [
            "Done",
            "Completed.",
            "Completed"
          ],
          [
            "Cancelled",
            "Dropped, will not be done.",
            "Cancelled"
          ]
        ]
      },
      {
        "type": "p",
        "text": "There is also a **Duplicate** status, used when a work item is folded into another. It is treated like Cancelled for progress and is not shown as its own board column. Each status maps to an immutable **category**, Backlog, Unstarted, Started, Completed, or Cancelled. Categories are fixed in code and never editable. They are the stable spine that progress math, focus ordering, and AI summaries read, so the system understands \"this is started work\" no matter how a team renames its statuses."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "How progress is calculated",
        "text": "A project's progress bar and a parent task's sub-task pill both use category math. Cancelled and Duplicate items are **excluded from the total entirely** (they do not drag your percentage down), and only Completed counts toward done. So progress reflects real, in-flight work, not abandoned work."
      },
      {
        "type": "h3",
        "text": "Priorities"
      },
      {
        "type": "p",
        "text": "Priority orders attention. The levels, highest to lowest, are **Urgent**, **High**, **Medium**, **Low**, and **No priority** (the default). Priority drives the ordering in Your Work and in priority swimlanes on the board. Marking a task **Urgent** when it has an assignee (and was not already urgent) sends that person an urgent notification, so it is a real signal, not just a color."
      },
      {
        "type": "h3",
        "text": "Assignees and bot assignees"
      },
      {
        "type": "p",
        "text": "A work item can have a human **assignee** and, independently, a **bot assignee**, an AI user in the org. The human assignee must be a project member, and assigning someone other than yourself notifies them and auto-subscribes them so they follow the task. The bot assignee is how you hand work to an agent: it must be an AI user that exists in the org, and the agent then operates the task over MCP on the org's key. The two are cleared independently, so a task can be owned by a person, by an agent, by both, or by neither. The assignee picker only lists people who are on the project."
      },
      {
        "type": "h3",
        "text": "Labels"
      },
      {
        "type": "p",
        "text": "Labels are org-scoped tags with a name and a color, shared across all projects. You create them once for the organization (each name is unique) and then attach any number to a work item. Labels are useful for cross-cutting themes like \"design\", \"infra\", or \"customer-request\". You can filter by them and delete a label org-wide when it is no longer needed. (Projects can also keep their own project-level label values for slicing within one project.)"
      },
      {
        "type": "h3",
        "text": "Estimates"
      },
      {
        "type": "p",
        "text": "A work item can carry an **estimate** drawn from the project's estimate scale, so a points project estimates in points and a t-shirt project estimates in sizes. The scale is whatever ordered list the project defines, which keeps estimation consistent within a project without forcing one scheme on the whole org."
      },
      {
        "type": "h3",
        "text": "Dates"
      },
      {
        "type": "p",
        "text": "A work item can carry an optional **start date** and **due date**. For bugs, the due date is auto-derived from severity as an SLA when you do not set one (see above)."
      },
      {
        "type": "h3",
        "text": "Components"
      },
      {
        "type": "p",
        "text": "A work item can be tagged with a **component**, a short free-text label for the part of the system it touches (for example \"checkout\" or \"auth\"). It is a lightweight way to slice a project by area."
      },
      {
        "type": "h3",
        "text": "Custom fields and properties"
      },
      {
        "type": "p",
        "text": "Beyond the built-in fields, a project can define **custom properties** that attach extra structured data to its work items, stored per item. This lets a team capture the fields specific to their process (a customer name, a risk score, an environment) without bending the standard fields out of shape."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Schema discovery for agents",
        "text": "Each project exposes a **work-item schema** endpoint that returns exactly what a work item there supports: the available kinds, priorities, statuses (each with its immutable category), labels, and custom properties. An AI agent calls it first to learn the field space before creating or updating an item, so it always writes valid values rather than guessing. It is the agent-native equivalent of reading the form before filling it in."
      },
      {
        "type": "h2",
        "text": "Structure and relationships"
      },
      {
        "type": "h3",
        "text": "Sub-tasks and the progress pill"
      },
      {
        "type": "p",
        "text": "A work item can have **sub-tasks**, managed from its detail panel. Sub-tasks live in the **same project** as their parent and are limited to **one level**, so a sub-task cannot itself have sub-tasks. Nesting also respects the type-level rule, so you cannot file a higher-level kind under a lower-level one. The parent shows a **progress pill** (for example 2/5) computed from its sub-tasks with category math, so cancelled and duplicate sub-tasks do not count against it."
      },
      {
        "type": "h3",
        "text": "Typed relations"
      },
      {
        "type": "p",
        "text": "From a work item's detail you can link it to another with a typed relation: **blocks** / **blocked by**, **related**, **duplicate** / **duplicate of**, or **implements** / **implemented by**. Only canonical directions are stored. \"Related\" is symmetric, and the inverse forms (blocked by, duplicate of, implemented by) are derived by reading the stored relation from the other task's point of view, so each side always shows the right label. You can relate to many targets at once in bulk, and the relations panel groups them by type. An org can also define its own **custom relation types**, each with an outward and inward label, for relationships the built-in set does not cover."
      },
      {
        "type": "h3",
        "text": "The Blocked badge"
      },
      {
        "type": "p",
        "text": "A work item that is blocked by an open (not Done or Cancelled) item shows a **Blocked** badge on its card, so you can see at a glance what is stuck and why. The badge clears automatically once the blocker is resolved."
      },
      {
        "type": "h3",
        "text": "Duplicate detection and not-duplicate suppression"
      },
      {
        "type": "p",
        "text": "When you create or look at a work item, Elliptic can surface likely **duplicate candidates** in the same project by token overlap against other open items, each with a similarity score, so you catch a re-filed issue before it becomes a second copy. If a suggestion is wrong, mark the pair **not a duplicate** and that pairing is suppressed from future suggestions, so the same false match does not keep resurfacing. When something genuinely is a duplicate, fold it into the original and its status becomes Duplicate."
      },
      {
        "type": "h2",
        "text": "Quality gates on the item"
      },
      {
        "type": "h3",
        "text": "Definition of Done and acceptance criteria"
      },
      {
        "type": "p",
        "text": "A work item can carry a **Definition of Done**, a checklist of conditions that must be true before it counts as finished, and a free-text **acceptance criteria** field describing what \"correct\" looks like. Together they make \"done\" explicit on the item itself, so reviewers and agents are checking against the same bar the author intended."
      },
      {
        "type": "h3",
        "text": "Description version history"
      },
      {
        "type": "p",
        "text": "Every change to a work item's description snapshots the previous text into a **version history**, attributed to whoever made the edit. You can review the prior versions and **restore** one non-destructively (the restore itself becomes a new version), so a description can never be silently overwritten and lost."
      },
      {
        "type": "h3",
        "text": "Per-item progress updates"
      },
      {
        "type": "p",
        "text": "Just like a project, an individual work item can carry its own **progress updates**, a short summary plus a RAG health (On track / At risk / Off track). Use them on long-running epics or stories to keep a running narrative of where the item stands without burying it in comments."
      },
      {
        "type": "h3",
        "text": "External links and note links"
      },
      {
        "type": "p",
        "text": "A work item can hold **external links**, labeled URLs (a PR, a dashboard, a design), and structured **note links** that tie it to notes or pages in the workspace. Note links are bidirectional, so the connection shows from both the task and the note. Both keep the surrounding context one click from the work."
      },
      {
        "type": "h2",
        "text": "Creating work in bulk and at speed"
      },
      {
        "type": "p",
        "text": "There are several ways to add work, from fastest to most detailed."
      },
      {
        "type": "h3",
        "text": "Inline composer (fastest)"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open a project's Board tab",
            "text": "Each status column has an Add task affordance at the bottom, and a + button in the column header that opens the same inline composer."
          },
          {
            "title": "Type a title and press Enter",
            "text": "The task is created instantly in that column's status. The composer stays focused so you can keep adding one after another."
          },
          {
            "title": "Pick a kind if needed",
            "text": "A small Task / Bug / Story / Epic toggle lets you set the kind for the row (a Bug defaults its severity to Medium). For more fields, open the full dialog with the Add details button, which carries nothing over but lets you set everything."
          }
        ]
      },
      {
        "type": "h3",
        "text": "The full dialog"
      },
      {
        "type": "p",
        "text": "Press the `c` shortcut anywhere on a project's Board or Tasks tab (any text you have selected is carried into the title), or use the board's Add details button or the Tasks tab's New task button. Here you set the **title** (required), a **description**, the **kind** (with **severity** when it is a bug), and the starting **status**, **priority**, and **assignee**, along with labels, dates, component, and estimate. The assignee is pre-filled with you, so work you create is yours until you hand it over; change it in the dialog or reassign the item at any time afterwards. The assignee list is limited to project members. The dialog can surface duplicate candidates as you type the title."
      },
      {
        "type": "h3",
        "text": "From meetings and notes, with provenance"
      },
      {
        "type": "p",
        "text": "Tasks can be created with **provenance**, a link back to the meeting or note they came from. You can batch-create several at once from a list of text lines (for example, action items extracted from a meeting), all sharing the same source. When a meeting-derived task is later marked **Done**, Elliptic records that back on the meeting and notifies the attendees, closing the loop."
      },
      {
        "type": "h3",
        "text": "",
        "items": []
      },
      {
        "type": "p",
        "text": "Beyond meeting batches, you can paste a **CSV** to bulk-create work items in one click, a one-shot migration path from a spreadsheet or another tracker. The importer reads common column names (title, summary, status, priority, description, and their synonyms), maps foreign status and priority words onto Elliptic values, treats a type of \"bug\" or \"defect\" as a Bug (defaulting its severity to Medium), and reports how many items it created, how many it skipped, and any per-row errors."
      },
      {
        "type": "h3",
        "text": "Work-item templates"
      },
      {
        "type": "p",
        "text": "For recurring shapes of work (a release checklist item, a standard bug report), a project can keep **work-item templates** that pre-fill the title, description, priority, and kind. Picking a template scaffolds a new item from it so you are not retyping the same boilerplate."
      },
      {
        "type": "h3",
        "text": "The /new quick-create deep link"
      },
      {
        "type": "p",
        "text": "`/app/<org>/new` is a deep link that opens the create dialog directly, pre-filled from query parameters. It accepts `project` (id or key), `title`, `description`, `priority`, and `assignee` (use `me` for yourself). It is the link you wire into a button, a bookmark, or an automation to drop someone straight into creating a task with the fields already set."
      },
      {
        "type": "h3",
        "text": "Git branch suggestion"
      },
      {
        "type": "p",
        "text": "Each work item can suggest a **git branch name** built from the project key, the task number, and the title, so the branch you cut matches the identifier you track. It keeps the code and the task linked by name without anyone inventing a convention."
      },
      {
        "type": "h2",
        "text": "Viewing work"
      },
      {
        "type": "h3",
        "text": "The board (Kanban)"
      },
      {
        "type": "p",
        "text": "The Board tab lays work items out as Kanban columns, one per status, in workflow order (Duplicate is excluded). A **progress bar** at the top shows the project's completion percentage and completed/total count. Across the top you get a **filter** box (matches title or identifier), status and assignee filters, a **Group by** control, and display options. Drag a card across columns to change its status."
      },
      {
        "type": "h3",
        "text": "",
        "items": []
      },
      {
        "type": "p",
        "text": "You can group the board into **swimlanes** by **Assignee** or **Priority** (or None for a flat board). With swimlanes on, each person or priority gets its own row of columns, with counts, and you can collapse and expand lanes (press `t` to collapse or expand all). Dragging a card between an assignee or priority lane reassigns or repriorities it as well as moving its status."
      },
      {
        "type": "h3",
        "text": "List / table view"
      },
      {
        "type": "p",
        "text": "The Tasks tab is a dense table of the same items, with columns for Task, Status, Priority, Assignee, Labels, Due, Progress, and Updated (each toggleable via display options). A **density** toggle switches between comfortable and compact rows. The same filters apply, and a counter shows the filtered count. **Double-click a row** to open the item; click and Shift/Cmd-click to select rows for bulk actions. Press `Cmd/Ctrl+B` to flip between the board and the list."
      },
      {
        "type": "h3",
        "text": "Calendar"
      },
      {
        "type": "p",
        "text": "The Calendar tab lays work items out on a date grid by their due dates, so deadline pressure is visible at a glance and a crowded week is obvious before it arrives."
      },
      {
        "type": "h3",
        "text": "Filtering"
      },
      {
        "type": "p",
        "text": "Project task lists filter on **status**, **assignee**, **label**, **bug severity**, **release-blocker**, **module**, and **cycle**, plus a free-text **search** over title and description. Combine them to carve out exactly the slice you care about (for example, all release-blocker bugs of High severity assigned to you)."
      },
      {
        "type": "h3",
        "text": "Status transition history and dwell time"
      },
      {
        "type": "p",
        "text": "Every status change is recorded. A work item's **transition history** lists each move with who made it and how long the item sat in the previous status, plus how long it has been in its current one. That **dwell time** turns \"this has been in review forever\" from a feeling into a number, and feeds throughput analytics on the project."
      },
      {
        "type": "h3",
        "text": "Archive and restore"
      },
      {
        "type": "p",
        "text": "You can **archive** a work item to take it out of the active board and list without deleting it, and **restore** it later. Archived items are hidden by default and surfaced with an include-archived toggle. (This is distinct from the Cancelled status, which keeps the item on the board as explicitly dropped.)"
      },
      {
        "type": "h3",
        "text": "Export"
      },
      {
        "type": "p",
        "text": "A project's tasks export to **CSV** or **JSON**, optionally filtered by status. The CSV export is hardened against spreadsheet **formula injection**, so cells that begin with `=`, `+`, `-`, or `@` are neutralized before download and cannot execute when the file is opened."
      },
      {
        "type": "h3",
        "text": "Deleting a work item"
      },
      {
        "type": "p",
        "text": "Deleting a work item removes it permanently (it is recorded in the activity log by identifier). Unlike projects, task deletion is not a recoverable soft-delete, so delete only when you are sure. To drop an item without losing the record, set it to **Cancelled** or **archive** it instead."
      },
      {
        "type": "h2",
        "text": "Your Work"
      },
      {
        "type": "p",
        "text": "Your Work in the sidebar gathers your plate into one place so you do not have to hop between projects. The web page leads with two tabs over your active projects, **Assigned** (everything assigned to you) and **Created by me** (everything you filed). Over MCP, `list_my_tasks` exposes the same plus two more slices: **Subscribed** (everything you are watching) and **Recent** (your latest task activity)."
      },
      {
        "type": "h3",
        "text": "Focus ordering"
      },
      {
        "type": "p",
        "text": "Instead of grouping by raw status, Your Work groups by **focus**, in this order:"
      },
      {
        "type": "ul",
        "items": [
          "**Urgent**, anything you have marked urgent, surfaced first.",
          "**Blocking**, work that is holding up other tasks.",
          "**In progress**, what you are actively working on.",
          "**Up next**, committed but not started.",
          "**Backlog**, captured, not yet committed.",
          "**Done**, completed and cancelled, at the bottom."
        ]
      },
      {
        "type": "p",
        "text": "Within each group, started work floats to the top, then higher priority, then most recently updated. Each row shows the status dot, priority, the `KEY-number` identifier, the title, a context line, the project key badge, and when it was last updated."
      },
      {
        "type": "h3",
        "text": "Workload summary and watching"
      },
      {
        "type": "p",
        "text": "A **workload summary** sits above the list, counting your **Open**, **In progress**, and **Done** items so you can read your load at a glance. **Watching** is the Subscribed slice: subscribe to any task with the bell to follow it without owning it, and it feeds your inbox. Assigning someone auto-subscribes them, so owners follow their work by default."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "A good daily rhythm",
        "text": "Start in Your Work to see your focus-ordered plate, work the Urgent and In progress groups first, then drop into each project's Board to move work across columns and unblock anything showing a Blocked badge. An agent assigned as a bot assignee can run the same loop on its own queue over MCP."
      }
    ]
  },
  {
    "title": "Workflows & transitions",
    "slug": "workflows-statuses-transitions",
    "description": "How statuses, immutable categories, transition guardrails, and conditions shape the way work moves through Elliptic, for your team and your agents alike.",
    "blocks": [
      {
        "type": "h2",
        "text": "What a workflow is in Elliptic"
      },
      {
        "type": "p",
        "text": "Every work item in Elliptic moves through a workflow: a row of statuses you drag it across, like **Backlog**, **Todo**, **In Progress**, **In Review**, **Done**, and **Cancelled**. That part is yours to shape. Underneath those labels sits a smaller, fixed structure, a set of five categories that never change. The statuses are the words your team reads. The categories are the spine the system reads. Keeping the two separate is what lets you rename a column to whatever your team actually calls it without breaking a single chart, progress bar, or AI summary."
      },
      {
        "type": "p",
        "text": "On top of statuses you can layer **transitions** (which moves are allowed), **conditions** (what must be true before a move goes through), and a workspace rule about moving work backward. Together these turn a free-form board into a workflow with guardrails. And because agents operate the very same board over the company-brain MCP, every guardrail you set applies to them exactly as it applies to a person."
      },
      {
        "type": "h2",
        "text": "Statuses and the five immutable categories"
      },
      {
        "type": "p",
        "text": "A work item always has a status. Out of the box Elliptic ships seven: **Backlog**, **Todo**, **In Progress**, **In Review**, **Done**, **Cancelled**, and **Duplicate**. The first six appear as columns on the board. **Duplicate** is a resolution applied from triage rather than a board column, so it never shows up as a lane you drag into."
      },
      {
        "type": "p",
        "text": "Each status maps to exactly one of five **categories**, and that mapping is fixed in code. You can rename a status, recolor it, move it, or add new ones, but you can never move a status into a different category. The category is the stable meaning behind the label."
      },
      {
        "type": "table",
        "headers": [
          "Category",
          "What it means",
          "Default statuses in it"
        ],
        "rows": [
          [
            "Backlog",
            "Captured but not yet committed to.",
            "Backlog"
          ],
          [
            "Unstarted",
            "Committed to, not yet begun.",
            "Todo"
          ],
          [
            "Started",
            "Actively in flight.",
            "In Progress, In Review"
          ],
          [
            "Completed",
            "Finished successfully.",
            "Done"
          ],
          [
            "Cancelled",
            "Closed without completing.",
            "Cancelled, Duplicate"
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Why the categories are locked",
        "text": "Categories are the stable spine that progress math, ordering, and AI summaries all read, regardless of how a team renames its statuses. When Elliptic computes a parent's progress, it counts items in the **Completed** category and excludes the **Cancelled** category, never raw status strings. So whether you call your shipping column **Done**, **Shipped**, or **Closed**, the percentage stays correct and comparable across every team in the org. This is also why two started statuses, **In Progress** and **In Review**, both live in the same **Started** band: to the analytics they are both \"in flight\", even though your team tracks them as distinct steps."
      },
      {
        "type": "p",
        "text": "The categories are also ranked, from **Backlog** through **Unstarted**, **Started**, **Completed**, with **Cancelled** sitting outside that forward line. That ranking is what lets Elliptic tell a forward move from a backward one, which matters for regression handling further down this page."
      },
      {
        "type": "h2",
        "text": "Customizing your statuses"
      },
      {
        "type": "p",
        "text": "The default six-column workflow is a starting point, not a cage. An org admin or owner can reshape it: rename statuses to your team's vocabulary, recolor them, reorder the columns, and add brand-new statuses inside any category. Adding a status is how you split a band into the steps you actually run, for example an **In QA** status inside the **Started** category, sitting between **In Progress** and **In Review**."
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "What you can change"
        ],
        "rows": [
          [
            "Name",
            "Rename the status to whatever your team calls it. Names must be unique within a scope."
          ],
          [
            "Color",
            "Recolor the status so the board reads at a glance."
          ],
          [
            "Position",
            "Reorder where the status sits in its scope."
          ],
          [
            "Category",
            "Fixed. Chosen once when the status is created and never editable afterward."
          ],
          [
            "Allow new items",
            "Whether brand-new work items can be created directly into this status."
          ],
          [
            "Default",
            "Mark one status as the default landing spot for the scope. Setting a new default clears the old one."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Org-level workflow vs per-team overrides"
      },
      {
        "type": "p",
        "text": "Every org gets one default workflow, seeded automatically the first time it is created, with **Backlog** as its default landing status. That org-level workflow applies to every team that has not defined its own. A team can override it by creating its own set of statuses, and from that point its projects follow the team workflow instead of the org default. Until a team adds at least one status of its own, it inherits the org-level workflow untouched."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Renaming is safe, splitting is powerful",
        "text": "Because a project resolves its concrete status by category, you can rename and recolor freely without touching any work item. When you add a status inside a category, existing items keep their current status and new movement flows through the expanded set. The category each item belongs to never shifts under it."
      },
      {
        "type": "h3",
        "text": "Allow new items"
      },
      {
        "type": "p",
        "text": "Each status carries an **allow new items** toggle. When it is on (the default), people and agents can create work directly into that status. When it is off, that status is a transit-only state: items can move into it through a transition, but a brand-new item cannot be born there. Turn it off on statuses like **In Review** or **Done**, where an item should only ever arrive after passing through earlier work, not appear from nothing. Triage intake is exempt, so capturing raw inbound items is never blocked by this rule."
      },
      {
        "type": "h3",
        "text": "Deleting a status"
      },
      {
        "type": "p",
        "text": "You can remove a status you no longer need, but Elliptic will not strand the work sitting in it. If the status is empty, it deletes immediately. If any items are in it, you must name a **transfer-to** status, and every item moves to that target as part of the delete."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Check the count",
            "text": "Elliptic reports how many work items currently sit in the status you want to remove."
          },
          {
            "title": "Pick a transfer-to status",
            "text": "If the count is above zero, choose another status in the same scope to receive those items. You cannot transfer items into the status you are deleting."
          },
          {
            "title": "Confirm",
            "text": "The items move to the transfer-to status, taking on the category of that target, and the old status is removed."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Admin-only by design",
        "text": "Adding, editing, and deleting workflow statuses, and defining transitions and conditions, all require the **admin** role or higher in the org. Members work inside the workflow; admins and owners shape it."
      },
      {
        "type": "h2",
        "text": "Transitions as guardrails"
      },
      {
        "type": "p",
        "text": "A **transition** is a rule that says \"from this status, an item may move to that status\". Defining transitions turns your board from a place where anything can go anywhere into a workflow with a real shape, where work follows the path you intend. A transition rule lives at the org level and always connects two of the org's workflow statuses."
      },
      {
        "type": "p",
        "text": "The behavior follows one simple, forgiving rule:"
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Open until you define otherwise",
        "text": "If no transitions are defined out of a status, every move out of it is allowed. The moment you define even one transition from that status, only the targets you have explicitly listed are permitted, and every other move out of it is blocked. So you only constrain the statuses you choose to constrain, and the rest of the board stays open."
      },
      {
        "type": "p",
        "text": "A transition rule has three parts. The required pair, plus two optional refinements:"
      },
      {
        "type": "ul",
        "items": [
          "**From and to**: the source status and the allowed target status. A transition must always connect two different statuses.",
          "**Work-item kind** (optional): scope the rule to one type of work, **Task**, **Bug**, **Story**, or **Epic**. A typed rule applies only to items of that kind. Leave it blank and the rule applies to every kind.",
          "**Required role** (optional): gate the transition behind a minimum project role, so only people (or agents) at or above that role can make this particular move."
        ]
      },
      {
        "type": "h3",
        "text": "Scoping a transition to a work-item kind"
      },
      {
        "type": "p",
        "text": "Sometimes a move should be legal for one kind of work but not another. Scoping by kind lets you express that. When you add transitions for a specific kind out of a status, those typed rules take precedence for that kind: only the typed targets apply to items of that kind. If you have not added any typed rules for a kind, it falls back to the kind-agnostic rules. This means you can write a tight path for **Bugs** out of a review status while leaving ordinary **Tasks** on the general rules."
      },
      {
        "type": "h3",
        "text": "Gating a transition behind a project role"
      },
      {
        "type": "p",
        "text": "Attach a **required role** to a transition and Elliptic checks the mover's project role before letting it through. Project roles run, from least to most, **Viewer**, **Commenter**, **Member**, **Admin**. Setting a required role of **Admin** on the move into **Done**, for example, means only project admins can mark work complete, while anyone can still progress it through the earlier statuses. If the mover lacks the role, the move is refused."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Build the path incrementally",
        "text": "You do not have to map the whole board at once. Start by locking down the one transition that matters most, say, forcing everything to pass through **In Review** before **Done**, by defining the allowed moves out of **In Review**. Every status you leave alone stays fully open. Add rules only where you want a guardrail."
      },
      {
        "type": "h2",
        "text": "Transition conditions"
      },
      {
        "type": "p",
        "text": "Where a transition decides whether a move is allowed at all, a **condition** decides whether the item is ready for it. Conditions are blocking pre-checks attached to a specific from-status to to-status pair. Before the move goes through, Elliptic evaluates them in order, and if any one fails, the move is blocked and the reason is shown."
      },
      {
        "type": "p",
        "text": "There are four condition types, each a small, declarative check against the item:"
      },
      {
        "type": "table",
        "headers": [
          "Condition",
          "Blocks the move unless",
          "Reason shown when blocked"
        ],
        "rows": [
          [
            "Require assignee",
            "The item has an assignee.",
            "an assignee is required"
          ],
          [
            "Require estimate",
            "The item has an estimate set.",
            "an estimate is required"
          ],
          [
            "Require due date",
            "The item has a due date.",
            "a due date is required"
          ],
          [
            "Require DoD complete",
            "Every Definition-of-Done item on the task is checked.",
            "all Definition-of-Done items must be checked"
          ]
        ]
      },
      {
        "type": "p",
        "text": "When a condition fails, the move is rejected with a message of the form \"Cannot move to this status: <reason>.\" so the person or agent knows exactly what to fix. Conditions are evaluated in order and the first failure stops the move, so the reason you see is the first unmet requirement on that transition. The **Require DoD complete** check is satisfied automatically when an item has no Definition-of-Done items at all, so it only bites when a checklist actually exists and is unfinished."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "A common review gate",
        "text": "Pair a transition with conditions to express a real \"done means done\" rule. Attach **Require assignee** and **Require DoD complete** to the move into your completion status, and an item cannot be marked complete while it is unowned or has unchecked Definition-of-Done items. The board stops being a place where work quietly slips through half-finished."
      },
      {
        "type": "h2",
        "text": "Moving work backward"
      },
      {
        "type": "p",
        "text": "Work does not only move forward. Sometimes an item in review needs to go back to in progress, or a done item reopens. Elliptic treats these **backward** moves as meaningful, not silent. A move counts as backward when the target sits in an earlier category than the current one, for example **In Review** (Started) back to **Todo** (Unstarted). Moves into the **Cancelled** category are never treated as backward, since cancelling is a resolution, not a regression."
      },
      {
        "type": "h3",
        "text": "Automatic regression comments"
      },
      {
        "type": "p",
        "text": "When an item moves backward across categories, Elliptic automatically posts a comment on it recording the regression, noting which status it moved back from and to. Nobody has to remember to explain it. The history of why an item slipped is captured on the item itself, where the next person looking at it will see it."
      },
      {
        "type": "h3",
        "text": "Blocking backward moves entirely"
      },
      {
        "type": "p",
        "text": "If your team would rather never let work regress, the workspace has a single setting, **block backward transitions**, that an admin can turn on at the org level. With it enabled, any move into an earlier category is refused outright with a clear message, and items can only ever progress forward or be cancelled. It is off by default, so backward moves are allowed (and commented) unless you deliberately lock them down."
      },
      {
        "type": "h2",
        "text": "Auditing how work flows"
      },
      {
        "type": "p",
        "text": "Because every status change is recorded as an activity event, each work item carries its own transition history. Elliptic turns that history into a readable timeline with dwell times, so you can see not just where an item is, but how long it lingered at each step along the way."
      },
      {
        "type": "ul",
        "items": [
          "**Transition history**: each status change in order, with the status it moved from, the status it moved to, when it happened, and who made the move.",
          "**Dwell time per step**: for each transition, the number of seconds the item spent in the previous status before moving on.",
          "**Time in current status**: the number of seconds the item has been sitting in its present status, counting up to now."
        ]
      },
      {
        "type": "p",
        "text": "Dwell times are where bottlenecks show themselves. If items routinely spend days in **In Review** before reaching **Done**, the per-step durations make that visible across the team rather than leaving it to anecdote. The first segment is measured from when the item was created, so the timeline accounts for the whole life of the item, not just the moves after the first one."
      },
      {
        "type": "h2",
        "text": "How agents respect this"
      },
      {
        "type": "p",
        "text": "Elliptic is Jira for your agents, and agents are first-class members of the org. An agent moving a work item over the company-brain MCP, with the `transition_task_status` tool, goes through the exact same service path a person does in the web app. There is no separate, looser door for automation."
      },
      {
        "type": "p",
        "text": "That means every guardrail on this page applies identically to agents:"
      },
      {
        "type": "ul",
        "items": [
          "Transition rules are checked, so an agent cannot move an item along a path you have not allowed.",
          "Required-role gates are enforced against the agent's project role, just as they are for a human.",
          "Conditions run first, so an agent trying to close an unassigned item, or one with an unfinished Definition of Done, is blocked with the same reason a person would see.",
          "Backward moves trigger the same automatic regression comment, and are refused if the workspace blocks backward transitions."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "One workflow, every operator",
        "text": "You design the workflow once, statuses, transitions, conditions, and the backward-move rule, and it governs everyone who touches the board: your team, and the agents working alongside them on your organization's own model key. The guardrails are a property of the work, not of who is moving it."
      }
    ]
  },
  {
    "title": "Cycles, milestones, initiatives & releases",
    "slug": "cycles-milestones-initiatives-releases",
    "description": "The planning layer of Elliptic: time-boxed cycles, date-anchored milestones, module workstreams, org-level initiatives, versioned releases with a changelog, and the timeline and insights that tie them together.",
    "blocks": [
      {
        "type": "h2",
        "text": "The planning layer"
      },
      {
        "type": "p",
        "text": "Tasks are the unit of work in Elliptic, but real planning happens above a single task. You run work in time-boxed iterations, you commit to dated checkpoints, you group features into workstreams, you roll several projects up under one strategic bet, and you bundle finished work into versioned releases. This page covers all of those, plus the timeline and insights that show whether the plan is holding. Every surface here is also reachable by your agents over the [company-brain MCP](/docs/company-brain-mcp), so an agent can plan a cycle or tag a release the same way you do, on your organization's own model key."
      },
      {
        "type": "table",
        "headers": [
          "Concept",
          "Scope",
          "What it groups"
        ],
        "rows": [
          [
            "Cycle (sprint)",
            "Project",
            "Work for one time-boxed iteration"
          ],
          [
            "Milestone",
            "Project",
            "Work due by one delivery date"
          ],
          [
            "Module (workstream)",
            "Project",
            "Work belonging to one feature or stream"
          ],
          [
            "Initiative",
            "Organization",
            "Several projects under one strategic goal"
          ],
          [
            "Release",
            "Organization",
            "Work items shipping together in one version"
          ]
        ]
      },
      {
        "type": "h2",
        "text": "Cycles (sprints)"
      },
      {
        "type": "p",
        "text": "A **cycle** is a time-boxed iteration inside a project, what other tools call a sprint. It has a `name`, an optional `start_date` and `end_date`, and a status that moves through three states: **upcoming**, **active**, and **completed**. You assign work items to a cycle, run the cycle, and at the end you see exactly what got done. Cycles live per project, so each project keeps its own cadence."
      },
      {
        "type": "h3",
        "text": "Creating and assigning work"
      },
      {
        "type": "p",
        "text": "Create a cycle with a name and, if you want a fixed box, a start and end date. New cycles begin life as **upcoming**. To put work into a cycle, assign a task to it. A task can be moved into a cycle and back out again while the cycle is still open, so an upcoming cycle is also where you stage the work you intend to commit to next. Once a cycle is completed it locks, and its assignments can no longer change."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Create the cycle",
            "text": "Give it a name like Sprint 24 and, optionally, a start and end date. It starts as upcoming."
          },
          {
            "title": "Assign work",
            "text": "Add tasks to the cycle. Assign and unassign freely while the cycle is still upcoming or active."
          },
          {
            "title": "Start it",
            "text": "Starting a cycle flips it to active and stamps the moment it began."
          },
          {
            "title": "Complete it",
            "text": "Completing a cycle closes it out and freezes its final counts for velocity."
          }
        ]
      },
      {
        "type": "h3",
        "text": "The lifecycle: upcoming, active, completed"
      },
      {
        "type": "p",
        "text": "Starting a cycle moves it from **upcoming** to **active** and records `started_at`. By default a project allows only one active cycle at a time, so you complete the current one before starting the next, unless the project has parallel cycles enabled, which permits overlapping active cycles. Completing a cycle moves it to **completed** and records `completed_at`. Completion also captures the cycle's final scope and finished count as `final_total_count` and `final_completed_count`, a frozen snapshot that does not change afterward even if the underlying tasks move. That frozen pair is what makes velocity trustworthy over time."
      },
      {
        "type": "h3",
        "text": "Rolled-up counts"
      },
      {
        "type": "p",
        "text": "Every cycle reports a live breakdown of the work assigned to it across four buckets:"
      },
      {
        "type": "ul",
        "items": [
          "**Total**: every active work item assigned to the cycle. Cancelled and duplicate items are left out of the total.",
          "**Done**: items in a completed status.",
          "**Started**: items that are in progress.",
          "**Todo**: items not yet started, merging the backlog and unstarted categories."
        ]
      },
      {
        "type": "p",
        "text": "These counts power the per-cycle progress bar and feed the workspace dashboard. The dashboard surfaces your organization's **active** cycles across all projects in one place, each with its own done-out-of-total rollup and the name and key of the project it belongs to, so you can see every sprint in flight without opening each project."
      },
      {
        "type": "h3",
        "text": "Transferring incomplete work"
      },
      {
        "type": "p",
        "text": "When a cycle ends with work unfinished, you do not have to reassign each item by hand. **Transfer** moves every incomplete item from the cycle into a follow-up cycle you choose, in one action, and tells you how many items moved. The natural flow is to create the next cycle, complete the current one, then transfer the leftovers forward so nothing falls through the cracks."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "A clean handoff between sprints",
        "text": "Create next sprint, complete this one to freeze its velocity, then transfer the incomplete items into next sprint. The completed cycle keeps an honest record of what it actually delivered, and the unfinished work starts the next box already assigned. The transfer target has to be an open cycle, since a completed one is locked."
      },
      {
        "type": "h2",
        "text": "Recurring cycles and velocity"
      },
      {
        "type": "h3",
        "text": "Generating a dated series"
      },
      {
        "type": "p",
        "text": "If your team runs on a fixed cadence, you do not need to create each sprint manually. **Generate** auto-creates a whole series of future cycles at once from a small config. You give it a base title, how many cycles to create, how long each one runs, an optional gap between them, the date the first one starts, and the number to start counting from."
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "Meaning",
          "Range"
        ],
        "rows": [
          [
            "`base_title`",
            "The repeated name, numbered per cycle (for example Sprint).",
            "1 to 200 characters"
          ],
          [
            "`count`",
            "How many cycles to generate.",
            "1 to 52"
          ],
          [
            "`duration_weeks`",
            "Length of each cycle in weeks.",
            "1 to 12, default 2"
          ],
          [
            "`cooldown_days`",
            "Gap inserted between consecutive cycles.",
            "0 to 60, default 0"
          ],
          [
            "`start_date`",
            "When the first cycle begins.",
            "a date"
          ],
          [
            "`start_index`",
            "The number the first generated cycle is labeled with.",
            "1 or more, default 1"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Each generated cycle is dated back to back, offset by its duration plus the cooldown, and numbered from the start index, so its name reads like Sprint 1, Sprint 2, and so on. A typical setup is twelve two-week sprints starting next Monday with no cooldown, which lays out roughly half a year of cadence in a single call. Generated cycles arrive as **upcoming**, ready for you to start when their time comes."
      },
      {
        "type": "h3",
        "text": "Velocity"
      },
      {
        "type": "p",
        "text": "A project's **velocity** is the series of frozen completed-and-total counts across its completed cycles, plus a rolling **average velocity** over them. Because each cycle's numbers are frozen at completion, the series is a stable historical record rather than a number that drifts as old tasks get reopened or moved. The velocity view returns one point per completed cycle (its name, when it completed, how many items it finished, and its total scope), the average finished count across those cycles, and the count of cycles included."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Why completion freezes the numbers",
        "text": "Live cycle counts move as tasks change status. Once a cycle is completed, its `final_total_count` and `final_completed_count` are captured and never recomputed. That is what lets average velocity stay an honest baseline for planning the size of the next cycle."
      },
      {
        "type": "h2",
        "text": "Milestones"
      },
      {
        "type": "p",
        "text": "A **milestone** is a date-anchored delivery checkpoint inside a project. Where a cycle is a box of time, a milestone is a commitment to a date: a launch, a demo, a go-live. Each milestone has a `name`, an optional `description`, an optional `target_date`, and a status of either **upcoming** or **completed**. You link the work items that have to land for the milestone to be met, and the milestone tells you how close you are."
      },
      {
        "type": "h3",
        "text": "Linking and bulk-linking items"
      },
      {
        "type": "p",
        "text": "Link a task to a milestone one at a time, or **bulk-link** many at once by passing a list of work items in a single call (1 to 200 items). Bulk linking returns a per-item result, the outcome for each item, so you can see what was linked. You can unlink any item later, and you can list every task currently attached to a milestone to review scope."
      },
      {
        "type": "h3",
        "text": "Done and total rollups"
      },
      {
        "type": "p",
        "text": "Each milestone rolls up a simple **done-out-of-total** count over its linked items: total is everything attached, done is everything in a completed status. That ratio is the at-a-glance read on whether a dated commitment is on course. Milestones split into **upcoming** and **completed**, so the ones still ahead of you stay separate from the ones already shipped."
      },
      {
        "type": "h2",
        "text": "Modules (workstreams)"
      },
      {
        "type": "p",
        "text": "A **module** is a feature grouping or workstream inside a project. Where a cycle answers \"when\" and a milestone answers \"by what date\", a module answers \"what part of the product\". Use modules for streams like Billing, Onboarding, or Mobile that run across many cycles. A module carries a `name`, an optional `description`, an optional **lead**, an optional `start_date` and `target_date`, a status, and an optional link to a milestone."
      },
      {
        "type": "h3",
        "text": "Status"
      },
      {
        "type": "p",
        "text": "A module's status describes the health of the whole stream, independent of any single task:"
      },
      {
        "type": "ul",
        "items": [
          "**Planned**: the workstream is defined but not yet underway.",
          "**In progress**: active work.",
          "**Paused**: temporarily on hold.",
          "**Completed**: the stream has delivered.",
          "**Cancelled**: the stream was dropped."
        ]
      },
      {
        "type": "h3",
        "text": "Counts, archiving, and export"
      },
      {
        "type": "p",
        "text": "Like cycles, modules roll up their linked work across **total**, **done**, **started**, and **todo**, and a project-level summary aggregates across the project's modules. You assign and unassign tasks per module. When a stream is finished or shelved, **archive** it to clear it from the default list without deleting anything, and **restore** it later to bring it back. Listing can optionally include archived modules when you need the full history."
      },
      {
        "type": "p",
        "text": "Each module can be exported to **CSV** for reporting or migration. The export contains one row per linked work item with its number, title, status, priority, kind, and assignee id, and it neutralizes spreadsheet formula injection on text fields so the file is safe to open."
      },
      {
        "type": "code",
        "lang": "text",
        "code": "number,title,status,priority,kind,assignee_id\n42,Wire up billing webhook,in_progress,high,task,\n43,Retry failed charges,todo,medium,task,"
      },
      {
        "type": "h2",
        "text": "Initiatives"
      },
      {
        "type": "p",
        "text": "An **initiative** is an organization-level strategic grouping that sits above projects. Where cycles, milestones, and modules organize work inside one project, an initiative pulls several projects together under one goal, something like Q3 Expansion or Enterprise Readiness. Each initiative has a `name`, an optional `description`, an optional `target_date`, and a status of **active**, **completed**, or **archived**."
      },
      {
        "type": "h3",
        "text": "Linking projects and rolling up progress"
      },
      {
        "type": "p",
        "text": "You link projects to an initiative and unlink them as priorities change. The initiative then rolls up everything underneath it: how many projects it contains, and the combined task progress across them as **total**, **done**, **started**, and **todo**. It also computes a **weighted** view of progress so larger projects count for more than smaller ones, which the interface shows as a percent done \"by effort\" alongside the raw item count. The Initiatives page offers list, board, and timeline views, and the timeline plots each dated initiative by its target date so you can see the portfolio sequenced over time."
      },
      {
        "type": "h3",
        "text": "RAG updates"
      },
      {
        "type": "p",
        "text": "An initiative can carry a running log of **updates**, each a short status post with a **RAG health** and a summary. The health is one of **on track**, **at risk**, or **off track**, the same red-amber-green vocabulary used for project updates. Posting updates over time gives the initiative a narrative of how confidence has shifted, which is exactly the kind of context an executive review or an agent summarizing the quarter needs."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Where each grouping lives",
        "text": "Cycles, milestones, and modules belong to a single project. Initiatives and releases belong to the whole organization and reach across projects. If you are grouping work for a portfolio view, you want an initiative; if you are grouping a feature stream inside one product area, you want a module."
      },
      {
        "type": "h2",
        "text": "Releases and the changelog"
      },
      {
        "type": "p",
        "text": "A **release** is an organization-level versioned deliverable, the bundle of work shipping together. A release has a `name`, an optional `version` string, an optional `description`, an optional `released_at` date, and a status of **planned**, **released**, or **archived**. You tag work items into a release from any project, and the release rolls up a **done-out-of-total** count so you can see how much of the version is ready."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Create the release",
            "text": "Name it, optionally give it a version like v1.2.0 and a target release date. It starts as planned."
          },
          {
            "title": "Tag the work",
            "text": "Tag the work items that ship in this version into the release. Untag any that slip to a later one."
          },
          {
            "title": "Track readiness",
            "text": "Watch the done-out-of-total rollup as tagged items complete."
          },
          {
            "title": "Ship it",
            "text": "Flip the status to released when it goes out, and archive it once it is historical."
          }
        ]
      },
      {
        "type": "h3",
        "text": "The Keep-a-Changelog changelog"
      },
      {
        "type": "p",
        "text": "Each release carries a structured **changelog** that follows the [Keep a Changelog](https://keepachangelog.com) categories. Every entry has a category, a title, an optional body, and an optional **PR link**, and entries keep an explicit sort order so you control how they read. The six categories are:"
      },
      {
        "type": "table",
        "headers": [
          "Category",
          "Use it for"
        ],
        "rows": [
          [
            "Added",
            "New features."
          ],
          [
            "Changed",
            "Changes to existing behavior."
          ],
          [
            "Fixed",
            "Bug fixes."
          ],
          [
            "Removed",
            "Features taken out."
          ],
          [
            "Security",
            "Security-relevant changes."
          ],
          [
            "Deprecated",
            "Features marked for future removal."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Because an entry can link the pull request that delivered it, the changelog stays traceable back to the code. This is a natural surface for an agent: with a release tagged, an agent can read the shipped items and draft categorized changelog entries with PR links for you to review."
      },
      {
        "type": "h2",
        "text": "Timeline and scheduling"
      },
      {
        "type": "p",
        "text": "The project **timeline** is a Gantt view of every dated, non-triage work item in a project, drawn from each task's start and due dates and connected by scheduling dependencies. On top of the bars it computes two things that tell you where the plan is fragile: the critical path and any violations."
      },
      {
        "type": "h3",
        "text": "Critical path and violations"
      },
      {
        "type": "p",
        "text": "The **critical path** is the longest chain of dependent work through the project, the sequence that sets the earliest the project can finish. Tasks on it are flagged so you know which slips actually move the end date. A **violation** is a scheduling link whose current dates break its own constraint, for example a successor that starts on or before its predecessor finishes under a finish-to-start link. The timeline marks every violated link and every task on the receiving end of one, and reports a total violation count so you can see at a glance whether the schedule is internally consistent."
      },
      {
        "type": "h3",
        "text": "Scheduling dependencies"
      },
      {
        "type": "p",
        "text": "A **scheduling dependency** constrains one task's dates relative to another's. It is distinct from a logical task relation: a relation says two items are connected, a scheduling link actually drives the timeline. You create one by pointing a task at another, choosing the dependency type, and saying which of the two is the predecessor. There are four types, the standard project-management set:"
      },
      {
        "type": "table",
        "headers": [
          "Type",
          "Constraint"
        ],
        "rows": [
          [
            "Finish to start (FS)",
            "The successor cannot start until the predecessor finishes. The default."
          ],
          [
            "Start to start (SS)",
            "The successor cannot start before the predecessor starts."
          ],
          [
            "Finish to finish (FF)",
            "The successor cannot finish before the predecessor finishes."
          ],
          [
            "Start to finish (SF)",
            "The successor cannot finish before the predecessor starts."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Auto-shift cascades"
      },
      {
        "type": "p",
        "text": "When you move a task's dates, **auto-shift** cascades the change down the dependency chain so the schedule stays valid. It walks the dependents in dependency order and pushes each successor just far enough to satisfy its constraint. The cascade is **forward only**: a successor is only ever pushed later, never pulled earlier, and a task's duration is preserved when its start moves. Auto-shift returns exactly which tasks moved and their new dates, so a date change you make in one place resolves the downstream knock-on effects in one step instead of leaving you to fix each violated link by hand."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Auto-shift only moves dates outward",
        "text": "Because it is forward-only, auto-shift will never compress a schedule by pulling work earlier. It pushes successors out to keep constraints satisfied. If a predecessor moves earlier and you want dependents to follow, adjust those dates yourself, since auto-shift will not tighten the plan for you."
      },
      {
        "type": "h2",
        "text": "Insights"
      },
      {
        "type": "p",
        "text": "Once work is flowing through cycles and projects, the insights surfaces tell you how it is going."
      },
      {
        "type": "h3",
        "text": "Throughput trend"
      },
      {
        "type": "p",
        "text": "The **throughput** trend plots **created versus resolved** work items over a trailing window, with one point per day. The default window is the last 30 days and can run from 7 up to 90. Two lines, items created and items resolved, let you read at a glance whether you are keeping pace with incoming work or falling behind. When the resolved line tracks or beats the created line, the backlog is holding steady."
      },
      {
        "type": "h3",
        "text": "Project overview stats"
      },
      {
        "type": "p",
        "text": "The analytics **overview** rolls up a project (or the whole organization) into a compact snapshot: total items, completed items, a completion rate, and how many are overdue, plus breakdowns by status category, by priority, and by work-item kind. The same rollups can be exported to a long-format CSV of metric, dimension, and value for reporting elsewhere."
      },
      {
        "type": "h3",
        "text": "Epics view"
      },
      {
        "type": "p",
        "text": "The **epics** view lists the project's work items of kind **Epic** and shows progress per epic from its child items, a done-out-of-total of the subtasks underneath it, along with the summed estimate points rolled up from its children. It is the way to see large bodies of work as single rows while keeping the detail of what is finished underneath each one. For deeper cuts, the analytics module also offers flow and WIP across the open statuses, per-member workload, a scope-versus-completion scatter across cycles or modules, a configurable pivot, and a weekly throughput forecast."
      },
      {
        "type": "h2",
        "text": "Putting it together"
      },
      {
        "type": "p",
        "text": "These pieces are designed to layer. Inside a project you run work in **cycles**, commit to dates with **milestones**, and organize streams with **modules**, while the **timeline** keeps the dependencies honest. Above projects, **initiatives** group the portfolio and **releases** bundle what ships, and **insights** tell you whether the whole thing is converging. Because each surface is available to agents over the [company-brain MCP](/docs/company-brain-mcp) on your own key, the same planning loop your team runs by hand is one your agents can run alongside you."
      }
    ]
  },
  {
    "title": "Views, filters & query language",
    "slug": "views-filters-pql",
    "description": "How to narrow a board down with filters, save a named slice as a reusable view, write precise queries in PQL or plain English on the Query page, and publish a teamspace view as a read-only public link.",
    "blocks": [
      {
        "type": "h2",
        "text": "Finding the work that matters"
      },
      {
        "type": "p",
        "text": "A project board shows everything in the project. Most of the time you only care about a slice of it: the open work, the items assigned to you, the high-priority tasks, the bugs in one module. Elliptic gives you three layers for getting to that slice. **Filters** narrow what you are looking at right now. **Saved views** remember an arrangement so you can return to it with one click. And **PQL**, the Elliptic Query Language, lets you express anything filters cannot, in a precise expression you run on the Query page or ask for in plain English."
      },
      {
        "type": "p",
        "text": "All three operate on the same building block, the work item (a task, bug, story, or epic). Because agents are first-class members of an org and operate the same surfaces over the company-brain MCP on your organization's own model key, the queries you write by hand are exactly the queries an agent reasons over. A PQL expression is a shared, exact definition of \"the work that matters\", whether a person or an agent is reading it."
      },
      {
        "type": "h2",
        "text": "Filtering work items"
      },
      {
        "type": "p",
        "text": "Filters live on a project's board. They are applied in your browser, so the board responds instantly as you toggle them, and they never change the underlying tasks. Open a project and you have several controls that stack together, each narrowing the set further."
      },
      {
        "type": "h3",
        "text": "The board controls"
      },
      {
        "type": "table",
        "headers": [
          "Control",
          "What it does"
        ],
        "rows": [
          [
            "Status",
            "An inline picker that shows only items in one workflow status: **Backlog**, **Todo**, **In progress**, **In review**, **Done**, or **Cancelled**. Defaults to **All statuses**."
          ],
          [
            "Assignee",
            "An inline picker that shows only items assigned to a specific member, or only **Unassigned** items. Defaults to **All assignees**."
          ],
          [
            "Text search",
            "Type into the inline search box to match an item by its **title** or its identifier (like `WEB-142`). Matching is case-insensitive and partial, so `pay` finds `Payment retry`."
          ],
          [
            "Group by",
            "Arrange the board into swimlanes by **None**, **Assignee**, or **Priority**."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "The Filter menu"
      },
      {
        "type": "p",
        "text": "Next to the inline controls is a **Filter** menu that adds three more filters, each accepting multiple values at once:"
      },
      {
        "type": "table",
        "headers": [
          "Filter",
          "What it does"
        ],
        "rows": [
          [
            "Priority",
            "Toggle one or more priorities (None, Low, Medium, High, Urgent). An item matches if its priority is any of the selected ones."
          ],
          [
            "Label",
            "Toggle one or more of the project's labels. An item matches if it carries any of the selected labels."
          ],
          [
            "Module",
            "Toggle one or more of the project's modules. Only items in a selected module remain."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Active filters from the **Filter** menu appear as removable chips next to it, and a small count badge on the button shows how many are on. Click the X on a chip to drop that one, or **Clear all** to reset every menu filter at once. The status, assignee, and search controls live inline on the board toolbar, so they are always one click away."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Severity, release-blocker, and cycle",
        "text": "Work items also carry **severity** (for bugs), a **release-blocker** flag, and a **cycle**. The board has no dedicated toggle for these, but they are stored on every item and are fully filterable through PQL, covered below. So `severity = \"critical\"` or `release_blocker = true` is one short query away, and `module`, which the board does expose as a filter, is queryable too."
      },
      {
        "type": "h2",
        "text": "Saved views"
      },
      {
        "type": "p",
        "text": "A **saved view** is a named arrangement of a board you can return to. On a project board it captures the current **grouping** (swimlanes by none, assignee, or priority) together with the inline **status**, **assignee**, and **search** filters, under a name you choose. Save it once, and selecting it later restores that arrangement in a click. Board views are stored in your browser, so they are personal to you and to the device you save them on."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Arrange the board",
            "text": "Set the grouping and the status, assignee, and search filters until the board looks the way you want to keep it."
          },
          {
            "title": "Save it",
            "text": "Open the views bar, choose to save the current arrangement, and give it a clear name such as \"My open work\" or \"In review\"."
          },
          {
            "title": "Reopen any time",
            "text": "Select the view later to restore its grouping and filters in one click. A small dot marks a view you have changed since you last saved it."
          },
          {
            "title": "Set a default",
            "text": "Pin one view as the default for that board so its arrangement is applied automatically the next time the board loads."
          }
        ]
      },
      {
        "type": "p",
        "text": "You can rename, delete, or **lock** a view from the views menu. Locking guards a view against accidental edits, so its name and definition stay put until you unlock it. There is at most one default per board, marking another view as default moves the star to it."
      },
      {
        "type": "h3",
        "text": "Teamspace views across a team's projects"
      },
      {
        "type": "p",
        "text": "A team gets its own kind of saved view, created from the **Views** tab on the team page. Instead of looking at a single project, a teamspace view shows the **union of work items across every project linked to the team**. Open it and you see one combined count drawn from all of the team's projects at once. Visibility rides on team membership, so any member of the team sees the whole union, and the dataset is not re-checked project by project. Triage items and archived tasks are left out, and results are ordered by the board's sort order and item number."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "How saved views are scoped under the hood",
        "text": "Every saved view has exactly one scope, and the scope decides who can change it. A **personal** view belongs to one user and only that user may edit it. A **team** view is shared org-wide and only an org admin or owner may edit it. A **teamspace** view is tied to one team and may be edited by any member of that team or by an org admin. Teamspace views, with their cross-project union and public links, are the kind you create and manage in the app today, from the team's Views tab. If you try to edit a view you have no rights to, Elliptic declines rather than silently failing."
      },
      {
        "type": "h2",
        "text": "PQL, the Elliptic Query Language"
      },
      {
        "type": "p",
        "text": "**PQL** is a small, precise filter language for work items. Where the board filters cover the common cases, PQL reaches every queryable field, combines conditions with boolean logic, and adds a handful of functions for the questions that come up most. A PQL query is filter-only. It describes which items match, and Elliptic returns the list. You write and run PQL on the **Query** page in your workspace."
      },
      {
        "type": "h3",
        "text": "Fields"
      },
      {
        "type": "p",
        "text": "A query is built from comparisons against an item's fields. The available fields are:"
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "Meaning",
          "Example values"
        ],
        "rows": [
          [
            "`status`",
            "Workflow status",
            "`backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`"
          ],
          [
            "`priority`",
            "Priority",
            "`none`, `low`, `medium`, `high`, `urgent`"
          ],
          [
            "`kind`",
            "Work-item type",
            "`task`, `bug`, `story`, `epic`"
          ],
          [
            "`severity`",
            "Bug severity",
            "`low`, `medium`, `high`, `critical`"
          ],
          [
            "`component`",
            "Free-text component name",
            "any string"
          ],
          [
            "`title`",
            "Item title",
            "any string"
          ],
          [
            "`description`",
            "Item description",
            "any string"
          ],
          [
            "`number`",
            "The item's number within its project",
            "any number, e.g. `142`"
          ],
          [
            "`assignee`",
            "Assigned member (by id), or compare to `null`",
            "a member id, or `null`"
          ],
          [
            "`label`",
            "A label attached to the item, matched by name",
            "e.g. `\"bug\"`, `\"infra\"`"
          ],
          [
            "`release_blocker`",
            "Whether it blocks a release",
            "`true` or `false`"
          ],
          [
            "`is_triage`",
            "Whether it is sitting in triage",
            "`true` or `false`"
          ],
          [
            "`due_date`",
            "Due date",
            "`YYYY-MM-DD`, e.g. `2026-07-01`"
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Operators"
      },
      {
        "type": "p",
        "text": "Each field is compared with an operator. PQL supports equality and ordering, a contains operator for text, and list membership:"
      },
      {
        "type": "ul",
        "items": [
          "`=` and `!=` for equals and not-equals.",
          "`~` for **contains**: `title ~ \"payment\"` matches any title that contains the word, case-insensitively.",
          "`<`, `<=`, `>`, `>=` for ordered comparisons, most useful on `number` and `due_date`.",
          "`IN [...]` and `NOT IN [...]` to test membership in a list, for example `status in [\"todo\", \"in_progress\"]`."
        ]
      },
      {
        "type": "h3",
        "text": "Combining conditions"
      },
      {
        "type": "p",
        "text": "Conditions compose with the boolean keywords `and`, `or`, and `not`, and you can group them with parentheses to control precedence. For example, `(priority = \"high\" or priority = \"urgent\") and not is_done()` reads as high or urgent items that are not yet done."
      },
      {
        "type": "h3",
        "text": "Functions"
      },
      {
        "type": "p",
        "text": "Six built-in functions cover the common questions that are awkward to express as plain comparisons. Each takes no arguments and is written with empty parentheses:"
      },
      {
        "type": "table",
        "headers": [
          "Function",
          "Matches an item when"
        ],
        "rows": [
          [
            "`is_overdue()`",
            "It has a due date in the past and is not yet completed."
          ],
          [
            "`has_no_assignee()`",
            "Nobody is assigned to it."
          ],
          [
            "`has_no_label()`",
            "It carries no labels."
          ],
          [
            "`is_top_level()`",
            "It is not a subtask (it has no parent)."
          ],
          [
            "`is_done()`",
            "Its status is in the completed category."
          ],
          [
            "`is_open()`",
            "Its status is not in the completed category."
          ]
        ]
      },
      {
        "type": "code",
        "code": "# Overdue bugs that nobody is working on\nkind = \"bug\" and is_overdue() and has_no_assignee()\n\n# High or urgent items that are still open\npriority in [\"high\", \"urgent\"] and is_open()\n\n# Anything that mentions billing in its title or description\ntitle ~ \"billing\" or description ~ \"billing\"\n\n# Release-blocking bugs not yet in review or done\nrelease_blocker = true and kind = \"bug\" and status not in [\"in_review\", \"done\"]",
        "lang": "text"
      },
      {
        "type": "h3",
        "text": "Validating and running a query"
      },
      {
        "type": "p",
        "text": "Open the **Query** page from your workspace. Type a query into the editor, then run it. Elliptic first **validates** the query, parsing it and checking that every field and function is one it knows, and then **executes** it across your org's items. The page shows the result count and a list of matching items, each with its identifier, title, priority, and status. Click any result to jump straight to that item on its project board. A few example queries sit under the editor as one-click starting points, and you can run with the **Run** button or with Cmd/Ctrl+Enter."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "What a query runs against",
        "text": "By default a query runs over all of the organization's work items, skipping archived ones. Results are capped at 500 items, so very broad queries return the first 500 matches rather than an unbounded list. Tighten the query (add a status, a label, or a priority) to focus the result."
      },
      {
        "type": "h2",
        "text": "Ask in plain English"
      },
      {
        "type": "p",
        "text": "You do not have to know the grammar to use PQL. At the top of the Query page there is an **Ask in plain English** box. Type a request the way you would say it, like \"overdue bugs nobody is working on\" or \"high priority items in review\", and Elliptic turns it into PQL for you. This translation runs on your organization's own model key (BYOK), the same key behind every other AI feature."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Describe what you want",
            "text": "Type a plain-English request into the Ask in plain English box, for example \"unassigned release blockers\"."
          },
          {
            "title": "Generate the query",
            "text": "Elliptic sends your request to your org's model, gets back a PQL query, and validates it before showing it to you."
          },
          {
            "title": "Review and run",
            "text": "The generated query drops into the editor and runs automatically, so you see both the exact query and its results. Edit the query by hand from there if you want to refine it."
          }
        ]
      },
      {
        "type": "p",
        "text": "Because the result is real PQL, you keep the precision of the query language with the ease of natural language. If the model produces something that does not parse, Elliptic tells you so and asks you to rephrase, rather than running a broken query. This is also how an agent can take a request like \"show me everything blocking the launch\" and turn it into a query it can actually execute over the company brain."
      },
      {
        "type": "h2",
        "text": "Sharing a teamspace view"
      },
      {
        "type": "p",
        "text": "A teamspace view can be turned into a **read-only public link** so people outside your workspace can see the slice without an account. Publishing a view generates a secret token and a public path of the form `/public/views/{token}`. Anyone with that link sees a stripped-down, read-only snapshot of the matching items (identifier, title, status, and priority), and nothing else about your org. They cannot edit anything, and they cannot navigate into the rest of your workspace."
      },
      {
        "type": "ul",
        "items": [
          "**Publish** a view from the team's Views tab to create its public link. Elliptic mints a single unguessable token, and the link is copied to your clipboard so you can hand it out.",
          "**Visit** the link to see the current snapshot. It shows the union across the team's linked projects, the same as inside the app, minus triage and archived items.",
          "**Revoke** the link at any time. Once revoked, the token stops working immediately and the view is private again. Publishing later mints a fresh token."
        ]
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "A public link is genuinely public",
        "text": "Anyone who has the link can open it without signing in. Treat it like a shared secret: only send it to people who should see that slice of work, and revoke it the moment it is no longer needed. Only someone who can edit the view (per its scope) can publish or revoke its link."
      },
      {
        "type": "p",
        "text": "Published views sit alongside the other read-only links in Elliptic, like public project boards and shared notes. Each is a single unguessable token you can revoke at any time, and each exposes only a minimal, read-only snapshot of the underlying work, never write access or the rest of your workspace."
      }
    ]
  },
  {
    "title": "Triage, intake & recurring work",
    "slug": "triage-intake-recurring",
    "description": "Process every inbound request from one fast triage queue, open public and in-app intake forms with configurable fields, and schedule work that repeats on a fixed cadence.",
    "blocks": [
      {
        "type": "h2",
        "text": "Where inbound work lands"
      },
      {
        "type": "p",
        "text": "Not all work starts as a clean task on the board. Requests arrive from outside the team, from people without an account, from forms, from AI, and from your other tools. Elliptic funnels all of it into one place called **triage**, a single inbox of untriaged inbound work that you process one item at a time. This page covers the triage queue itself, the intake channels that feed it (a public link, in-app member requests, and custom forms), and recurring rules that create work on a schedule. The AI side of triage, the automations and skills that label and route items, is covered on the [AI, Brain & Automations](/docs/ai-brain-automations) page."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Triage is agent-shaped too",
        "text": "Triage is a normal Elliptic surface, so your AI members can work it over the company-brain MCP, on your org's own key. An agent can read the queue, accept an item into its project, or decline one with a reason, through the same tasks the web app acts on. That is what makes triage automation possible, rather than a bolted-on rules engine. Marking duplicates, snoozing, and accepting into a specific status are web actions today, not exposed as agent tools."
      },
      {
        "type": "h2",
        "text": "The triage queue"
      },
      {
        "type": "p",
        "text": "The triage queue is your inbox of untriaged inbound work across your active projects. You reach it from **Triage** in the sidebar. Every item is a real work item flagged for triage: it has an identifier, a title, a description, a priority, and a home project, but it has not yet been accepted onto the board. The queue is ordered newest first, so the most recent arrivals are at the top."
      },
      {
        "type": "p",
        "text": "The page is built to be cleared fast. A focused card at the top shows the current item in full, and a compact list below shows the rest of the queue. The header tells you how many items are waiting and across how many projects, for example \"7 items to triage across 3 projects\". When the queue is empty you see **Triage zero**."
      },
      {
        "type": "h3",
        "text": "Processing one item at a time"
      },
      {
        "type": "p",
        "text": "Triage is designed around a single focused item rather than a bulk grid. You move through the queue with the keyboard: **arrow down** and **arrow up** move focus to the next or previous item, and **enter** opens the focused item in its project for a closer look. The focused card shows the project key, the identifier, the priority, when it was created, and, when the item came from a known channel, a small badge naming that channel (for example `in-app` or `form`)."
      },
      {
        "type": "h3",
        "text": "The single-key actions"
      },
      {
        "type": "p",
        "text": "Each item is resolved with one of four decisions, each bound to a single key so you can clear the queue without reaching for the mouse:"
      },
      {
        "type": "table",
        "headers": [
          "Action",
          "Key",
          "What it does"
        ],
        "rows": [
          [
            "Accept",
            "1 or A",
            "Moves the item out of triage and onto the active board. From the queue it lands in **To do**, ready to be worked. Accepting clears the triage flag and any snooze and sets the status."
          ],
          [
            "Mark duplicate",
            "2",
            "Resolves the item as a duplicate. Its status becomes **Duplicate** and it leaves the queue. If you point it at the original task, Elliptic records a duplicate relation between the two."
          ],
          [
            "Decline",
            "3 or X",
            "Declines the item as not actionable. Its status becomes **Cancelled** and it moves into the closed group with the time it was resolved. You can record an optional reason."
          ],
          [
            "Snooze",
            "S",
            "Removes the item from the queue until a future time, then it resurfaces. The default is to snooze for a day."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Accept, mark duplicate, and decline all resolve the item: accept and duplicate by taking it out of the triage flow, decline by closing it. Snooze is the one action that keeps an item in triage but hides it temporarily. Every decision is written to the activity log against the item, so the history of how a request was handled is preserved."
      },
      {
        "type": "h3",
        "text": "Accepting into a status"
      },
      {
        "type": "p",
        "text": "Accepting does not just dump the item onto the board, it places it at a workflow status. From the triage card, the accept key moves the item into **To do** so it is immediately actionable, which is the right default for most requests. The accept endpoint can also target any of the board statuses (Backlog, To do, In progress, In review, Done, Cancelled), so a request that is already half-done can land further along. Accepting always clears the snooze, so an accepted item never quietly reappears."
      },
      {
        "type": "h3",
        "text": "Snooze and resurfacing"
      },
      {
        "type": "p",
        "text": "Snoozing sets a time in the future and removes the item from the open queue until then. It is not resolved, it is deferred. Once the snooze time passes, the item is counted and shown again exactly as before. This keeps the queue honest: things you are not ready to decide on do not clutter the list, but they also do not silently disappear."
      },
      {
        "type": "h3",
        "text": "Open and closed views"
      },
      {
        "type": "p",
        "text": "The queue has two tabs. **Open** is the live work: unresolved items that are not currently snoozed, newest first. **Closed** holds the declined items, the ones you cancelled out of triage, so there is always an audit trail of what was turned down and why. Accepted and duplicate-resolved items leave triage entirely and live on as ordinary tasks on the board, so they are not in either tab."
      },
      {
        "type": "h3",
        "text": "Count badges"
      },
      {
        "type": "p",
        "text": "Triage drives count badges so you always know how much is waiting. Elliptic tracks an org-wide total of open triage items plus a per-project breakdown, and these counts feed the badges in the navigation. The counts only include items that are genuinely actionable right now: snoozed items and already-resolved items are excluded, so the number you see is the real size of the decision backlog, not a running tally of everything that ever arrived."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Run a skill on a tricky item",
        "text": "When an item in the focused card needs more than a one-key decision, you can run a triage **skill** on it straight from the card. Skills are reusable AI routines that read the item and act on it, for example to enrich, route, or pre-classify it. They are configured on the [AI, Brain & Automations](/docs/ai-brain-automations) page and run on your own model key."
      },
      {
        "type": "h2",
        "text": "Public intake forms"
      },
      {
        "type": "p",
        "text": "A public intake form gives a project a link that anyone can use to submit a request, with no Elliptic account required. It is how you collect bug reports, feature requests, or support asks from customers and outsiders without giving them access to your workspace. Every submission lands in the project's triage queue as a new item, tagged with the `form` channel, so it flows through the same one-key process as everything else."
      },
      {
        "type": "h3",
        "text": "Enabling the public link"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Enable intake for the project",
            "text": "An admin turns on the public intake form for a specific project. Enabling is project-scoped: each project has its own form and its own link. The first time you enable it, Elliptic mints a unique, hard-to-guess public token for that project."
          },
          {
            "title": "Share the link",
            "text": "The token is the project's public form address. Anyone with the link can open the form, which shows only the project name and the organization name, and submit a request. No internal identifiers, member lists, or board contents are exposed."
          },
          {
            "title": "Watch submissions arrive in triage",
            "text": "Each submission becomes a triage item in the project, with the title and description the submitter entered. If the project has an intake owner set, that person is notified of the new submission."
          }
        ]
      },
      {
        "type": "h3",
        "text": "What a submission contains"
      },
      {
        "type": "p",
        "text": "The public form collects a required **title** and an optional **description**, plus an optional **name** and **email** for the submitter. When a name or email is provided, Elliptic appends a short \"Submitted via intake form by ...\" line to the item's description so you can follow up. The new item starts in Backlog, in the triage queue, waiting for a decision."
      },
      {
        "type": "h3",
        "text": "The returned reference"
      },
      {
        "type": "p",
        "text": "After a successful submission, the form returns a **reference** to the submitter, the work item's identifier in `PROJECT-NUMBER` form (for example `WEB-142`). This is the same identifier the item carries inside Elliptic, so a submitter can quote it when they follow up, and you can find the exact item they mean. The submitter also sees a short confirmation that the request was received."
      },
      {
        "type": "h3",
        "text": "Rate limiting"
      },
      {
        "type": "p",
        "text": "Because the public endpoint takes anonymous traffic, submissions are rate-limited to **10 per minute**. This is enough for normal use while protecting the queue from being flooded by a script or an abusive client. Reading the form (to render it) is separate from submitting it, and is not rate-limited."
      },
      {
        "type": "h3",
        "text": "Admin enable and disable"
      },
      {
        "type": "p",
        "text": "Enabling and disabling the public form is an admin action. Disabling turns the link off immediately: the form stops accepting and stops rendering. The token itself is preserved but inactive, so if you re-enable the same project later, the previous link keeps working rather than breaking every place you posted it. You stay in control of when the door is open."
      },
      {
        "type": "h2",
        "text": "In-app intake"
      },
      {
        "type": "p",
        "text": "In-app intake is the inside-the-workspace counterpart to the public form. When an admin enables it for a project, members of the organization, including **guests**, can submit a request straight into that project's triage queue from within Elliptic, without needing edit access to the board itself. The item is tagged with the `in_app` channel so you can tell it apart from public submissions."
      },
      {
        "type": "p",
        "text": "This is the right channel when someone belongs to your org but should not be dropping work directly onto a team's board: a guest stakeholder, or a member from another team who wants to file a request and let the owning team triage it. The submission carries a title and an optional description and is attributed to the member who created it. In-app intake is a separate toggle from the public form, so you can run one, both, or neither per project."
      },
      {
        "type": "h2",
        "text": "Custom intake forms"
      },
      {
        "type": "p",
        "text": "When a single title-and-description form is not enough, you can build a **custom intake form** for a project: a public form with your own ordered set of fields. Like the basic public form, a custom form has its own public token and submits straight to the project's triage queue. A project can have more than one custom form, each with its own link and field set, so you can run, say, a bug-report form and a feature-request form side by side."
      },
      {
        "type": "h3",
        "text": "Configurable fields"
      },
      {
        "type": "p",
        "text": "Each form holds an ordered list of fields that you define. A field has a label, a type, and a required flag, and is rendered in the order you set. The supported field types are:"
      },
      {
        "type": "table",
        "headers": [
          "Type",
          "Renders as"
        ],
        "rows": [
          [
            "text",
            "A single-line text input, for short answers."
          ],
          [
            "textarea",
            "A multi-line text box, for longer descriptions."
          ],
          [
            "select",
            "A dropdown of predefined options you supply on the field."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Marking a field **required** forces the submitter to fill it in before they can submit. The order you arrange the fields in is the order respondents see, so put the most important questions first."
      },
      {
        "type": "h3",
        "text": "Building and managing a form"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Create the form",
            "text": "Give the form a name and add its fields in order, choosing a type and a required flag for each, plus options for any select fields. Elliptic mints a public token for the form when you create it."
          },
          {
            "title": "Edit it as needs change",
            "text": "You can rename a form, rewrite its field set, or enable and disable it. A disabled form stops accepting submissions without losing its configuration."
          },
          {
            "title": "Share the public link and collect submissions",
            "text": "The form's token is its public address. Respondents see the form name and your configured fields, with no account needed. Each submission carries a title plus the answers to your fields, rendered into the item description, and lands in the project's triage queue alongside every other inbound item."
          },
          {
            "title": "Delete when retired",
            "text": "Removing a form takes its public link out of service for good."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Every intake path ends in triage",
        "text": "The basic public form, in-app intake, and custom forms all converge on the same place: a new item in the project's triage queue. That means there is exactly one workflow to learn for handling inbound work, no matter how it arrived. Decide it once, with one key, in triage."
      },
      {
        "type": "h2",
        "text": "Recurring work items"
      },
      {
        "type": "p",
        "text": "Some work is not inbound at all, it is predictable. A weekly report, a fortnightly dependency review, a monthly cleanup. A **recurring work item rule** is a template that automatically creates a work item on a fixed day-interval cadence, so the task shows up on its own when it is due instead of relying on someone to remember. Rules are project-scoped."
      },
      {
        "type": "h3",
        "text": "What a rule defines"
      },
      {
        "type": "p",
        "text": "A recurring rule is a small template plus a cadence. The template carries the fields that every generated item should start with:"
      },
      {
        "type": "ul",
        "items": [
          "**Title** and an optional **description**, copied onto each created item.",
          "**Priority**, from None through Urgent.",
          "**Kind**, the work-item type: task, bug, story, or epic.",
          "**Assignee**, an optional person the item is assigned to on creation.",
          "**Interval**, the cadence in days, from 1 to 365."
        ]
      },
      {
        "type": "p",
        "text": "Each time the rule fires, it creates a fresh work item in the project from this template. Generated items start at the **To do** status, so they appear as ready-to-work tasks rather than landing in triage. The rule tracks when it will next run and when it last ran."
      },
      {
        "type": "h3",
        "text": "The cadence"
      },
      {
        "type": "p",
        "text": "The cadence is a plain day interval: every 7 days, every 14, every 30, and so on. You can also set when the rule should first run, which defaults to now. Elliptic advances the next run time forward by the interval after each firing, so the rhythm stays steady even if a run happens a little late."
      },
      {
        "type": "h3",
        "text": "Pausing, resuming, and running on demand"
      },
      {
        "type": "p",
        "text": "Each rule has an active flag you can toggle. Pausing a rule (turning it inactive) stops it from generating items automatically without deleting it, so a seasonal or temporarily irrelevant routine can be parked and brought back later. Resuming flips it back on. You can also **run a rule on demand**, which creates one item immediately from the template, independent of the schedule, useful when you need this week's instance early. Editing a rule lets you change the template fields, the interval, the next run time, the assignee, or the active state at any time."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Recurring rules versus templates",
        "text": "A recurring rule is for work that should appear on a schedule with no one prompting it. If you instead want a reusable scaffold that a person picks when creating a work item by hand, that is a work-item template, covered on the [Projects & Tasks](/docs/projects-and-tasks) page. Rules fire on a clock, templates are chosen on demand."
      },
      {
        "type": "h2",
        "text": "Where intake comes from elsewhere"
      },
      {
        "type": "p",
        "text": "The forms on this page are intake you build inside Elliptic, but plenty of inbound work originates in your other tools and in AI. Those paths all converge on the same triage queue."
      },
      {
        "type": "h3",
        "text": "Triage automations and skills"
      },
      {
        "type": "p",
        "text": "Triage does not have to be all manual. You can attach **automations** and AI **skills** that label, route, assign, prioritize, or pre-classify incoming items, and run a skill on the focused item from the triage card. These are configured on the [AI, Brain & Automations](/docs/ai-brain-automations) page, and like every AI feature in Elliptic they execute on your organization's own model key."
      },
      {
        "type": "h3",
        "text": "External sources"
      },
      {
        "type": "p",
        "text": "Inbound items can also flow in from outside Elliptic: **GitHub** issues and pull requests, **Sentry** alerts, inbound **email**, and a **Slack** slash command for filing requests without leaving chat. Each of these lands in triage tagged with its source channel (`github`, `sentry`, `email`, or `slack`), so it is handled with the same one-key flow as a form submission."
      }
    ]
  },
  {
    "title": "Time tracking & approvals",
    "slug": "time-tracking-approvals",
    "description": "How to log time against work items, require admin approval of logged time, export worklogs to CSV, and gate a task's status change behind an approve or reject decision.",
    "blocks": [
      {
        "type": "h2",
        "text": "What this covers"
      },
      {
        "type": "p",
        "text": "Elliptic has two small, separate systems that both live on a task and both deal with sign-off. **Time tracking** records how long work took, as worklogs measured in minutes against a work item. **Approvals** gate a task's move to a new status behind an approver's decision. They are independent: a project can require approval of logged time without using status approvals, and a task can use status approvals without anyone logging a minute. This page walks through both, plus how to export logged time to a spreadsheet."
      },
      {
        "type": "p",
        "text": "Both systems are ordinary Elliptic surfaces, which means an agent that is a member of your organization can use them too. An agent can log the time a run took, request a status move and wait for a human to approve it, or sit on the approver side and clear a queue. It operates the same endpoints you do over the company-brain MCP, on your organization's own key."
      },
      {
        "type": "h2",
        "text": "Logging time"
      },
      {
        "type": "p",
        "text": "A **worklog** is a single unit of time you logged against one task, recorded in minutes. Each entry carries the number of minutes, an optional note describing what you worked on, the date it was logged for, and who logged it. Worklogs always belong to a specific work item, so the time you spend is attributed to the task it was spent on, not to a vague bucket."
      },
      {
        "type": "p",
        "text": "You log time from inside a task. Open any task to its detail view and find its **Time tracking** section. There you get a small duration field, an optional note field, and a `Log` button, followed by the list of entries already recorded on that task."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the task",
            "text": "Open the work item you spent time on and find its **Time tracking** section."
          },
          {
            "title": "Enter a duration",
            "text": "Type how long you spent in the duration field. It accepts `1h 30m`, `45m`, or a bare number of minutes like `90`. The entry must be more than zero and cannot exceed 24 hours (1440 minutes) in a single log."
          },
          {
            "title": "Add a note (optional)",
            "text": "Describe what you worked on in the note field. It is optional and can hold up to 2000 characters. You can leave it blank."
          },
          {
            "title": "Log it",
            "text": "Press `Log` (or hit Enter in the duration field). The entry appears in the list and the running total updates. The entry is dated today. The API also accepts an explicit `logged_at` date if you are backfilling from outside the task UI."
          }
        ]
      },
      {
        "type": "p",
        "text": "Each task shows a **total logged** figure above its entries, the sum of every worklog's minutes on that task, formatted as hours and minutes (for example `3h 15m`). Individual entries show their own duration, the note (or the logger's name when there is no note), and the date."
      },
      {
        "type": "p",
        "text": "You can remove a worklog with the trash icon on its row, but only the person who logged it may delete their own entry. You cannot delete someone else's logged time."
      },
      {
        "type": "h3",
        "text": "The project total"
      },
      {
        "type": "p",
        "text": "Beyond the per-task total, Elliptic keeps a **per-project total**: the sum of all minutes logged across every task in a project. This is what the project's analytics use to show how much time the whole workstream has absorbed. Where a task total answers \"how long did this item take\", the project total answers \"how much time has this project consumed so far\"."
      },
      {
        "type": "h2",
        "text": "Worklog approval"
      },
      {
        "type": "p",
        "text": "By default, time you log is final the moment you log it. A project can instead require that an admin sign off on logged time before it counts. This is a per-project setting, `Require worklog approval`, and it is off unless an admin turns it on."
      },
      {
        "type": "p",
        "text": "When the setting is on, every new worklog on that project's tasks starts in a **pending** state instead of being immediately approved. Pending and rejected entries are flagged with a badge in the task's time list, so it is always clear which logged time still needs a decision and which was turned down."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Approval is opt-in, per project",
        "text": "With the setting off (the default), worklogs are **approved** as soon as they are created and there is no queue. Turning it on only affects entries logged from that point on, and only on that one project. Other projects are unaffected."
      },
      {
        "type": "h3",
        "text": "Turning approval on"
      },
      {
        "type": "p",
        "text": "Open the project's settings and find the **Time-log approvals** section. Flip the switch to require admin approval before logged time on this project counts as final. This switch, and the queue beneath it, are visible only to people who can manage the project (admins). A regular member does not see the approver controls."
      },
      {
        "type": "h3",
        "text": "The pending queue"
      },
      {
        "type": "p",
        "text": "While approval is required, the same **Time-log approvals** section lists every entry awaiting a decision on the project. Each row shows the logged duration, who logged it, and their note, with an approve (check) and a reject (cross) action."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the queue",
            "text": "As a project admin, open the project's settings and find **Time-log approvals**. Every pending entry on the project is listed there."
          },
          {
            "title": "Review the entry",
            "text": "Each row shows the minutes logged, the person who logged them, and the note. Use that to decide whether the time is correct."
          },
          {
            "title": "Approve or reject",
            "text": "Click the check to approve the entry or the cross to reject it. Approving marks the time as final. Rejecting marks it rejected. Either way, your account is recorded as the approver, with a timestamp."
          }
        ]
      },
      {
        "type": "p",
        "text": "A decision records who decided and when, and it removes the entry from the pending queue. The approve and reject endpoints also accept an optional decision note. Approving and rejecting are both admin actions: only someone with admin rights on the project may clear the queue."
      },
      {
        "type": "h2",
        "text": "Exporting worklogs"
      },
      {
        "type": "p",
        "text": "You can export a project's logged time as a CSV file, for billing, reporting, or pulling into a spreadsheet. The export is per project and downloads a file named `worklogs.csv`. From the project's analytics view, the **Time log CSV** button downloads the full export. To narrow it by date or person, call the export endpoint directly with the filters below."
      },
      {
        "type": "p",
        "text": "Each row in the file is one worklog, with these columns:"
      },
      {
        "type": "table",
        "headers": [
          "Column",
          "What it holds"
        ],
        "rows": [
          [
            "logged_at",
            "The date the entry was logged for, in ISO format (for example `2026-06-28`)."
          ],
          [
            "task",
            "The work item the time was logged against, as the project key and the task number (for example `ENG-42`)."
          ],
          [
            "logged_by",
            "The full name of the person who logged the time."
          ],
          [
            "minutes",
            "The duration of the entry in minutes."
          ],
          [
            "note",
            "The entry's note, or empty if there was none."
          ]
        ]
      },
      {
        "type": "p",
        "text": "The export endpoint takes three optional filters, applied independently or together:"
      },
      {
        "type": "ul",
        "items": [
          "**Start date** (`start_date`): only include entries logged on or after this date.",
          "**End date** (`end_date`): only include entries logged on or before this date.",
          "**User** (`user_id`): only include entries logged by one specific person."
        ]
      },
      {
        "type": "p",
        "text": "With no filters, you get every worklog on the project. Rows come back ordered by date (newest first), then by task number. Cells that begin with a spreadsheet formula character (`=`, `+`, `-`, or `@`) are neutralized on export, so opening the file in Excel or Sheets cannot execute injected formulas."
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# Export one user's logged time for a date range\ncurl -L -b cookies.txt \\\n  'https://elliptic.sh/api/orgs/{org_id}/projects/{project_id}/worklogs/export.csv?start_date=2026-06-01&end_date=2026-06-30&user_id={user_id}' \\\n  -o worklogs.csv"
      },
      {
        "type": "h2",
        "text": "Status-change approvals"
      },
      {
        "type": "p",
        "text": "Status approvals are a separate system from time tracking. They let you gate a task's move to another status behind an explicit decision. Instead of dragging the task straight into the new column, someone **requests** the move, and an approver either **approves** it (which performs the move) or **rejects** it (which leaves the task where it is)."
      },
      {
        "type": "p",
        "text": "An approval request is tied to one task and names a **target status**, the status the requester wants the task to move to. It carries an optional note explaining why, records who requested it, and tracks its own state: pending, approved, or rejected."
      },
      {
        "type": "p",
        "text": "You work with status approvals from inside the task. Open the task to its detail view and find the **Approvals** section. There you can request a move and see every request the task has had, newest first, each tagged with its state."
      },
      {
        "type": "h3",
        "text": "Requesting a move"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the task's Approvals section",
            "text": "Open the work item and find **Approvals**. If the task has no request in flight, you see a control to request a move."
          },
          {
            "title": "Pick the target status",
            "text": "Choose the status you want the task to move to from the `Request move to…` menu. The task's current status is excluded, since asking to move to where you already are is not a real request."
          },
          {
            "title": "Request",
            "text": "Click `Request`. A pending approval opens for that target status. The request endpoint also accepts an optional note (up to 2000 characters) to explain the move."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "One pending request at a time",
        "text": "A task can have only one open approval at once. If a request is already pending, you cannot open another until it is approved or rejected, and the request control is hidden while a decision is outstanding. You also cannot request a move to the status the task is already in."
      },
      {
        "type": "h3",
        "text": "Approving and rejecting"
      },
      {
        "type": "p",
        "text": "A pending request shows approve (check) and reject (cross) actions in the **Approvals** list. The decision is what actually moves the task, or doesn't:"
      },
      {
        "type": "ul",
        "items": [
          "**Approve** marks the request approved and applies the status change, transitioning the task to the requested target status as part of the same action. You do not move the task by hand afterward.",
          "**Reject** marks the request rejected and leaves the task exactly where it is. Nothing moves."
        ]
      },
      {
        "type": "p",
        "text": "Either way, the decider is recorded on the request, the decision endpoints accept an optional note, and the request leaves the pending state. A request that has already been decided cannot be decided again. Past requests stay listed on the task with their final state, so the history of who asked for what and how it was resolved is preserved."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Two kinds of sign-off, deliberately separate",
        "text": "Worklog approval governs whether **logged time** counts as final and is configured per project. Status approval governs whether a **task may change status** and is opened per request on a single task. Reach for the first when you need to vet hours, and the second when a transition (for example moving into `Done`) should not happen without a second set of eyes."
      }
    ]
  },
  {
    "title": "Notes, wiki & pages",
    "slug": "notes-wiki-pages",
    "description": "Write rich Markdown pages in a block editor, organize them into a wiki, comment and version them, and let your agents read and write the same pages over the MCP.",
    "blocks": [
      {
        "type": "h2",
        "text": "What this page covers"
      },
      {
        "type": "p",
        "text": "Pages in Elliptic are rich Markdown documents that live next to your tasks, meetings, and activity. They are where decisions, specs, runbooks, and handbooks get written down so the rest of the company, people and agents alike, can find them later. This page walks through creating and organizing pages, the wiki view over them, the block editor, mentions and references, version history and access control, templates and reuse, the link between pages and tasks, the on-page AI assistant, comments, your personal surfaces, and how agents work the same pages through the company-brain MCP."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "One model key behind every AI feature",
        "text": "Every AI feature on a page, the page assistant, inline text transforms, and the Generate control, runs on **your organization's own model key**. You bring an OpenAI or Anthropic key once at the org level and all AI work runs on it. This is what BYOK (bring your own key) means throughout the product."
      },
      {
        "type": "h2",
        "text": "Notes and pages"
      },
      {
        "type": "p",
        "text": "A page (the data model calls it a note) has a title, a Markdown body, and a few optional fields: an emoji icon, a project, a team, and a parent page. Nothing but the title is required. Pages are owned by the organization, so any member with access can find them, and every edit is written to the activity feed."
      },
      {
        "type": "h3",
        "text": "Create a page"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Notes or the Wiki",
            "text": "Go to Notes from the sidebar to see the org's pages, or open the Wiki for the org-wide knowledge base. Pages are listed newest-edited first, each with a one-line excerpt pulled from the first real line of the body."
          },
          {
            "title": "Click New note",
            "text": "A small dialog asks for a title (for example, \"Deploy runbook\"). If your org has page templates, the dialog also offers a Start from picker, defaulting to a blank page. The Create button stays disabled until you type a title."
          },
          {
            "title": "Start writing",
            "text": "On create, you land straight in the editor on the new page, with the title prefilled. There is nothing else to fill in first."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Create a page inside a project",
        "text": "When you start a page from a project, it is automatically linked to that project, so you do not have to set the project field yourself. The page then appears in the project's pages as well as on the main Notes list. A page can also carry a team."
      },
      {
        "type": "h3",
        "text": "Emoji icons"
      },
      {
        "type": "p",
        "text": "Each page can carry a single emoji icon. It shows in the list in place of the default document glyph, which makes a long wiki much faster to scan. Setting an icon is optional and you can change or clear it at any time."
      },
      {
        "type": "h3",
        "text": "Nest pages into a tree"
      },
      {
        "type": "p",
        "text": "Any page can have a **parent**, which turns a flat list into a tree. Set a parent and the child renders indented beneath it in the list, and the parent shows a count of its sub-pages. This is how you build a handbook with sections and sub-sections, or a project space with an index page and detail pages underneath it. A page cannot be its own parent, and the parent must be another page in the same organization."
      },
      {
        "type": "h3",
        "text": "List and filter"
      },
      {
        "type": "p",
        "text": "The list sorts by most recently edited, so the pages you are actively working on float to the top. You can narrow it down a few ways:"
      },
      {
        "type": "ul",
        "items": [
          "**Text filter** matches against both the title and the body, so you can find a decision buried deep in a long page.",
          "**By project** shows only that project's pages when you are viewing inside a project.",
          "**By team** scopes the list to a team's pages.",
          "**Archived toggle** decides whether archived pages appear. By default they are hidden and only active pages show."
        ]
      },
      {
        "type": "h2",
        "text": "The wiki"
      },
      {
        "type": "p",
        "text": "The Wiki is the org-wide view over your pages. It shows the pages that are not tied to any single project, the ones meant to be shared across the whole company: handbooks, runbooks, policies, onboarding guides, glossaries. It reads from the same pages as Notes, just filtered to the ones with no project and presented as a knowledge base."
      },
      {
        "type": "p",
        "text": "Because the wiki renders the parent-child tree, the natural way to build it is a small set of top-level pages (for example, Engineering, People, Security) with detail pages nested beneath each. New pages you create without a project show up here automatically."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Wiki vs. project pages",
        "text": "A page belongs to the wiki when it has no project. Give a page a project and it moves into that project's space instead. Nothing else changes about the page, the editor, sharing, history, and comments all work the same either way."
      },
      {
        "type": "h2",
        "text": "The editor"
      },
      {
        "type": "p",
        "text": "The page editor is a real block editor, not a plain text box. It supports headings, bold and italic, ordered and unordered lists, task lists, block quotes, inline code, code blocks, horizontal dividers, and links. Everything you write is saved as clean Markdown, which is what makes the same content readable to people, to exports, and to agents over the MCP."
      },
      {
        "type": "h3",
        "text": "The slash menu"
      },
      {
        "type": "p",
        "text": "Type `/` on a line to open the block menu. Search by name (\"head\", \"todo\", \"code\") and pick a block. Arrow keys move the selection, Enter inserts, Escape closes. The full set is:"
      },
      {
        "type": "table",
        "headers": [
          "Block",
          "What it inserts"
        ],
        "rows": [
          [
            "Text",
            "A plain paragraph"
          ],
          [
            "Heading 1, 2, 3",
            "Section, subsection, and minor headings"
          ],
          [
            "Bullet list",
            "An unordered list"
          ],
          [
            "Numbered list",
            "An ordered list"
          ],
          [
            "Task list",
            "A checklist of toggleable items"
          ],
          [
            "Quote",
            "A block quote for a callout"
          ],
          [
            "Code block",
            "A monospaced, fenced code block"
          ],
          [
            "Divider",
            "A horizontal rule"
          ],
          [
            "Create task",
            "Turns the current line's text into a task draft"
          ]
        ]
      },
      {
        "type": "p",
        "text": "The **Create task** item only appears in the slash menu on a page where task creation is wired up, which is a page opened inside the org (it needs to know where to file the task)."
      },
      {
        "type": "h3",
        "text": "Markdown shortcuts"
      },
      {
        "type": "p",
        "text": "You do not have to reach for the slash menu. Type Markdown and the editor converts it as you go: `## ` for a heading, `- ` for a bullet, `1. ` for a numbered item, `> ` for a quote, and so on. Pasting Markdown or a URL works too, and URLs auto-link."
      },
      {
        "type": "h3",
        "text": "Turn writing into tasks"
      },
      {
        "type": "p",
        "text": "Pages are often where work gets discovered, so the editor lets you spin tasks out of what you have written. Type `/` and pick **Create task**, and the current line's text becomes the title of a new task draft. To capture several at once, highlight a block of lines: a **Create task / Create N tasks** button appears at the top of the editor, and each non-empty line becomes its own task draft, with list markers and checkbox brackets stripped first."
      },
      {
        "type": "p",
        "text": "If the page is already in a project, the tasks land there. If it is not, a small picker asks which project they should go to. The drafted lines stay on the page, they are copied into tasks rather than moved out of the body."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Linking those tasks back to the page",
        "text": "Tasks made this way are filed in the project you choose, but they are not automatically tied back to the page. To get a task that shows up in the page's work-items list, use **Create from selection** in the work-items sidecar (covered below), which records the originating page."
      },
      {
        "type": "h2",
        "text": "Mentions and references"
      },
      {
        "type": "p",
        "text": "Type `@` anywhere in a page to open the mention picker. As you type it lists people, tasks, and pages that match, and selecting one inserts a styled chip. Each chip kind looks and behaves a little differently:"
      },
      {
        "type": "ul",
        "items": [
          "**People** insert as an `@` chip. This is a mention, not a clickable navigation target.",
          "**Tasks** insert as a monospace `#` chip that opens the task when clicked.",
          "**Pages** insert as a chip with a document icon that opens the referenced page when clicked."
        ]
      },
      {
        "type": "p",
        "text": "Under the hood every chip is stored as a plain Markdown link whose href is a sentinel path carrying the kind and id, so references survive save and reload and render identically for everyone. The exact wire format, and how an agent writes one, is documented on the References & Mentions page."
      },
      {
        "type": "code",
        "lang": "markdown",
        "code": "[Visible label](/__mention/<kind>/<id>)"
      },
      {
        "type": "h3",
        "text": "Drag to cite"
      },
      {
        "type": "p",
        "text": "You can also build a page by dragging. Grab a row out of the activity feed, a meeting, a page, a task, or a decision, and drop it into the editor. It lands at the drop point as a citation back to the original, carrying the item's kind, id, and title rather than just plain text. Pages and meetings drop in as clickable links, tasks and decisions drop in as a labelled citation. It is the fastest way to assemble a recap or a decision log out of things that already happened."
      },
      {
        "type": "h3",
        "text": "Notify and auto-subscribe"
      },
      {
        "type": "p",
        "text": "Mentioning a member notifies them. When you name someone in a page, they get a \"you were mentioned\" notification (you are never notified about mentioning yourself, and only org members are notified). When you mention someone in a comment on a task, they are additionally auto-subscribed to that task, so they keep getting updates without having to follow it manually."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Autosave to durable Markdown",
        "text": "Edits are persisted back to durable Markdown automatically. There is no Save button. The same Markdown is what history, export, comments, and the MCP all read."
      },
      {
        "type": "h2",
        "text": "History, visibility and locking"
      },
      {
        "type": "h3",
        "text": "Version history and restore"
      },
      {
        "type": "p",
        "text": "Every time a page's title or body changes, Elliptic snapshots the previous state as a version, attributed to whoever made the edit. You can browse those versions newest-first and restore any one of them. A restore is itself non-destructive: the current state is snapshotted first, then the chosen version is applied, so restoring is always reversible and nothing is ever lost."
      },
      {
        "type": "h3",
        "text": "Visibility and sharing"
      },
      {
        "type": "p",
        "text": "Each page has one of three visibility tiers:"
      },
      {
        "type": "table",
        "headers": [
          "Visibility",
          "Who can see it"
        ],
        "rows": [
          [
            "Public",
            "Every member of the organization"
          ],
          [
            "Private",
            "Only the creator, org admins, and members granted an explicit share"
          ],
          [
            "Shared",
            "The creator, org admins, and members granted an explicit share"
          ]
        ]
      },
      {
        "type": "p",
        "text": "On a private or shared page you grant access per member, at one of three levels: **view**, **comment**, or **edit**. View and comment grants let someone read, while edit is what lets a non-owner change the body. Changing a page's visibility, granting or revoking a share, locking, and archiving are all limited to the page's creator or an org admin."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "\"Public\" means visible to the org",
        "text": "\"Public\" here means visible to the whole organization, not to the open internet. Publishing a page to a public web link for people outside the org is a separate capability with its own published-page URL and visitor comments."
      },
      {
        "type": "h3",
        "text": "Locking"
      },
      {
        "type": "p",
        "text": "Locking a page freezes its content. While a page is locked, edits to the body are refused even for members who would otherwise have edit access, which is useful for a finalized policy or a runbook you do not want drifting. Unlock it to resume editing. Locking is a creator or admin action."
      },
      {
        "type": "h3",
        "text": "Archiving and deleting"
      },
      {
        "type": "p",
        "text": "Archiving a page tucks it out of the active list without deleting it. Archived pages are hidden by default and reappear when you flip the archived toggle, and you can unarchive at any time to bring a page back. Deleting a page, by contrast, removes it for good, and the deletion is recorded in the activity feed."
      },
      {
        "type": "h2",
        "text": "Reuse"
      },
      {
        "type": "h3",
        "text": "Templates"
      },
      {
        "type": "p",
        "text": "Page templates capture a starter title and body so you do not rebuild the same structure every time. There are two ways to make one: define a template directly, or save an existing page as a template. Either way, creating a new page from the template prefills the editor with its title and content, ready to fill in. Templates are scoped to the organization, and can optionally be scoped to a project. Each template name is unique within the org."
      },
      {
        "type": "h3",
        "text": "Duplication"
      },
      {
        "type": "p",
        "text": "Any page can be duplicated in one click. The copy keeps the original's project, parent, icon, and full content, and is titled \"… (copy)\" so the two are easy to tell apart. It is the quickest way to fork a working doc when a template would be overkill."
      },
      {
        "type": "h2",
        "text": "Notes and work"
      },
      {
        "type": "p",
        "text": "Pages and tasks are linked both ways. A task can record the page it was filed from, and a task can be linked to a page after the fact. Either way the relationship is tracked, so a page can show every task that originated from it or was linked to it."
      },
      {
        "type": "h3",
        "text": "The page work-items sidecar"
      },
      {
        "type": "p",
        "text": "A page exposes a work-items list: the tasks that record this page as their source plus any tasks explicitly linked to it. This is the sidecar that turns a planning page into something live, you see at a glance what is still open against the doc, and the tasks stay current as their status changes on the board. The sidecar's **Create from selection** button makes a task from the highlighted text and records this page as its source, so it appears in the list right away. That button needs the page to be in a project, since the task has to land somewhere."
      },
      {
        "type": "h2",
        "text": "AI on the page"
      },
      {
        "type": "h3",
        "text": "The page assistant"
      },
      {
        "type": "p",
        "text": "Open the page assistant to work with the document using your org's model key. It grounds on the live content of the page, so its answers reflect what is actually written. It offers one-click presets plus free-form questions:"
      },
      {
        "type": "ul",
        "items": [
          "**Summarize** condenses the page into a few bullet points.",
          "**Action items** extracts the to-dos from the page as a checklist.",
          "**Improve writing** rewrites the page to be clearer and more concise.",
          "**Free-form** lets you ask anything about the page, or ask it to draft new content, in your own words."
        ]
      },
      {
        "type": "p",
        "text": "Any answer can be inserted straight into the page, or dismissed. Press Cmd or Ctrl + Enter to send your question without reaching for the button."
      },
      {
        "type": "h3",
        "text": "Inline text transforms"
      },
      {
        "type": "p",
        "text": "Select text in the editor and an AI action appears in the toolbar. Pick a transform and the selection is rewritten in place: **Rephrase**, **Fix grammar**, **Summarize**, or **Expand**. There is also a **Generate** control that writes new content from a short prompt (with presets like TL;DR, Action items, and FAQ) and inserts it into the page. Inline transforms run through the AI transform endpoint and, like everything else, on your own key."
      },
      {
        "type": "h2",
        "text": "Comments"
      },
      {
        "type": "p",
        "text": "Comments are threaded discussions attached to a task, a meeting, or a page. A thread can nest one level deep: a comment, and replies under it. Every comment is Markdown, so it can carry mentions and references just like a page body."
      },
      {
        "type": "h3",
        "text": "Internal vs. external visibility"
      },
      {
        "type": "p",
        "text": "Each comment is either **internal** or **external**. Internal is the default and is for the team. External comments are the ones guests are allowed to read. A guest member only ever sees external comments, which keeps an internal back-and-forth private even on an item a guest can otherwise open."
      },
      {
        "type": "h3",
        "text": "Anchors, edits, and resolution"
      },
      {
        "type": "ul",
        "items": [
          "**Text anchors** let a comment point at a specific span of the item it is attached to, so feedback lands on the exact place it is about.",
          "**Edit history** is kept: editing a comment snapshots the prior content and marks it as edited, and you can list a comment's prior versions.",
          "**Resolve and reopen** mark a thread done or bring it back. Both are author or admin actions.",
          "**Emoji reactions** can be toggled on any comment, aggregated per emoji with a count and whether you reacted.",
          "**Attachments** can be added to a comment, so a screenshot or file rides along with the message."
        ]
      },
      {
        "type": "p",
        "text": "Commenting notifies the right people. The owner of the commented item gets a \"new comment\" notification (a task's assignee, a meeting's or page's creator), and anyone you @-mention in the comment is notified too, and on a task is auto-subscribed."
      },
      {
        "type": "h2",
        "text": "Personal surfaces"
      },
      {
        "type": "h3",
        "text": "Favorites"
      },
      {
        "type": "p",
        "text": "Favorites let you pin any entity, a page, a task, a project, a meeting, for quick access, and reorder your pins. It is your personal shortcut rail across everything in the org, separate from what anyone else has pinned."
      },
      {
        "type": "h2",
        "text": "Agent-native: pages over the MCP"
      },
      {
        "type": "p",
        "text": "Everything above is available to your agents too. Over the company-brain MCP, an agent operates pages the same way a member does, on the org's own key, scoped to the org, and subject to the same access checks. The note tools cover the full lifecycle:"
      },
      {
        "type": "ul",
        "items": [
          "`list_notes` and `get_note` to read pages, with optional project and text-search filters.",
          "`create_note` to write a new Markdown page (org- or project-scoped), with an idempotency key so a retried call does not create a duplicate.",
          "`update_note` to revise a page's title, body, or project. Each edit snapshots a version, exactly as it would from the editor.",
          "`delete_note`, which previews by default and only deletes when called with confirm set to true."
        ]
      },
      {
        "type": "p",
        "text": "Agents link work to pages as well. `create_task` and `update_task` accept a `source_note_id`, so a task an agent files from a page records that page as its source and shows up in the page's work items. And because a page reference is just a Markdown link, an agent can embed `@`-references inline in any body or comment it writes."
      },
      {
        "type": "p",
        "text": "To follow what is happening, `get_entity_activity` returns a single page's timeline (newest first) and `list_activity` returns the org-wide stream, so an agent can see who edited a page, when it was commented on, and what tasks came out of it, the same history you read in the feed."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Same surface, two kinds of member",
        "text": "Because people and agents read and write the same Markdown pages through the same access rules and the same activity log, a page an agent drafts is a page you can pick up and finish, and a page you write is one an agent can summarize, extract tasks from, or keep up to date. That shared surface is the point: Elliptic is Jira for your agents and your team at once."
      }
    ]
  },
  {
    "title": "Meetings",
    "slug": "meetings",
    "description": "How to use Meetings in Elliptic: import or paste transcripts, AI summaries with source anchoring, action items into tasks, templates and recipes, Ask one or all meetings, public sharing, Slack, and the agent-native MCP surface.",
    "blocks": [
      {
        "type": "h2",
        "text": "What a meeting is"
      },
      {
        "type": "p",
        "text": "A meeting in Elliptic is a conversation turned into a searchable, source-anchored record. Bring in a transcript and Elliptic writes the summary, links every line back to the exact moment it came from, turns action items into tasks, answers follow-up questions, and lets you share the result with people outside the workspace. A meeting can carry a **transcript**, your own **notes**, or both, and everything stays connected to the rest of your org so a task can point back to the meeting it was decided in."
      },
      {
        "type": "p",
        "text": "Every AI step here runs on your organization's own model key (your OpenAI or Anthropic key, stored once at the org level). Summaries, asking one meeting, asking across meetings, and guest questions on shared links all execute on that **BYOK** key, so the cost lands on your provider bill and nothing leaves your control."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The trust contract",
        "text": "Meetings speak the same trust contract as every other AI surface in Elliptic. A summary line never cites a transcript moment that does not exist, an asking-across answer tells you how many meetings it **consulted out of how many it scanned**, and a confidence band is derived conservatively from that evidence so thin evidence never reads as high confidence. A link you can click is a link you can trust."
      },
      {
        "type": "p",
        "text": "Open **Meetings** from the left sidebar of your workspace. You land on the meeting list, newest first, with three actions in the top-right: **Ask across meetings**, **New meeting**, and **Import meeting**."
      },
      {
        "type": "h2",
        "text": "Who can see a meeting"
      },
      {
        "type": "p",
        "text": "A meeting is either filed under a project or left org-wide. That single choice controls visibility:"
      },
      {
        "type": "ul",
        "items": [
          "**Org-wide meetings** (not filed under any project) are visible to everyone in the organization.",
          "**Project meetings** are visible to members of that project, plus org admins and owners.",
          "**Org admins and owners** see every meeting, filed or not."
        ]
      },
      {
        "type": "p",
        "text": "To attach a meeting to a project you must be a member of that project. Org admins and owners can attach to any project. This keeps project-specific conversations visible only to the people on that project, while general meetings stay open to the whole org."
      },
      {
        "type": "h3",
        "text": "The auto-filing suggestion"
      },
      {
        "type": "p",
        "text": "When a meeting is not filed yet, a suggestion banner appears at the top of its page. Elliptic scores the meeting against your active projects and proposes the best match with a confidence band (a 0-to-1 score under the hood). Accept it to file in one click, choose another active project from the picker, or dismiss the banner to keep the meeting org-wide. If there is not enough signal to guess, the banner skips the suggestion and simply asks you to pick a project. Filing matters because it sets who can see the meeting, and it is required before you can turn action items into tasks, since tasks live inside projects."
      },
      {
        "type": "h2",
        "text": "Getting a meeting into Elliptic"
      },
      {
        "type": "p",
        "text": "There are two ways to create a meeting: **import** an existing transcript, or start a **blank meeting** and write notes by hand."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "What \"recording\" means here",
        "text": "Elliptic does not record audio itself. It is the home for transcripts produced by a recorder like [Folio](https://folio.chele.bi) or any tool that exports text. Record or transcribe wherever you normally do, then import the result. The Paste transcript tab is the fastest path when you already have text."
      },
      {
        "type": "h3",
        "text": "Import a meeting (the main path)"
      },
      {
        "type": "p",
        "text": "Click **Import meeting** to open the importer. It has three tabs, so you can use whatever you already have on hand:"
      },
      {
        "type": "table",
        "headers": [
          "Source",
          "What it accepts",
          "What happens"
        ],
        "rows": [
          [
            "Paste transcript",
            "Plain text where lines look like `Alex: let us ship it`",
            "Each `Name: text` line becomes a speaker-attributed segment. Lines without a speaker are kept verbatim under an \"Unknown\" speaker, and the whole paste is also saved as the meeting's notes."
          ],
          [
            "Folio JSON",
            "The raw export from the [Folio](https://folio.chele.bi) recorder",
            "The JSON is validated in the browser before upload. Title, start time, attendees, and timestamped segments are imported as recorded, in one step."
          ],
          [
            "Upload file",
            "A `.txt`, `.md`, `.vtt`, or `.srt` transcript, or a `.json` Folio export",
            "Text files are parsed into speaker segments like a paste. A `.json` file is treated as a Folio export, and the title defaults to the file name."
          ]
        ]
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the importer",
            "text": "Click Import meeting on the Meetings page, or from the empty state if you have no meetings yet."
          },
          {
            "title": "Pick your source",
            "text": "Choose Paste transcript, Folio JSON, or Upload file depending on what you have."
          },
          {
            "title": "Add a title",
            "text": "For pasted text or an uploaded text transcript, give the meeting a title such as \"Weekly sync\". A Folio JSON paste carries its own title, and an uploaded .json export takes its title from the file."
          },
          {
            "title": "Import",
            "text": "Click Import meeting. Elliptic creates the meeting and its transcript segments together, then opens it."
          }
        ]
      },
      {
        "type": "h3",
        "text": "Start a blank meeting"
      },
      {
        "type": "p",
        "text": "Click **New meeting**, give it a title (\"Standup\", \"Customer call\", \"1:1\"), and press **Create meeting**. This opens an empty meeting with no transcript required. Use it for a live or ad-hoc session and type your own notes as you go. You can summarize and chat once there is something to work with, either a transcript or your notes."
      },
      {
        "type": "h3",
        "text": "Attendees"
      },
      {
        "type": "p",
        "text": "A meeting tracks two kinds of attendees: **members** of your organization (linked by their account) and **external** attendees recorded as plain names. Folio imports carry their attendee list across as external names. All member attendees must belong to the organization, and the source badge on the meeting tells you where it came from, **Folio** or **Manual**."
      },
      {
        "type": "h2",
        "text": "The meeting page"
      },
      {
        "type": "p",
        "text": "Opening a meeting shows its title, source badge, date, and duration. From here you work in two views: the **Document** tab and the **Transcript** tab. A **Split view** button puts the document and transcript side by side on a wide screen, and an **Ask** panel stays docked on the right."
      },
      {
        "type": "h3",
        "text": "The Document tab"
      },
      {
        "type": "p",
        "text": "The Document tab is the readable version of the meeting: the AI summary up top, and your own notes at the bottom. It is where you generate, refine, and adopt a summary, and where you turn action items into tasks."
      },
      {
        "type": "h3",
        "text": "The Transcript tab"
      },
      {
        "type": "p",
        "text": "The Transcript tab is the verbatim record: every segment with its speaker, timestamp, and text, in order. This is the ground truth that AI summary lines and chat citations link into, so you can always check a claim against what was actually said. It loads in pages for longer meetings with a Show more control. When you click a source link from a summary line or a chat citation, the transcript scrolls to that exact segment and highlights it."
      },
      {
        "type": "h3",
        "text": "Auto chapters"
      },
      {
        "type": "p",
        "text": "Longer transcripts get a **chapters** rail of 2 to 8 auto-generated topic jump points, each labelled from the start of its section and timestamped. Click one to jump down the transcript, and the active chapter highlights as you scroll. Chapters are derived from the transcript segments, so short meetings simply do not show them."
      },
      {
        "type": "h3",
        "text": "Split view"
      },
      {
        "type": "p",
        "text": "On a wide screen, click **Split view** to show the document and transcript at the same time, so you can read the summary on one side and verify against the raw transcript on the other without switching tabs. Click it again to exit."
      },
      {
        "type": "h3",
        "text": "Deleting a meeting"
      },
      {
        "type": "p",
        "text": "The meeting's creator or an org admin can delete a meeting. Deleting removes the meeting and its transcript together. Like every other meeting action, the deletion is recorded in the org activity log."
      },
      {
        "type": "h2",
        "text": "AI summaries"
      },
      {
        "type": "p",
        "text": "Click **Summarize** (or pick a template first, then Summarize) and Elliptic reads the transcript on your org's AI key and produces a structured summary. Each line is grounded: the model returns its summary as discrete lines, each tagged with a section and the transcript **segment ids** that support it. The result is grouped into labelled sections with counts:"
      },
      {
        "type": "ul",
        "items": [
          "**Decisions** — what was decided.",
          "**Action items** — what someone needs to do, each carrying an \"Action item\" badge.",
          "**Open questions** — what was raised but not resolved.",
          "**Key points** — the rest of the highlights."
        ]
      },
      {
        "type": "h3",
        "text": "Provenance and source anchoring"
      },
      {
        "type": "p",
        "text": "Every AI line is shown in dimmed text so you can tell at a glance what the model wrote versus what you wrote, since your own notes render in full contrast. Each line carries a small source marker. Hover it to see the speaker, the timestamp, and the exact transcript quote behind that line. Click it to jump straight to that moment in the Transcript tab. The header tells you how many lines are linked to the transcript (for example \"7 of 9 lines linked to transcript\"), and a line with no clear source is honestly flagged for you to verify manually instead of carrying a fake citation."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The anti-hallucination guarantee",
        "text": "When the summarizer returns its lines, Elliptic checks every cited segment id against the segments the transcript actually contains and **drops any id that does not exist**. So an AI line can never point at a source that was not really said. A link you can click is a link you can trust, and an unlinked line is flagged as something to check yourself."
      },
      {
        "type": "h3",
        "text": "Summary templates"
      },
      {
        "type": "p",
        "text": "Templates shape how the AI organizes a summary. Pick a template from the dropdown next to the Summarize button before you generate, and the summary is structured around that template's sections, in order. There are built-in templates for the common meeting shapes:"
      },
      {
        "type": "table",
        "headers": [
          "Built-in template",
          "Sections it organizes the summary into"
        ],
        "rows": [
          [
            "Freeform",
            "No fixed sections. The AI chooses the most natural structure. This is the default."
          ],
          [
            "One-on-One",
            "Wins, Blockers, Feedback, Action items"
          ],
          [
            "Stand-up",
            "Yesterday, Today, Blockers"
          ],
          [
            "Customer Call",
            "Context, Pain points, Requests, Next steps"
          ],
          [
            "Decision Meeting",
            "Options considered, Decision, Rationale, Owners"
          ],
          [
            "Retrospective",
            "What went well, What didn't, Action items"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Org admins can create **custom templates** with their own named sections and an optional extra instruction (a prompt scaffold) passed to the AI on top of the section list. A custom template might define sections like \"Risks, Mitigations, Owners\" plus an instruction such as \"Flag anything that needs legal review.\" Once saved, it appears in the same template dropdown for everyone in the org, under a name that must be unique. Admins can rename, re-section, or delete custom templates. The built-in ones are always available and cannot be removed."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Glossary-aware summaries",
        "text": "If your org has a Vocabulary glossary, its terms are passed to the model on every summarize and every ask, so the AI gets your product names, acronyms, and internal jargon right instead of guessing."
      },
      {
        "type": "h3",
        "text": "Re-enhance and summary history"
      },
      {
        "type": "ul",
        "items": [
          "**Re-enhance** — regenerate the AI summary from the transcript, optionally under a different template. Any summary lines you adopted and edited as your own are **preserved**, so re-running never wipes human work.",
          "**Summary history** — each run is saved with the model and provider it ran on, newest first, so you keep a record of how a summary evolved and on which model."
        ]
      },
      {
        "type": "h2",
        "text": "Your notes"
      },
      {
        "type": "p",
        "text": "The bottom block of the Document tab is always yours to write. Notes are source material, not AI output, and a blank meeting can be built entirely from notes."
      },
      {
        "type": "ul",
        "items": [
          "**Your notes** — click Edit to add or change notes in a rich editor. They render in full contrast and are clearly marked as yours.",
          "**Edit as your notes** — copy the AI summary down into your notes so you can edit it. Once it lives in your notes it reads as your own words, marked \"Edited by you\", and is no longer treated as raw AI output."
        ]
      },
      {
        "type": "h3",
        "text": "Turning action items into tasks"
      },
      {
        "type": "p",
        "text": "This is how a meeting stops being a document and starts driving work. Action items in the summary each get a **Task** button, and the section header has a **Create all tasks** button. Filing a single action item creates one task; Create all tasks creates one task per action item. Each task is created in the project's backlog with no priority, and it remembers which meeting it came from, so the work stays linked to its source."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Make sure the meeting has a project",
            "text": "Tasks live in projects. If the meeting is filed in a project, tasks go there automatically. If it is not, a \"File tasks in\" picker appears so you can choose a destination project for this session."
          },
          {
            "title": "Create one task, or all of them",
            "text": "Hover an action item and click Task to file just that one, or click Create all tasks in the Action items header to file every action item at once."
          },
          {
            "title": "Track it like any other task",
            "text": "The new tasks appear in that project's backlog, linked back to this meeting so you always know where the work came from."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "No project, no tasks",
        "text": "If the meeting has no project and you have not picked one, the Task buttons stay disabled with a tooltip telling you to set a project first. File the meeting, or pick a project in the \"File tasks in\" menu, to enable them."
      },
      {
        "type": "h2",
        "text": "Ask about one meeting"
      },
      {
        "type": "p",
        "text": "Every meeting has an **Ask** panel docked to the right (focus it instantly with ⌘J / Ctrl+J). Ask anything about what was discussed, decided, or assigned, and the AI answers strictly from that one transcript, on your org's key. Answers are ephemeral: they are not saved into the meeting document, and they are designed to stay grounded."
      },
      {
        "type": "ul",
        "items": [
          "**Preset prompts** — one-click starters like \"What did I miss?\", \"Summarize the last 5 minutes\", \"List decisions made\", and \"Suggest questions for me to ask\".",
          "**Citation chips** — when an answer is grounded, numbered source chips appear under it. Hover one to see the quote and timestamp, click it to jump to that segment in the transcript.",
          "**Honesty signal** — if the answer reads as low confidence (for example \"that was not discussed\"), it is flagged with a warning to verify directly. Grounded answers carry a quieter \"check the transcript to verify\" note.",
          "**Action lines to tasks** — if a line in the answer matches an action item in the summary, a Task button appears on that line so you can file it on the spot."
        ]
      },
      {
        "type": "h3",
        "text": "Recipes: saved transcript prompts"
      },
      {
        "type": "p",
        "text": "Type `/` in the Ask box to open the **recipes** menu. Recipes are saved instructions you run against the meeting, grounded in the transcript just like a normal question, so they will not invent facts the meeting does not contain. You can save your own, and any recipe you save becomes available on every meeting in the org."
      },
      {
        "type": "p",
        "text": "To save a recipe, type `/` followed by the instruction you want to keep, then choose \"Save … as a recipe\". It then appears in the `/` menu on every meeting in the org under that instruction's name. Running a recipe is recorded in the activity log."
      },
      {
        "type": "h2",
        "text": "Ask across all meetings"
      },
      {
        "type": "p",
        "text": "The single-meeting Ask panel answers about one conversation. **Ask across meetings** (top-right of the Meetings list) answers about the whole archive. Use it for questions like \"What did we decide about the API redesign this quarter?\" Elliptic scans your most recent visible meetings (up to 50), ranks them by how well they match your question, pulls the best-matching passages from the strongest few, and answers from those excerpts only."
      },
      {
        "type": "ul",
        "items": [
          "**Citations** — every answer lists the meetings and moments it drew from, as links you can open.",
          "**Coverage** — it tells you how many meetings it consulted out of how many it scanned, so you know how broad the answer is.",
          "**Scope filters** — narrow the search to a single project, or to a date range (From / To), before you ask.",
          "**Save as page** — turn any answer into a Note in one click, titled from your question, so a good cross-meeting synthesis becomes a permanent, shareable page.",
          "**Respects visibility** — it only ever searches meetings you are allowed to see."
        ]
      },
      {
        "type": "h2",
        "text": "Sharing and Slack"
      },
      {
        "type": "p",
        "text": "There are two ways to get a meeting out to people who are not looking at it inside Elliptic: a public share link, and a push to Slack."
      },
      {
        "type": "h3",
        "text": "Public share links with guest Ask"
      },
      {
        "type": "p",
        "text": "From the meeting page, the creator or an org admin can mint a public link that needs no login. Guests always get the summary, action items, and decisions. The full transcript is a separate, opt-in tier you toggle on with **Include transcript**. Guests also get an **Ask about this meeting** box that runs on your org's key, scoped only to what you shared, so they can never reach beyond this one meeting. Revoking the link cuts access instantly without deleting the record."
      },
      {
        "type": "h3",
        "text": "Post a summary to Slack"
      },
      {
        "type": "p",
        "text": "Once Slack is connected for your org, click **Send to Slack** on the meeting, pick a channel, and Elliptic posts a tidy message: the title, the latest summary, the action items as a bulleted list, and, when an active share exists, a link teammates can click to ask the AI about the meeting. If Slack is not connected yet, the dialog points you to your org settings to connect it first."
      },
      {
        "type": "h2",
        "text": "Agents work meetings too"
      },
      {
        "type": "p",
        "text": "Elliptic is Jira for your agents, so everything on this page is available to your AI members over the company-brain MCP, on the same org key. An agent can import a Folio recording (`import_folio_meeting`), summarize on a template (`summarize_meeting`), and read what a person reads: chapters (`list_meeting_chapters`), summaries with their model and provider (`list_meeting_summaries`), and transcript segments (`list_meeting_segments`)."
      },
      {
        "type": "p",
        "text": "From there an agent can ask one meeting (`ask_meeting`) or the whole archive with coverage and citations (`meetings_chat`), run a saved recipe (`run_meeting_recipe`), file action items as linked tasks (`create_task`), define templates and recipes (`create_meeting_template`, `create_meeting_recipe`), get a filing suggestion (`suggest_meeting_project`), mint a share (`create_meeting_share`), and post a recap to a channel (`post_meeting_to_slack`). The visibility rules, the BYOK key, the anti-hallucination guarantee, and the activity log all apply identically whether a person or an agent does the work."
      },
      {
        "type": "h2",
        "text": "Everything is logged"
      },
      {
        "type": "p",
        "text": "Meeting actions are recorded in your org's activity log: created, imported, updated, summarized, recipe runs, shared, share revoked, posted to Slack, and deleted. So you always have a trail of how a meeting was used and who used it, person or agent."
      }
    ]
  },
  {
    "title": "Activity, Calendar & Inbox",
    "slug": "activity-calendar-inbox",
    "description": "Follow the append-only activity feed and its live stream, triage your recipient-scoped inbox, catch up with an AI what-changed summary, tune email and push delivery, and plan team and personal events with an honest, source-linked pre-meeting brief.",
    "blocks": [
      {
        "type": "h2",
        "text": "Activity, Calendar & Inbox"
      },
      {
        "type": "p",
        "text": "Three surfaces keep everyone, human and agent, in sync on what is happening. The **Activity** feed is the org's running history: an append-only record of every meaningful change. The **Inbox** is your personal triage queue, scoped to you alone, where assignments, mentions, and closed loops land to be cleared fast. The **Calendar** holds team and personal events, with an honest, source-linked pre-meeting brief drawn from your own data. All three update live, so the feed, your boards, and the bell stay current on their own without a reload."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Agents read and act on the same surfaces",
        "text": "Elliptic is Jira for your agents. Everything on this page is also reachable by your AI members over the company-brain MCP, on your org's own key (BYOK): an agent can read the activity feed, manage calendar events, and pull a pre-meeting brief exactly the way you do in the app. The agent-native note at the end lists the tools."
      },
      {
        "type": "h2",
        "text": "Activity feed"
      },
      {
        "type": "p",
        "text": "The Activity feed is the org's running history, an append-only log of every meaningful change. Whenever someone creates or edits a note, moves a task, runs a meeting summary, comments, adds a member, schedules an event, or records a decision, an immutable activity event is written. Each event records who did it (the actor), what kind of thing changed (the entity type and id), the kind of change (the event type), the project it belongs to when relevant, and a small payload such as a title or snippet. Events are never edited or deleted, so the feed is a trustworthy audit trail. You reach it from **Activity** in the sidebar."
      },
      {
        "type": "h3",
        "text": "What the feed records"
      },
      {
        "type": "p",
        "text": "The feed threads the whole org into one timeline. The kinds of moments it captures include:"
      },
      {
        "type": "ul",
        "items": [
          "**Pages created and updated** across tasks, projects, notes, and meetings.",
          "**Lifecycle changes** like task status transitions and assignments.",
          "**Comments** posted on the things people are working on.",
          "**Decisions, blockers, approvals, and action items** surfaced from meetings and work.",
          "**Membership changes** when someone is added to the org or a project.",
          "**Calendar events** as they are created, updated, and deleted."
        ]
      },
      {
        "type": "h3",
        "text": "Reading the feed"
      },
      {
        "type": "p",
        "text": "The org feed shows the newest events first. The web view groups them by day, with friendly headers (Today, Yesterday, weekday names within the last week, then dated headers further back) and a count per day, so you can scan a day at a glance. Times are relative (\"5m\", \"2h\") with the exact timestamp on hover. High-signal moments such as decisions, blockers, approvals, comments, new notes, and new members render as richer cards with a headline and an excerpt, while routine churn stays compact, and a run of similar low-signal changes collapses into a single expandable line so the feed reads as signal, not noise."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Since your last visit",
        "text": "The feed remembers when you last looked. When you return, the page header tells you how many updates landed while you were away (\"3 updates since your last visit.\"), and a divider marks exactly where the new activity begins. This is tracked per-browser in local storage, so it follows your own reading, not the team's. Elliptic marks the feed seen as soon as it loads, so the next visit measures cleanly from there."
      },
      {
        "type": "h3",
        "text": "Per-entity history"
      },
      {
        "type": "p",
        "text": "Beyond the org-wide feed, every item carries its own history. The feed can be scoped to a single entity, for example one task, note, project, or meeting, and returns just that item's events, newest first. This is what powers the **Activity** tab you see on a task and the timeline on other items: open anything and the surrounding history is already there, an audit trail of how it reached its current state."
      },
      {
        "type": "h3",
        "text": "Jumping to the source"
      },
      {
        "type": "p",
        "text": "Activity rows link straight back to the item they describe. Rows for projects, notes, and meetings resolve to a real in-app link, so clicking the row (or the \"Open\" link on a richer card) jumps you to the source. The activity feed is also where notes get composed: you can drag an activity row straight into a note's editor and it lands as a clickable citation. That drag-and-drop flow is covered in full on the Notes page."
      },
      {
        "type": "h2",
        "text": "Live updates"
      },
      {
        "type": "p",
        "text": "The feed is genuinely live. Elliptic holds an open server-sent events stream to the org's activity stream, and the instant any activity is recorded anywhere in the org, the relevant views refresh on their own, with no reload and no polling. Because the stream also knows what kind of thing changed, it refreshes the matching area too: a new note nudges your notes list, a task change nudges your boards, and so on. You can leave the Activity page open as a true ambient view of the org."
      },
      {
        "type": "h3",
        "text": "How the stream works"
      },
      {
        "type": "p",
        "text": "When an activity event is written to the database, Postgres fires a NOTIFY on a dedicated channel. A listener bridges that into an in-process broker, which fans the event out to every connected client subscribed to that organization over its stream. Each client gets its own bounded queue, and if a client falls behind, the oldest events are dropped rather than blocking everyone else, so a slow tab never stalls the live feed for the rest of the org."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The same events also drive webhooks",
        "text": "Recording an activity event does double duty. Alongside the live in-app stream, the same write is captured to an event outbox that feeds the webhook dispatcher, so external systems can subscribe to your org's events. The activity log is the single source of truth behind both the live UI and any outbound integrations you wire up."
      },
      {
        "type": "h2",
        "text": "Inbox and notifications"
      },
      {
        "type": "p",
        "text": "The Inbox is your personal triage queue. It is recipient-scoped, meaning only your own notifications appear, never anyone else's. It collects the things that actually need your attention and is built to be cleared fast, from the keyboard. You reach it from **Inbox** in the sidebar, and the **All / Unread / Archived** tabs across the top control what you see."
      },
      {
        "type": "h3",
        "text": "What lands in your Inbox"
      },
      {
        "type": "p",
        "text": "Notifications are typed, and the type tells you why you got it:"
      },
      {
        "type": "table",
        "headers": [
          "Type",
          "When you get it"
        ],
        "rows": [
          [
            "Assigned",
            "A task is assigned to you."
          ],
          [
            "Mentioned",
            "Someone names you in a note or other content."
          ],
          [
            "Commented",
            "Someone comments on something you are following."
          ],
          [
            "Member added",
            "You are added to an organization or a project."
          ],
          [
            "Meeting action done",
            "A meeting action item tied to you is completed, closing the loop."
          ],
          [
            "Urgent",
            "A task you are assigned is marked urgent."
          ]
        ]
      },
      {
        "type": "p",
        "text": "You are never notified about your own actions, the system skips self-notification entirely. Each notification shows who triggered it (the actor's name, when one is recorded), a title, an optional snippet, and a relative time. \"Meeting action done\" notifications highlight that something finished and point back to the meeting they came from."
      },
      {
        "type": "h3",
        "text": "Unread, all, and archived"
      },
      {
        "type": "p",
        "text": "A notification counts as **unread** until you read it, as long as it has not been archived and is not currently snoozed. The header shows your live unread count, and the bell mirrors it. The three tabs filter the queue:"
      },
      {
        "type": "ul",
        "items": [
          "**Unread** shows only items you have not yet read, that are not archived, and that are not currently snoozed away.",
          "**All** shows your full notification history, read and unread together.",
          "**Archived** shows the items you have cleared out of the active queue but kept for reference."
        ]
      },
      {
        "type": "h3",
        "text": "Triage actions"
      },
      {
        "type": "p",
        "text": "Each notification can be acted on individually, and the whole queue can be cleared at once:"
      },
      {
        "type": "ul",
        "items": [
          "**Mark read** drops a single item out of your unread count. Opening a notification's source marks it read too.",
          "**Archive** removes it from your active queue but keeps it under the Archived tab.",
          "**Snooze** hides it for a while and brings it back when the snooze passes. The snooze time must be in the future, and the keyboard shortcut snoozes for an hour.",
          "**Mark all read** clears every unread notification in one action."
        ]
      },
      {
        "type": "h3",
        "text": "Triage from the keyboard"
      },
      {
        "type": "p",
        "text": "The Inbox is designed to be worked through without the mouse. Move the focus with j and k, then act on the focused item:"
      },
      {
        "type": "table",
        "headers": [
          "Key",
          "Action"
        ],
        "rows": [
          [
            "j",
            "Move to the next notification."
          ],
          [
            "k",
            "Move to the previous notification."
          ],
          [
            "Enter (↵)",
            "Open the notification's source and mark it read."
          ],
          [
            "e",
            "Archive the focused notification."
          ],
          [
            "h",
            "Snooze the focused notification for an hour."
          ],
          [
            "Shift + e",
            "Mark everything read."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Opening an item jumps you to the underlying thing: the project, meeting, note, or the task in its board. Unread items carry a small accent dot and bolder text so they are easy to spot as you move down the list."
      },
      {
        "type": "h3",
        "text": "The notification bell"
      },
      {
        "type": "p",
        "text": "You do not have to be on the Inbox page to triage. The bell in the top bar shows your unread count (as a number, or \"9+\" when there are more than nine) and opens a compact version of the Inbox in a popover. The same keyboard shortcuts work there too, so you can clear a few items and get straight back to what you were doing."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Pick where the app opens",
        "text": "From the Inbox header, the \"Open on\" control sets which page Elliptic lands you on when you enter the org: Projects, Inbox, My Tasks, or Activity. It is your personal preference, remembered in your browser. If triage is the first thing you do each morning, set it to Inbox."
      },
      {
        "type": "h2",
        "text": "Catch up"
      },
      {
        "type": "p",
        "text": "When unread has piled up, the **Catch up** panel at the top of the Inbox rolls everything into something you can clear in a few moves. Instead of a flat list, it groups your unread notifications by the entity they are about, so a task with five updates shows as one line, not five. Each group shows the entity's title, how many unread notifications it has, and the panel tells you your total unread and a breakdown by type."
      },
      {
        "type": "h3",
        "text": "Mark a whole entity read"
      },
      {
        "type": "p",
        "text": "Each catch-up group can be cleared in one action. Marking a group seen marks every unread notification for that entity as read at once, so you can acknowledge an entire thread of churn (all the updates on one task, one project, one note) without opening each notification. The panel tells you how many it marked."
      },
      {
        "type": "h3",
        "text": "AI: what changed since your last visit"
      },
      {
        "type": "p",
        "text": "For a project, Elliptic can write a short **what changed** digest from the project's recent activity. It reads the project's most recent activity events, groups related changes, and returns a few concise bullets summarizing what moved while you were away. When nothing has changed recently, it says exactly that rather than inventing activity. Like every AI feature in Elliptic, this summary runs on your organization's own model key, so the cost lands on your provider bill and your data stays under your control."
      },
      {
        "type": "h2",
        "text": "Delivery preferences"
      },
      {
        "type": "p",
        "text": "The in-app Inbox is always on, it is the canonical place your notifications live and cannot be turned off. What you can tune is the extra delivery on top of it: email for specific triggers, and push to your registered devices."
      },
      {
        "type": "h3",
        "text": "Email notification preferences"
      },
      {
        "type": "p",
        "text": "Email is governed by five per-trigger toggles, each of which you can set at two levels: a **workspace default** that applies across the org, and a **per-project override** that wins for one project when set. Every toggle defaults to on, so you receive email until you opt out. The triggers are:"
      },
      {
        "type": "table",
        "headers": [
          "Trigger",
          "Emails you when"
        ],
        "rows": [
          [
            "Property change",
            "A property of something you follow changes (for example priority or labels)."
          ],
          [
            "State change",
            "A task you follow moves to a new status."
          ],
          [
            "Completed",
            "Work you follow is completed."
          ],
          [
            "Comments",
            "Someone comments on something you follow."
          ],
          [
            "Mentions",
            "You are mentioned."
          ]
        ]
      },
      {
        "type": "p",
        "text": "When a trigger fires, Elliptic resolves your preference by checking the project override first; if you have set one for that project, it wins, otherwise the workspace default applies, and if you have set neither, email defaults to on. This lets you, say, keep email on everywhere but mute a noisy project, or stay quiet by default and turn email back on for one critical project. None of this affects the in-app Inbox, which always receives the notification."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Where preferences live",
        "text": "The workspace default and any per-project overrides are your own settings, scoped to you within the org. Setting a project override creates a row just for that project; clearing back to the default falls through to your workspace setting again."
      },
      {
        "type": "h3",
        "text": "Push notifications and devices"
      },
      {
        "type": "p",
        "text": "Elliptic can also send push notifications to your registered devices alongside the in-app Inbox. A device registers its push token (Expo push tokens are the default transport), tagged with its platform (iOS, Android, or web), and the registration is kept fresh as the device checks in. When a notification is created for you, Elliptic fans a push out to your registered devices on a best-effort basis: it runs alongside the in-app notification and never blocks it, and a failed push is logged and shrugged off rather than holding anything up. You can revoke a device's token to stop push to it. Push delivery is gated by a server setting, so it is active only when your deployment has it enabled."
      },
      {
        "type": "h2",
        "text": "Calendar and events"
      },
      {
        "type": "p",
        "text": "The Calendar puts team and personal events in one month grid so nothing slips through the week. You reach it from the sidebar. Move between months with the arrows, jump back with **Today**, and filter the view with the **All / Team / Personal** tabs."
      },
      {
        "type": "h3",
        "text": "Team events vs. personal events"
      },
      {
        "type": "p",
        "text": "Every event is either a shared **team** event or a private **personal** event, and that scope decides who sees it and who can change it."
      },
      {
        "type": "table",
        "headers": [
          "",
          "Team event",
          "Personal event"
        ],
        "rows": [
          [
            "Who sees it",
            "Every member of the org",
            "Only you, the owner"
          ],
          [
            "Color",
            "Accent dot and tint",
            "Muted grey dot and tint"
          ],
          [
            "Who can edit it",
            "The creator, or an org admin",
            "Only you, the owner"
          ],
          [
            "Use it for",
            "Sprint reviews, all-hands, shared deadlines",
            "Focus blocks, reminders, anything private"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Both kinds show in your calendar together, so your week is complete in one view. Other people's personal events are never visible to you, the Calendar simply does not return them, and asking for one directly comes back as not found."
      },
      {
        "type": "h3",
        "text": "Event fields"
      },
      {
        "type": "p",
        "text": "An event carries a small, predictable set of fields:"
      },
      {
        "type": "ul",
        "items": [
          "**Title** is required.",
          "**Description** and **location** are optional (a room, or a link).",
          "**Start** and **end** are timestamps; the end must not be before the start.",
          "**All day** flips the event off the clock so it spans the day without times.",
          "**Visibility** is Team or Personal, which sets the scope above.",
          "**Linked meeting** optionally ties the event to a meeting in the org."
        ]
      },
      {
        "type": "h3",
        "text": "Create and edit an event"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Start a new event",
            "text": "Click New event in the header, or click the date number on any day cell to seed that date. A dialog opens."
          },
          {
            "title": "Fill in the details",
            "text": "Give it a title (required). Choose Team or Personal visibility. Pick a date. Set start and end times, or flip the All day switch to skip times. Optionally add a location and a description."
          },
          {
            "title": "Save",
            "text": "Create event adds it to the grid immediately. The end must not be before the start before it lets you save."
          },
          {
            "title": "Edit or delete later",
            "text": "Click any event chip to reopen the dialog with its details filled in. Change anything and Save changes, or Delete to remove it. Editing a team event is limited to its creator or an admin; editing a personal event is limited to you, the owner."
          }
        ]
      },
      {
        "type": "p",
        "text": "Creating, updating, and deleting an event are all recorded in the activity feed, so calendar changes show up in the org's history like everything else."
      },
      {
        "type": "h3",
        "text": "Linking an event to a meeting"
      },
      {
        "type": "p",
        "text": "An event can point at a meeting in your org. The meeting has to belong to the organization, otherwise the link is refused. Once linked, the event chip shows a small document icon, and its popover offers an \"Open meeting\" link straight to the transcript and summary. The link also feeds the pre-meeting brief below: action items from that meeting's latest summary become part of the brief."
      },
      {
        "type": "h3",
        "text": "Reading the grid"
      },
      {
        "type": "ul",
        "items": [
          "**Today** is highlighted; weekends and days outside the current month are tinted so the month frame reads clearly.",
          "**Event chips** show the start time and title, color-coded by team or personal. Hover or focus a chip for a quick popover with the full time range, the team-or-personal scope, and the location.",
          "**Busy days** cap at three visible chips; a \"+N\" opener reveals the rest for that day.",
          "**Linked meetings** show a document icon and an \"Open meeting\" link in the popover."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Coming up",
        "text": "Above the grid, a \"Coming up\" card shows your single next upcoming event with a live countdown (\"in 2h 15m\") that ticks down on its own. Click it to open that event. When nothing is scheduled, it tells you so."
      },
      {
        "type": "h2",
        "text": "Pre-meeting brief"
      },
      {
        "type": "p",
        "text": "Open an event and Elliptic can generate a short **pre-meeting brief**, a handful of bullets of real context pulled from your own Elliptic data, each with a clickable source. It is deliberately honest: it only surfaces facts it can actually point to, and if there is nothing relevant, it returns an empty brief with zero confidence rather than inventing filler."
      },
      {
        "type": "p",
        "text": "The brief draws from three sources, in order:"
      },
      {
        "type": "ul",
        "items": [
          "**Open tasks** assigned to the event's owner, a few of the most recently updated, still-open ones, each labeled with its `KEY-number` identifier.",
          "**Follow-ups from a linked meeting**, the action items from the linked meeting's latest summary, when the event is tied to a meeting.",
          "**A related note**, the note whose text most overlaps with the event's title and description."
        ]
      },
      {
        "type": "p",
        "text": "Each bullet links to its source, so you can click straight through to the task, meeting, or note. The brief is capped at a few bullets and carries a confidence score that rises with how much real context it found, so a brief built from several genuine sources reads as more confident than one with a single thin match. When there is genuinely no prior context, the brief comes back empty with zero confidence instead of padding."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Honest by design",
        "text": "The brief never fabricates. Every bullet traces back to a real task, meeting, or note in your org, and a fresh event with nothing behind it produces no bullets at all. Treat an empty brief as a true signal that there is no prior context yet, not a failure."
      },
      {
        "type": "h2",
        "text": "Agent-native: the same surfaces over MCP"
      },
      {
        "type": "p",
        "text": "Agents are first-class members in Elliptic, and they operate these surfaces the same way you do, through the company-brain MCP, on your org's own key. An agent can follow what is happening, keep the calendar tidy, and prepare for meetings without a human relaying it. The relevant tools mirror the app:"
      },
      {
        "type": "table",
        "headers": [
          "Capability",
          "MCP tools"
        ],
        "rows": [
          [
            "Read activity",
            "`list_activity` for the org feed, `get_entity_activity` for one item's timeline."
          ],
          [
            "Triage notifications",
            "`list_notifications`, `unread_count`, `mark_notification_read`, `mark_all_notifications_read`, `archive_notification`, `snooze_notification`."
          ],
          [
            "Manage calendar events",
            "`list_calendar_events`, `create_calendar_event`, `update_calendar_event`, `delete_calendar_event`."
          ],
          [
            "Fetch a pre-meeting brief",
            "`get_event_brief` for an event's honest, source-linked brief."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Because agents act through the same recipient scoping, role checks, and activity recording as people, anything an agent does shows up in the feed with the agent named as the actor, and its calendar changes and event briefs behave exactly like yours. See the Company-brain MCP page for how to connect an agent and what each tool accepts."
      }
    ]
  },
  {
    "title": "Files, attachments & embeds",
    "slug": "files-attachments-embeds",
    "description": "How to upload files and images, attach them to comments, notes, tasks, projects, and AI chats, and turn pasted links into rich iframe players or link cards.",
    "blocks": [
      {
        "type": "h2",
        "text": "Files, attachments and embeds"
      },
      {
        "type": "p",
        "text": "Work is not just text. You attach the design file, the spreadsheet, the screenshot that explains the bug. Elliptic gives you two ways to bring outside content into your workspace: **file attachments**, which upload a real file into your organization's private storage, and **link embeds**, which turn a pasted URL into a playable video, an interactive frame, or a rich preview card. Both are org-scoped, both keep their context, and both are available to your agents on the same surfaces, since agents operate Elliptic the same way your team does."
      },
      {
        "type": "p",
        "text": "This page covers uploading files, attaching them to the things you work on, and embedding external links. Where it matters, it explains exactly what happens behind the scenes so you can reason about size limits, link lifetimes, and how self-hosted air-gapped mode changes embed behavior."
      },
      {
        "type": "h2",
        "text": "Uploading files"
      },
      {
        "type": "p",
        "text": "When you attach a file in Elliptic, the file does not pass through the application server. It goes straight from your browser to object storage over a temporary, signed URL. This keeps uploads fast and keeps large files off the API. The flow has three parts: **reserve**, **upload**, and **confirm**."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Reserve",
            "text": "Your browser calls `presign-upload` with the filename, content type, and the file size in bytes. The server validates that the content type is allowed and that the claimed size is within the limit, reserves a `StoredObject` record for the file, and hands back a **presigned PUT URL** valid for 15 minutes. The object is marked not-yet-uploaded at this point, with `is_uploaded` set to false."
          },
          {
            "title": "Upload",
            "text": "Your browser sends the file directly to storage with a single `PUT` to that presigned URL, using the same content type. The bytes never touch the Elliptic API. If the PUT fails, nothing is attached and the reserved record stays not-yet-uploaded."
          },
          {
            "title": "Confirm",
            "text": "Your browser calls `confirm` on the object. The server checks that the file actually landed in storage, reads back its real size, and **re-validates the size limit server-side**. If the landed file is over the limit it is deleted from storage and the upload is rejected. On success the object's true size and ETag are recorded and `is_uploaded` flips to true, which is what makes it downloadable and listable."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Why confirm re-checks the size",
        "text": "The size you send at reserve time is a claim from the browser. The presigned PUT is signed for a specific key, but a client could still push a larger file than it claimed. So `confirm` reads the object's real size back from storage and enforces the limit again. A file is never considered attached until it passes this server-side re-check."
      },
      {
        "type": "h3",
        "text": "Size and type limits"
      },
      {
        "type": "p",
        "text": "Uploads are size- and type-limited. The default maximum file size is **100 MB**. The size limit is enforced in three places: the web client checks it before starting an upload and shows a clear error, the server checks the claimed size at reserve time, and the server re-checks the real size at confirm time."
      },
      {
        "type": "p",
        "text": "Only an allowlist of content types may be uploaded. Out of the box, the allowed types are:"
      },
      {
        "type": "ul",
        "items": [
          "**Images**: PNG, JPEG, GIF, WebP, and SVG.",
          "**Documents**: PDF, plain text, CSV, Markdown, and JSON.",
          "**Office files**: Word (`.doc` and `.docx`), Excel (`.xlsx`), and PowerPoint (`.pptx`).",
          "**Archives**: ZIP."
        ]
      },
      {
        "type": "p",
        "text": "Anything uploaded with an `image/*` content type is recorded as an **image**, and everything else is recorded as a **file**. That distinction is what lets the interface show images as thumbnails and other files as document rows. A content type that is not on the allowlist is rejected at reserve time, before any upload begins."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Self-hosting note",
        "text": "The 100 MB ceiling and the allowed content type list are server settings (`file_size_limit_bytes` and `allowed_upload_content_types`). On the hosted instance at elliptic.sh they are the defaults above. If you self-host, you can adjust both in your API configuration. File storage must also be configured: if your instance has no object storage set up, uploads fail with \"Object storage is not configured\" and attachment features stay off."
      },
      {
        "type": "h2",
        "text": "Attaching anywhere"
      },
      {
        "type": "p",
        "text": "Every uploaded file belongs to your organization and is bound to one thing it is attached to. Elliptic uses a single polymorphic attachment model, so the same upload mechanism works across the product. A file can be attached to a:"
      },
      {
        "type": "ul",
        "items": [
          "**Comment**, so feedback can carry a screenshot or a document.",
          "**Note**, alongside the embeds in the note's attachment panel.",
          "**Task**, to keep a spec or asset next to the work.",
          "**Project**, for files that belong to the whole workstream.",
          "**AI chat**, so a conversation with your company brain can reference a file.",
          "**General**, when a file is not tied to anything in particular yet."
        ]
      },
      {
        "type": "p",
        "text": "Attachments are always scoped to your organization. A file uploaded in one org is never visible from another, and every list, download, and delete is checked against the org you are in."
      },
      {
        "type": "h3",
        "text": "Attaching on a note"
      },
      {
        "type": "p",
        "text": "Notes have a dedicated side panel for attachments and embeds. Use **Add** in the Attachments section to pick a file from your machine. It uploads with the three-step flow above, bound directly to the note, and appears in the attachment list when it finishes. The note panel enforces the same 100 MB limit on the client and shows a toast if you pick something larger."
      },
      {
        "type": "h3",
        "text": "Attaching on a comment"
      },
      {
        "type": "p",
        "text": "Comments attach files by **binding already-uploaded objects**. You upload first, which gives you object IDs, then you create the comment with those IDs in its `attachment_ids`. When the comment is created, Elliptic binds those objects to it. Binding only succeeds for objects you uploaded yourself, in the same org, that have finished uploading. This two-step pattern, upload then bind, is what lets you stage attachments before the comment exists."
      },
      {
        "type": "h3",
        "text": "Downloading"
      },
      {
        "type": "p",
        "text": "Files are private. You never get a permanent public link to them. Instead, when you open or download an attachment, Elliptic mints a fresh **short-lived presigned download link** that points straight at storage and expires in **5 minutes**. Opening the same file later mints a new link. A download is only possible once the file has finished uploading, so a half-finished upload cannot be fetched."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Links expire on purpose",
        "text": "Because download links are signed and short-lived, do not paste one into a chat or a doc expecting it to keep working. It is good for a few minutes, not forever. To give a teammate access, point them at the attachment inside Elliptic, where their own org membership generates a fresh link for them."
      },
      {
        "type": "h3",
        "text": "Deleting"
      },
      {
        "type": "p",
        "text": "Deleting an attachment removes both the stored file and its record. The object is deleted from storage and the database row is removed, so it stops appearing in lists and can no longer be downloaded. Deletion is a member-level action, the same level required to upload."
      },
      {
        "type": "h2",
        "text": "Rich link embeds"
      },
      {
        "type": "p",
        "text": "Not everything needs to be uploaded. A lot of your context already lives at a URL: a Loom walkthrough, a Figma frame, a Google Doc, a GitHub pull request. Elliptic turns a pasted link into one of two things, depending on the provider: an **iframe** you can watch or interact with inline, or a **link card** with a title, description, and thumbnail."
      },
      {
        "type": "h3",
        "text": "Players and cards"
      },
      {
        "type": "p",
        "text": "Some providers are recognized by their URL pattern and rendered in an iframe. These are:"
      },
      {
        "type": "table",
        "headers": [
          "Provider",
          "Renders as",
          "From a URL like"
        ],
        "rows": [
          [
            "YouTube",
            "Inline video player",
            "youtube.com/watch?v=… or youtu.be/…"
          ],
          [
            "Loom",
            "Inline video player",
            "loom.com/share/… or loom.com/embed/…"
          ],
          [
            "Vimeo",
            "Inline video player",
            "vimeo.com/…"
          ],
          [
            "Figma",
            "Inline interactive frame",
            "figma.com/file/…, /design/…, or /proto/…"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Other providers are rendered as a **link card** rather than an iframe. Elliptic recognizes Google Docs (`docs.google.com`), Notion (`notion.so`), Airtable (`airtable.com`), and GitHub (`github.com`) by their host, and any other http or https URL is treated as a generic link. For these, Elliptic fetches the page and reads its **Open Graph** tags to build the card: the `og:title`, `og:description`, and `og:image` become the card's title, description, and thumbnail. If a page has no Open Graph title, Elliptic falls back to its plain HTML `<title>`. When no preview metadata can be found, the card simply shows the provider name and a link out."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Iframes do not need a fetch",
        "text": "Iframe providers like YouTube, Loom, Vimeo, and Figma are resolved purely from the URL into an embed URL. Elliptic does not fetch the page to render them, so they work even when outbound page fetching is turned off. Open Graph cards are the only embeds that require fetching the target page."
      },
      {
        "type": "h3",
        "text": "Preview without saving"
      },
      {
        "type": "p",
        "text": "Before you commit an embed, you can preview what it will look like. The **unfurl** step resolves a URL's embed metadata, the provider, whether it is an iframe or a card, the iframe URL or the title, description, and thumbnail, without persisting anything. This is what powers the live preview as you paste. Only http and https URLs can be embedded, anything else is rejected. The page fetch during unfurl uses a short timeout, and if the fetch fails for any reason, the embed still resolves to a plain link card rather than erroring out."
      },
      {
        "type": "h3",
        "text": "Persisted note embeds"
      },
      {
        "type": "p",
        "text": "Notes can hold saved embeds. Paste a link into the Embeds section of a note's side panel and press Enter or **Add**, and Elliptic unfurls the URL and stores the result as a **note embed** with its metadata. Iframes render inline in a video-shaped frame, cards render with their thumbnail, title, and description and a link out to the original. The metadata is cached on the embed when it is created, so the note keeps showing the preview without re-fetching every time you open it. Remove an embed with the trash control on its card."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the note panel",
            "text": "In a note, find the Embeds section in the right-hand attachment panel."
          },
          {
            "title": "Paste a link",
            "text": "Paste a YouTube, Figma, Loom, or any other link into the input. A YouTube, Loom, Vimeo, or Figma link becomes an iframe, a Google Doc or GitHub link becomes a card."
          },
          {
            "title": "Add it",
            "text": "Press Enter or select Add. Elliptic unfurls the link, saves it to the note, and renders it inline."
          }
        ]
      },
      {
        "type": "h3",
        "text": "Air-gapped mode disables outbound fetch"
      },
      {
        "type": "p",
        "text": "Self-hosted instances can run in a zero-egress **air-gapped mode**. When air-gapped mode is enabled, Elliptic does not make outbound requests to fetch external pages, so Open Graph unfurling is turned off. In that mode, link cards resolve from the URL alone: you still get the provider and a link out, but there is no fetched title, description, or thumbnail. Iframes are unaffected, because they are built from the URL and never required a fetch in the first place. The hosted instance at elliptic.sh is not air-gapped, so it fetches Open Graph metadata normally."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Embeds load third-party content",
        "text": "An iframe or a card thumbnail is content served by the provider, YouTube, Loom, Figma, and so on, not by Elliptic. If your organization needs to guarantee no requests leave your network, that is exactly what air-gapped mode is for. With it off, viewing an embed will reach the provider to play the video or load the thumbnail."
      },
      {
        "type": "h2",
        "text": "How it fits together"
      },
      {
        "type": "p",
        "text": "Attachments and embeds are deliberately different tools. An **attachment** is a real file you own, stored privately in your org, reached only through short-lived signed links. An **embed** is a reference to something that lives elsewhere, rendered as an iframe or a card. Reach for an attachment when the artifact should live in Elliptic, and an embed when it already has a home and you just want it visible in context."
      },
      {
        "type": "ul",
        "items": [
          "**Attachments** are size- and type-limited, uploaded directly to storage, confirmed server-side, and downloadable only via 5-minute signed links.",
          "**Embeds** are iframes (YouTube, Loom, Vimeo, Figma) or Open Graph cards (Google Docs, Notion, Airtable, GitHub, and any link), previewable before saving and persistable on notes.",
          "Both are scoped to your organization, and both are surfaces your agents can use the same way your team does."
        ]
      }
    ]
  },
  {
    "title": "The Drive",
    "slug": "drive",
    "description": "The organization's Drive: upload documents once, file them in folders, and reference them from any task description, on the web, on the phone, and over the MCP.",
    "blocks": [
      {
        "type": "h2",
        "text": "One place for the documents"
      },
      {
        "type": "p",
        "text": "A **note** is a page you write inside Elliptic. A **Drive document** is a file you bring in whole: a countersigned contract, a floor plan, a supplier quote, a scanned form. The Drive is where those live, and it sits beside Notes for the same reason both exist — they are the reference material the work points at."
      },
      {
        "type": "p",
        "text": "The Drive is **scoped to the organization**, not to a project. A signed agreement is read by the legal task, the finance task and the renewal task, so binding it to one project would turn every other reference into a copy. Folders keep it navigable instead, and every member of the workspace reads the same document."
      },
      {
        "type": "h2",
        "text": "Uploading and filing"
      },
      {
        "type": "p",
        "text": "Open **Drive** in the sidebar. Use **Upload**, or drag files onto the list. Bytes go straight from your browser to object storage over a signed URL — the same reserve, upload, confirm path attachments use — and the document then appears in whichever folder you are standing in."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Make a folder",
            "text": "**New folder** opens it immediately. A folder is a path carried by the documents inside it rather than a record of its own, so it exists once the first document lands there and disappears when the last one leaves. Nothing can be orphaned in it."
          },
          {
            "title": "Upload into it",
            "text": "Whatever folder you are standing in is where the upload lands. Folders nest: open one and make another inside it."
          },
          {
            "title": "Rename, move, delete",
            "text": "Each row's menu opens the document, copies its reference link, renames it, moves it to another folder, or deletes it. Renaming the open folder moves every document beneath it in one step."
          }
        ]
      },
      {
        "type": "p",
        "text": "**Search reaches across the whole Drive**, not the open folder — the point of searching is that you do not know where the document sits. A hit shows the folder it came from."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Size and type limits",
        "text": "A document may be up to **100 MB**, and its content type must be on the upload allowlist (PDF, images, plain text, CSV, Markdown, JSON, Word, Excel, PowerPoint, ZIP). Both are server settings — see **Files, attachments & embeds** for the full list and the self-hosting knobs."
      },
      {
        "type": "h2",
        "text": "Referencing a document from a task"
      },
      {
        "type": "p",
        "text": "This is what the Drive is for. In a task description, a project description, a note or a comment, type `@` and start typing the document's name. Drive documents appear in the picker beside tasks and pages, tagged **Drive** and showing the folder they sit in. Pick one and it becomes a chip: a paperclip, the document's name, and a click that opens it."
      },
      {
        "type": "p",
        "text": "The chip is stored as ordinary Markdown, so it survives copy, paste, export and an agent reading the description back:"
      },
      {
        "type": "code",
        "lang": "markdown",
        "code": "Countersign and file the renewal.\n\nSigned agreement: [Acme MSA 2026](/__mention/file/019eda44-8c2d-7e3f-9a01-223344556677)\nSite layout: [Floor plan](/__mention/file/019eda44-9f01-7a2b-8c3d-445566778899)"
      },
      {
        "type": "p",
        "text": "Clicking the chip opens the Drive with that document selected, whether or not the reader has ever opened the folder it lives in. The document opens **inside Elliptic**: a panel that previews the file itself — an image, a PDF, or the first few thousand characters of a text file — above the folder, file name, size and the date it was added. Nothing navigates away to storage. **Download** takes the file when you want the file, and **Copy link** puts the Markdown above on your clipboard for pasting into another description. Word, Excel and PowerPoint have no in-browser preview, so those offer Download alone. Full detail on the format is in **References & mentions**."
      },
      {
        "type": "h2",
        "text": "On the phone"
      },
      {
        "type": "p",
        "text": "The **Notes** tab carries a paperclip that opens the Drive. Folders walk in and out with the platform's own back gesture, and search reaches across the workspace. Tapping a document opens it in a sheet that reaches the top of the screen: a PDF or an image renders in place, and a text, Markdown, CSV or JSON document is served as text by the API. Drag the sheet down, or tap the close button, and the screen you came from is right there. Tapping a document chip inside a task description opens the same sheet **over the task**, so a link written on a laptop opens on a phone without losing your place. Word, Excel and PowerPoint have no phone preview — open those from the web app."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Reading, not uploading",
        "text": "The phone browses and reads documents; uploading is a web action. The documents that belong in a Drive arrive on a computer, and what the phone needs is the other half — reading the document a task points at, wherever you happen to be, without being thrown out to a browser to do it."
      },
      {
        "type": "h2",
        "text": "For agents (over the MCP)"
      },
      {
        "type": "p",
        "text": "Agents get the same Drive through the **Company-Brain MCP**, under two scopes: `drive:read` to browse and read, `drive:write` to upload, rename, move and delete. Read is part of the baseline grant; write is not."
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_drive_files`",
            "Browse a folder or search the whole Drive. Every item carries a ready-made `mention` string to paste into a description."
          ],
          [
            "`list_drive_folders`",
            "The folders, with how many documents each holds."
          ],
          [
            "`get_drive_file`",
            "One document's metadata plus a signed URL that lives for 300 seconds."
          ],
          [
            "`read_drive_file`",
            "The text of a text, JSON or XML document, a window at a time. A PDF or Office file reports `readable: false` and hands back a URL instead."
          ],
          [
            "`view_drive_image`",
            "An image document's actual pixels, so the agent can see it inline."
          ],
          [
            "`create_drive_upload` → `register_drive_file`",
            "The upload path: reserve a slot, PUT the bytes to the signed URL, then file the result under a name and folder."
          ],
          [
            "`upload_drive_file_inline`",
            "A small document (256 KB hard cap) straight from base64."
          ],
          [
            "`update_drive_file`",
            "Rename, move, or re-describe a document."
          ],
          [
            "`delete_drive_file`",
            "Delete it. Previews first unless `confirm: true`."
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Why upload is two steps for an agent",
        "text": "MCP tool arguments are written by the model, so base64 content costs about 1.4 tokens per byte of file — a real document does not fit. `create_drive_upload` returns a signed `upload_url` and the exact headers to send; the agent PUTs the bytes with its own HTTP or shell, then calls `register_drive_file`. Keep `upload_drive_file_inline` for something genuinely small."
      },
      {
        "type": "h2",
        "text": "In short"
      },
      {
        "type": "ul",
        "items": [
          "The Drive is org-wide, so one document serves every project that references it.",
          "Folders are paths on the documents, so they need no upkeep and cannot strand anything.",
          "A document is referenced with `@` and stored as `[label](/__mention/file/<id>)`, which renders as a clickable chip on web and phone.",
          "Documents are up to 100 MB, private, and served only through short-lived signed links.",
          "Agents read the Drive under `drive:read` and write it under `drive:write`, with the same folders and the same links your team sees."
        ]
      }
    ]
  },
  {
    "title": "Dashboards & analytics",
    "slug": "dashboards-analytics",
    "description": "How Elliptic turns your work items into numbers, from built-in analytics rollups and forecasts to custom dashboards, PQL-filtered chart widgets, printable exports, and natural-language charts.",
    "blocks": [
      {
        "type": "h2",
        "text": "Two ways to see your numbers"
      },
      {
        "type": "p",
        "text": "Elliptic reads your work and turns it into numbers in two complementary ways. **Built-in analytics** are fixed, ready-made views over your tasks: an overview with totals and a completion rate, a flow view, a member workload table, a progress scatter, a throughput forecast, and pivot tables. **Dashboards** are yours to build: a grid of chart widgets you arrange, each pointed at a metric and a breakdown dimension, filtered with PQL, and shareable with your workspace. Both run on the same tasks and the same definitions, so the numbers line up."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "What gets counted",
        "text": "Every analytics view and every widget counts the same population: tasks in your organization that are **not in triage** and **not archived**. Triage items and archived items are always excluded, so the numbers reflect real, live work. Most views also accept an optional **project scope** to narrow down to a single project."
      },
      {
        "type": "p",
        "text": "Because agents are first-class members in Elliptic, the work they do shows up in exactly these numbers. An agent that picks up tasks, moves them across statuses, and closes them is reflected in your completion rate, your throughput forecast, and your member workload table the same way a human teammate is, on the org's own model key."
      },
      {
        "type": "h2",
        "text": "Built-in analytics"
      },
      {
        "type": "p",
        "text": "These are read-only rollups across your tasks. Each one answers a specific question, and every one accepts an optional `project_id` to scope it to a single project. Leave the scope off to see the whole organization."
      },
      {
        "type": "h3",
        "text": "Overview"
      },
      {
        "type": "p",
        "text": "The overview is the headline summary of your work. It returns the totals plus the breakdowns you would reach for first:"
      },
      {
        "type": "ul",
        "items": [
          "**Total**, the number of live (non-triage, non-archived) tasks in scope.",
          "**Completed**, the count of tasks whose status sits in the completed category.",
          "**Completion rate**, completed divided by total, rounded to four decimals (it is `0` when there is nothing in scope).",
          "**Overdue**, the count of tasks that have a due date in the past and are still open, meaning their status is neither completed nor cancelled.",
          "**By category**, a breakdown of every task across the status categories (backlog, unstarted, started, completed, cancelled).",
          "**By priority**, counts across each priority level.",
          "**By kind**, counts across each work-item kind."
        ]
      },
      {
        "type": "p",
        "text": "Each breakdown is keyed by every possible value, so a category, priority, or kind with no tasks shows up as `0` rather than disappearing. That keeps the shape of the chart stable as your data changes."
      },
      {
        "type": "h3",
        "text": "Flow analytics"
      },
      {
        "type": "p",
        "text": "Flow analytics is your bottleneck view. For each status category that holds open work it reports the **WIP** (the number of items sitting in that category) and the **average age in status** in days. Age is measured from the moment each item last entered its current status, taken from its most recent status-change in the activity history, falling back to its creation time when there is no such event. A category where work is piling up and aging is where your flow is stalling. The response also includes a **total WIP** across all open categories."
      },
      {
        "type": "h3",
        "text": "Member workload"
      },
      {
        "type": "p",
        "text": "Member workload is a per-assignee capacity view. For each member who has tasks assigned it reports three numbers: **open** (everything not yet completed), **in progress** (items in a started status), and **completed in the last 30 days**. Members are ranked by their open count, so whoever is carrying the most live work sits at the top. Unassigned tasks are not included here, since the view is about people. Agents that hold assignments appear in this table alongside humans."
      },
      {
        "type": "h3",
        "text": "Progress scatter"
      },
      {
        "type": "p",
        "text": "The progress scatter plots scope against completion so outliers stand out. You choose a dimension of either `cycle` or `module`, and for each one it returns the **scope** (how many tasks it contains), the **completed** count, and the **completion rate** (completed over scope, rounded to three decimals). Plotting scope on one axis and completion on the other makes the cycle or module that is overloaded, or the one that has quietly finished, easy to spot."
      },
      {
        "type": "h3",
        "text": "Throughput forecast"
      },
      {
        "type": "p",
        "text": "The throughput forecast looks at how much work your organization actually finishes each week and projects the next week forward. You pick a window between **2 and 26 weeks** (the default is 8). Weekly completed counts come from status-change-to-done events in the activity history, not from a status snapshot, so the trend reflects when work was really resolved."
      },
      {
        "type": "p",
        "text": "It returns the per-week **completed** series, an **average per week** across the whole window, and a **projected next week** computed as the average of the last four weeks (or fewer, if your window is shorter). The recent-weeks average is what makes the projection responsive to a recent change in pace rather than smearing it across the entire window."
      },
      {
        "type": "h3",
        "text": "Pivot tables"
      },
      {
        "type": "p",
        "text": "A pivot table cross-tabulates task counts across two dimensions at once. You choose a **row** dimension and a **column** dimension, each one of `status`, `priority`, `kind`, `assignee`, or `project` (the defaults are assignee by status). The result is a grid: the distinct row keys, the distinct column keys, and a cell count for every populated intersection. Tasks with no value for a dimension, such as an unassigned task, fall into an `unassigned` key rather than being dropped."
      },
      {
        "type": "table",
        "headers": [
          "View",
          "What it tells you",
          "Key options"
        ],
        "rows": [
          [
            "Overview",
            "Totals, completion rate, overdue, and breakdowns by category, priority, and kind",
            "project scope"
          ],
          [
            "Flow",
            "WIP and average age-in-status per open status category",
            "project scope"
          ],
          [
            "Workload",
            "Open, in-progress, and 30-day completed counts per assignee",
            "project scope"
          ],
          [
            "Scatter",
            "Scope vs completion per cycle or per module",
            "dimension (cycle or module), project scope"
          ],
          [
            "Forecast",
            "Weekly completed throughput plus a next-week projection",
            "weeks (2 to 26), project scope"
          ],
          [
            "Pivot",
            "Counts cross-tabulated across two dimensions",
            "row, col, project scope"
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Custom chart"
      },
      {
        "type": "p",
        "text": "Beyond the fixed views, there is an ad-hoc grouped aggregation: pick a **metric** and a **dimension** and get back grouped counts. The metric is one of `count` (every task), `done` (completed tasks only), or `open` (everything not completed). The dimension is one of `status`, `priority`, `kind`, `assignee`, or `project`. You can additionally filter to a single project, a single status, or a single priority before grouping. The result is a list of points, each a key and a value, sorted from largest to smallest. This same aggregation is what grounds the natural-language chart described below and what powers dashboard widgets."
      },
      {
        "type": "h3",
        "text": "CSV export"
      },
      {
        "type": "p",
        "text": "You can export the overview rollups as a long-format CSV for a spreadsheet or a report. The file has three columns, `metric`, `dimension`, and `value`, with one row per number: the total, completed, completion rate, and overdue scalars first, then one row per breakdown bucket across category, priority, and kind. The export honors the same project scope as the overview itself."
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# Download the analytics rollups for one org as CSV\ncurl -L -H \"Authorization: Bearer $TOKEN\" \\\n  \"https://api.elliptic.sh/api/v1/orgs/$ORG_ID/analytics/export.csv\" \\\n  -o analytics.csv"
      },
      {
        "type": "h2",
        "text": "Dashboards"
      },
      {
        "type": "p",
        "text": "A dashboard is a grid of chart widgets over your workspace metrics, assembled by you. Where the built-in views answer fixed questions, a dashboard lets you put the handful of numbers you care about side by side and keep them. Open **Dashboards** from the workspace, give a new one a name, and you have an empty grid ready for widgets."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Dashboards",
            "text": "Go to Dashboards in your workspace. You see your own dashboards plus any a teammate has published to the workspace, oldest first."
          },
          {
            "title": "Create one",
            "text": "Type a name into the new dashboard field and select Create. A fresh dashboard starts private to you and empty."
          },
          {
            "title": "Open it and add widgets",
            "text": "Select the dashboard to open it, then add chart widgets. Each widget is one chart you configure."
          }
        ]
      },
      {
        "type": "h3",
        "text": "Chart widgets"
      },
      {
        "type": "p",
        "text": "Each widget is a single chart with a title and a configuration. The configuration has four parts:"
      },
      {
        "type": "ul",
        "items": [
          "**Chart type**, one of `bar`, `line`, `area`, `donut`, `pie`, `number`, or `table`. A `number` widget shows a single headline figure, a `table` lays the breakdown out as rows, and the rest draw the grouped data as a graph.",
          "**Metric**, one of `count`, `done`, or `open`, exactly as in the custom chart: all tasks, completed only, or everything still open.",
          "**Breakdown dimension**, one of `status`, `priority`, `kind`, `assignee`, or `project`, the field the chart groups by.",
          "**Optional project scope**, a single project the widget restricts itself to. Leave it off and the widget spans the whole organization."
        ]
      },
      {
        "type": "p",
        "text": "When you save a widget, Elliptic cleans the configuration and falls back to sane defaults for anything missing or unrecognized: chart type `bar`, metric `count`, dimension `status`. A widget may also carry a **span** of one or two cells, so it can be twice as wide on the grid. New widgets are appended after the ones already there, and you can reorder them later by setting each widget's position."
      },
      {
        "type": "p",
        "text": "When the dashboard computes, each widget runs the same grouped aggregation as the custom chart and returns its points sorted from largest to smallest, tagged with the widget's chart type so the right visual is drawn. A widget with a project scope only counts that project's tasks."
      },
      {
        "type": "h2",
        "text": "Filtering a dashboard"
      },
      {
        "type": "p",
        "text": "A dashboard can carry a **PQL filter**, the same Projects Query Language used across Elliptic, written once on the dashboard. Every widget on the dashboard is narrowed by that filter before it counts, so you can build, say, a dashboard scoped to high-priority bugs and have all of its charts respect that without configuring each one. Set the filter when you create the dashboard or edit it later, and clear it to go back to counting everything."
      },
      {
        "type": "p",
        "text": "Filtering actually happens in three layers that stack with AND. A task has to pass all of them to be counted in a widget:"
      },
      {
        "type": "ol",
        "items": [
          "The **dashboard-level** PQL filter, applied to every widget.",
          "An optional **ephemeral filter** you pass at view time to narrow what you are looking at right now, without changing the saved dashboard.",
          "An optional **per-widget filter** stored in a single widget's configuration, so one chart can be tighter than the rest."
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Filters fail open",
        "text": "If a PQL filter is blank or does not parse, Elliptic treats it as no filter rather than erroring or showing nothing. A typo in a query gives you the unfiltered chart, not a broken dashboard, so you are never staring at an empty grid wondering what went wrong."
      },
      {
        "type": "h2",
        "text": "Sharing a dashboard"
      },
      {
        "type": "p",
        "text": "A dashboard starts **private** to you, its owner. You can publish it to the **workspace**, which makes it visible to every member of the organization, and you can switch it back to private at any time. Publishing changes who can read the dashboard, not who can change it: only the owner may edit a dashboard, add or remove its widgets, change its filter, or delete it. Everyone else sees a read-only copy."
      },
      {
        "type": "table",
        "headers": [
          "Visibility",
          "Who can see it",
          "Who can edit it"
        ],
        "rows": [
          [
            "Private",
            "Only you, the owner",
            "Only you"
          ],
          [
            "Workspace",
            "Every member of the organization",
            "Only you, the owner"
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Exporting for PDF"
      },
      {
        "type": "p",
        "text": "Any dashboard can be exported as a **printable HTML rendering** built for PDF. The export returns a self-contained HTML page of the dashboard's charts that opens the browser print dialog, so you get a real PDF via Save as PDF, which is the simplest way to drop a snapshot into a report or send it to someone outside Elliptic. Because it is rendered server-side from the live data, the exported page reflects the numbers at the moment you export it."
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# Fetch the printable HTML for a dashboard, then print to PDF in the browser\ncurl -L -H \"Authorization: Bearer $TOKEN\" \\\n  \"https://api.elliptic.sh/api/v1/orgs/$ORG_ID/dashboards/$DASHBOARD_ID/export.html\" \\\n  -o dashboard.html"
      },
      {
        "type": "h2",
        "text": "Ask for a chart"
      },
      {
        "type": "p",
        "text": "You do not have to know the metric and dimension up front. Describe the chart you want in plain language, like \"how is work split across priorities\" or \"how many open items per person\", and Elliptic turns that into a real chart. This is natural-language analytics, and it runs on your organization's own model key."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Describe the chart",
            "text": "Write a short request describing the chart you want, up to about 500 characters."
          },
          {
            "title": "Elliptic picks a spec",
            "text": "The model reads your request and chooses a metric (count, done, or open) and a breakdown dimension (status, priority, kind, assignee, or project), plus a title for the chart."
          },
          {
            "title": "Real numbers are computed",
            "text": "Elliptic then runs that exact metric and dimension through the same grouped aggregation as the custom chart and returns real, current counts. The model picks the shape of the question, it never invents the numbers."
          }
        ]
      },
      {
        "type": "p",
        "text": "The result comes back with the chosen title, the metric, the dimension, the data points, and the id of the AI run that produced it. If the model cannot produce a usable spec, Elliptic falls back to a safe default: a count of work items broken down by status, titled \"Work items by status\". So you always get a valid, grounded chart, never an error and never a blank."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The model chooses, the data is real",
        "text": "The only thing the language model decides is which of the supported metrics and dimensions best answers your question, plus a title. The counts themselves come straight from your live tasks through the same aggregation that powers built-in analytics and dashboard widgets. There is no room for a made-up figure."
      },
      {
        "type": "h2",
        "text": "AI credit usage"
      },
      {
        "type": "p",
        "text": "Asking for a chart, like every AI feature, draws on your organization's monthly AI credit pool. That pool is a **per-seat** allowance of **500 credits per billable seat per month**, and your usage is tracked as used, limit, remaining, and percent against it for the current calendar month."
      },
      {
        "type": "p",
        "text": "Credit accounting itself lives on the AI page rather than here, so that all AI spend is reported in one place. See [AI, Brain & Automations](/docs/ai-brain-automations) for how the per-seat pool is calculated, how to read your remaining balance, and how BYOK keeps the underlying model cost on your own key."
      }
    ]
  },
  {
    "title": "Customers (CRM-lite)",
    "slug": "customers-crm",
    "description": "Adversarial verification of the Customers (CRM-lite) docs page against the actual code.",
    "blocks": [
      {
        "type": "h2",
        "text": "Customers, a CRM-lite built into your workspace"
      },
      {
        "type": "p",
        "text": "**Customers** gives you a light customer record right inside Elliptic, so the demand side of your company lives next to the work that satisfies it. Each customer is a small account profile: who they are, how big they are, where they sit in your pipeline. Against any customer you capture **requests**, the feature and support asks that come in. And because Elliptic is Jira for your agents and your team, a request can be **linked to one or more work items**, so a customer ask connects straight to the tasks that deliver it. It is deliberately lightweight: enough to track who is asking for what and whether it is being built, without becoming a full sales CRM."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Where this lives",
        "text": "Open **Customers** from your workspace to see the list. Everything here is scoped to your organization, and the underlying API lives under `/orgs/{org_id}/customers`."
      },
      {
        "type": "h2",
        "text": "Customer accounts"
      },
      {
        "type": "p",
        "text": "A **customer** is an account profile for a company or person you serve. The only field a customer must have is a **name**. Everything else is optional, so you can add a record with nothing but a name and fill in the rest later as you learn more about the account."
      },
      {
        "type": "h3",
        "text": "The fields on a customer"
      },
      {
        "type": "p",
        "text": "A customer carries a small, focused set of fields:"
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "What it holds",
          "Notes"
        ],
        "rows": [
          [
            "Name",
            "The customer's name, for example Acme Inc.",
            "Required. 1 to 255 characters. This is the only field you must provide."
          ],
          [
            "Description",
            "Free text about the account: context, history, anything worth remembering.",
            "Optional, no length limit."
          ],
          [
            "Email",
            "A contact email address for the account.",
            "Optional, up to 320 characters."
          ],
          [
            "Website",
            "The customer's website URL.",
            "Optional, up to 500 characters. Stored as `website_url`."
          ],
          [
            "Employees",
            "Headcount, a rough sense of how big the company is.",
            "Optional whole number. Must be 0 or greater."
          ],
          [
            "Industry",
            "The sector the customer is in, for example Fintech or Healthcare.",
            "Optional, up to 120 characters."
          ],
          [
            "Stage",
            "A free-text pipeline stage of your own choosing.",
            "Optional, up to 120 characters. This is a free label, separate from contract status."
          ],
          [
            "Contract status",
            "Where the account sits in the contract lifecycle.",
            "Optional. One of prospect, trial, active, or churned (see below)."
          ],
          [
            "Revenue",
            "The revenue associated with the account.",
            "Optional decimal amount. Must be 0 or greater."
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Stage and contract status are two different things",
        "text": "**Contract status** is a fixed set of four lifecycle values that the product understands and color-codes. **Stage** is a free-text field you can use however you like, for example to mirror your own sales pipeline. They are independent, so you can set one, both, or neither."
      },
      {
        "type": "h3",
        "text": "Contract status"
      },
      {
        "type": "p",
        "text": "Contract status tracks where a customer sits in the contract lifecycle. It is one of four values, and it can also be left empty:"
      },
      {
        "type": "table",
        "headers": [
          "Status",
          "Meaning"
        ],
        "rows": [
          [
            "Prospect",
            "A potential customer you have not converted yet."
          ],
          [
            "Trial",
            "Currently trialing the product."
          ],
          [
            "Active",
            "A live, paying customer."
          ],
          [
            "Churned",
            "A customer who has left."
          ]
        ]
      },
      {
        "type": "p",
        "text": "In the Customers list each account shows a status dropdown so you can move it through the lifecycle in place, and the chosen status renders as a colored badge: prospect is neutral, trial is amber, active is green, and churned is red. A customer with no contract status set simply shows no badge."
      },
      {
        "type": "h3",
        "text": "Adding a customer"
      },
      {
        "type": "p",
        "text": "The fastest way to add a customer from the Customers page is by name. The new-customer field on that page takes just a name, which is all that is required, and you flesh out the rest of the fields afterward."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Customers",
            "text": "Go to the Customers page in your workspace. You see the search box, a New customer name field, and an Add button across the top, with the customer list below."
          },
          {
            "title": "Type a name",
            "text": "Enter the customer's name in the New customer name field, for example Acme Inc. Add stays disabled until the name has actual text in it."
          },
          {
            "title": "Click Add",
            "text": "The customer is created immediately and appears in the list. It starts with just a name, no contract status badge, and no requests yet."
          },
          {
            "title": "Fill in the rest",
            "text": "Set the contract status from the dropdown on the row. The remaining fields, description, email, website, employees, industry, stage, and revenue, are part of the customer record and are set through the API."
          }
        ]
      },
      {
        "type": "h3",
        "text": "Reading the customer list"
      },
      {
        "type": "p",
        "text": "Customers are listed alphabetically by name. Each row shows the name, a context line that combines the industry and email (whichever are set, joined with a dot), the employee count when present, the contract status dropdown and badge, a Requests button, and a delete control that appears on hover. When you have no customers at all, the list shows a simple No customers yet. placeholder."
      },
      {
        "type": "h3",
        "text": "Searching customers"
      },
      {
        "type": "p",
        "text": "The search box at the top of the page filters the list as you type. Search is matched against three fields, the customer **name**, **email**, and **industry**, so you can find an account by company name, by a contact address, or by sector. Matching is case-insensitive and partial, so typing `acme` finds Acme Inc., and `fin` finds every customer whose industry contains those letters. Clearing the box returns the full alphabetical list."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Search covers name, email, and industry, not everything",
        "text": "Description, stage, website, and the other fields are not part of the search match. If you want an account to be findable by a particular term, put that term in the name, email, or industry field."
      },
      {
        "type": "h3",
        "text": "Editing and deleting a customer"
      },
      {
        "type": "p",
        "text": "Every field on a customer can be edited after creation. From the list, the contract status dropdown updates the account in place. The other fields update through the customer's API record. Deleting a customer is permanent: use the delete control on the row (it appears when you hover) to remove the account. Deleting a customer also removes its requests, so the asks filed against it go with it."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Deleting a customer takes its requests with it",
        "text": "A customer's requests belong to that customer. When you delete the customer, every request filed against it is deleted too. If you only want to stop tracking an account, consider setting its contract status to **churned** instead of deleting it, so the history stays."
      },
      {
        "type": "h2",
        "text": "Customer requests"
      },
      {
        "type": "p",
        "text": "A **customer request** is a single ask from a customer: a feature they want, a support issue they raised, anything you want to track against that account. Requests are filed against one customer and live under it. The only required field is a **title**, so capturing an ask is as quick as typing one line."
      },
      {
        "type": "h3",
        "text": "What a request holds"
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "What it holds",
          "Notes"
        ],
        "rows": [
          [
            "Title",
            "A short description of the ask, for example SSO support.",
            "Required. 1 to 500 characters."
          ],
          [
            "Description",
            "Longer detail about the request.",
            "Optional, no length limit."
          ],
          [
            "Status",
            "Where the request stands.",
            "One of open, planned, in_progress, or closed. Defaults to open."
          ],
          [
            "Source URL",
            "A link back to where the ask came from, for example a support ticket or a message.",
            "Optional, up to 500 characters."
          ],
          [
            "Linked work items",
            "The tasks this request is tied to.",
            "Zero or more. See Tying requests to work below."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Request status"
      },
      {
        "type": "p",
        "text": "Each request moves through four statuses, so you can see at a glance whether an ask has been triaged and where it is headed:"
      },
      {
        "type": "table",
        "headers": [
          "Status",
          "Meaning"
        ],
        "rows": [
          [
            "Open",
            "Newly captured, not yet triaged. This is the default."
          ],
          [
            "Planned",
            "Acknowledged and slated to be worked on."
          ],
          [
            "In progress",
            "Actively being worked on. Stored as `in_progress`."
          ],
          [
            "Closed",
            "Resolved or otherwise finished."
          ]
        ]
      },
      {
        "type": "p",
        "text": "In the requests panel, status appears both as a dropdown you can change in place and as a colored badge: open is neutral, planned and in progress are amber, and closed is green. The `in_progress` value is shown to you as in progress, with the underscore replaced by a space."
      },
      {
        "type": "h3",
        "text": "Capturing a request"
      },
      {
        "type": "p",
        "text": "Requests are managed from a panel that expands under a customer, so the asks for an account stay attached to it."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open a customer's requests",
            "text": "On the Customers page, click the Requests button on a customer's row. A panel expands underneath that customer showing its requests. Clicking Requests again collapses it."
          },
          {
            "title": "Type the ask",
            "text": "In the New request field at the top of the panel, type a short title such as SSO support. The Add request button stays disabled until there is text."
          },
          {
            "title": "Add the request",
            "text": "Click Add request. The request is created against that customer with status open, and it appears in the list below. When the customer has none yet, the panel shows No requests yet."
          },
          {
            "title": "Triage it",
            "text": "Use the status dropdown on the request to move it from open to planned, in progress, or closed as you work through it. If the request came from somewhere, its source URL renders as a small external-link icon you can click to open the original."
          }
        ]
      },
      {
        "type": "p",
        "text": "Requests are listed newest first, so the most recent asks for a customer sit at the top. Each row shows the title, a linked-count badge when work items are attached, the source-link icon when a source URL is set, the status dropdown and badge, and a delete control on hover. Deleting a request removes it and its work-item links, the linked tasks themselves are untouched."
      },
      {
        "type": "h2",
        "text": "Tying requests to work"
      },
      {
        "type": "p",
        "text": "This is what makes Customers more than a list of asks. A request can be **linked to one or more work items**, the same tasks you track on your project boards. Linking is how customer demand connects to delivery: the ask on one side, the tasks that satisfy it on the other. A single request can fan out to several tasks, and the same task can serve more than one request."
      },
      {
        "type": "p",
        "text": "Each request carries a list of linked work-item ids, and the requests panel surfaces it as a **N linked** badge on the row, so you can see at a glance which asks are connected to actual work and which are still just captured. A request with nothing linked shows no badge."
      },
      {
        "type": "h3",
        "text": "How linking works"
      },
      {
        "type": "p",
        "text": "Linking and unlinking happen over the customers API, by associating a request with a task:"
      },
      {
        "type": "ul",
        "items": [
          "**Link a work item** to a request to record that this task helps deliver the ask. The task must belong to your organization, otherwise the link is rejected as a work item that cannot be found.",
          "**Unlink a work item** to remove that association. The request and the task both remain, only the link between them is removed.",
          "**Linking is idempotent.** Linking the same task to the same request twice does not create a duplicate, the existing link is left as is."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Links are an association, not a copy",
        "text": "A link is a pure connection between a request and a task. Linking does not change the task's status, assignee, or anything else, and unlinking or deleting a request never deletes the underlying tasks. Likewise, deleting a customer or a request removes its links but leaves the work items in place."
      },
      {
        "type": "h2",
        "text": "Putting it together"
      },
      {
        "type": "p",
        "text": "The flow is short and repeatable. Add a **customer** with a name, then enrich it with industry, contract status, and the rest. Capture each ask as a **request** under that customer and triage it through open, planned, in progress, and closed. As the work gets picked up, **link** the request to the tasks that deliver it, and watch the linked badge confirm that the ask is connected to real, in-flight work. That is the whole loop: who is asking, what they are asking for, and whether it is being built, all in one place next to the rest of your company's work."
      }
    ]
  },
  {
    "title": "AI & the assistant",
    "slug": "ai-byok-assistant",
    "description": "Connect your own model key, turn AI on or off, talk to your workspace with the Ask and Build assistant, search the web, use the AI writing helpers, and keep every call accountable in the run log and credit usage.",
    "blocks": [
      {
        "type": "h2",
        "text": "What this page covers"
      },
      {
        "type": "p",
        "text": "Elliptic is an agent-native work platform, Jira for your agents and your team, and AI runs through all of it. This page is about the AI you touch directly: the **model key** your org connects, the **on/off switch** that gates it, the **in-product assistant** you chat with, the **web search** and **writing helpers** it gives you, and the **accountability layer** (a run log and per-seat credits) that keeps every call honest. The same key and the same surfaces back the agents that operate Elliptic over the company-brain MCP, so everything here is one system, not a bolted-on chatbot."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The one rule, restated",
        "text": "Every AI feature in Elliptic runs on **your own model key**. There is no hidden Elliptic model and no shared, pooled inference bill. You connect a key once, and summaries, answers, the assistant, writing helpers, and agents all run on it, on your account, at your cost, with full token visibility. This is what **BYOK** (bring your own key) means everywhere in the product."
      },
      {
        "type": "h2",
        "text": "BYOK: connect your own model key"
      },
      {
        "type": "p",
        "text": "Before any AI feature works, an admin connects at least one **provider key** under **Settings → AI**. You paste the key, give it a name, and it becomes available to every AI surface in the org. Adding and managing keys is an **admin** (or owner) action."
      },
      {
        "type": "h3",
        "text": "Which providers you can connect"
      },
      {
        "type": "p",
        "text": "Elliptic speaks to several provider families, so you are not locked into one vendor or one hosting model:"
      },
      {
        "type": "table",
        "headers": [
          "Provider",
          "How it runs"
        ],
        "rows": [
          [
            "OpenAI",
            "Hosted OpenAI chat completions on your `sk-…` key."
          ],
          [
            "Anthropic",
            "Hosted Anthropic Messages API on your key."
          ],
          [
            "Ollama",
            "OpenAI-compatible. Point `base_url` at your Ollama endpoint to run open models locally or on your own box, no hosted vendor involved."
          ],
          [
            "Custom (OpenAI-compatible)",
            "Any endpoint that speaks the OpenAI chat-completions shape. Set `base_url` to your gateway or self-hosted server."
          ],
          [
            "AWS Bedrock",
            "Stored only. You can save Bedrock config (a region and a chat model), but execution (AWS SigV4 signing) is not implemented yet, so a Bedrock call returns \"AWS Bedrock execution is not yet supported.\""
          ]
        ]
      },
      {
        "type": "p",
        "text": "Ollama and custom providers route through the OpenAI-compatible path using the `base_url` you configure, which is how Elliptic supports local and self-hosted models for air-gapped or privacy-strict deployments."
      },
      {
        "type": "h3",
        "text": "Why BYOK matters"
      },
      {
        "type": "ul",
        "items": [
          "**Your data, your account.** Each call goes straight from Elliptic to your provider on your key. The model relationship is yours, never resold through a middleman.",
          "**Your cost, fully visible.** You pay your provider directly at their rates. Elliptic records the tokens of every call, so you see real usage, not a bundled markup.",
          "**Your choice of model.** Because the key is yours, you pick the exact model id, a fast cheap one for triage, a stronger one for summaries. Each key can pin its own default chat model.",
          "**Your hosting model.** Hosted OpenAI or Anthropic, a local Ollama box, or a custom OpenAI-compatible gateway, all behind the same BYOK contract."
        ]
      },
      {
        "type": "h3",
        "text": "Add a provider key"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open AI settings",
            "text": "Go to **Settings → AI**. The Provider keys card is where keys live. Adding and managing them is admin-only."
          },
          {
            "title": "Pick the provider",
            "text": "Choose OpenAI, Anthropic, Ollama, Custom, or Bedrock from the provider dropdown. For Ollama and Custom you also set an endpoint URL (the `base_url`) and an optional chat model; for Bedrock you set an AWS region and a chat model."
          },
          {
            "title": "Name the key",
            "text": "Give it a recognizable name like \"OpenAI – production\" or \"Anthropic – team\". Names must be unique within your org, so you cannot accidentally store two keys under the same label."
          },
          {
            "title": "Paste the secret",
            "text": "Paste the full API key. It is treated as a write-only secret, masked as a password field on entry and never echoed back."
          },
          {
            "title": "Save",
            "text": "Click **Add key**. Elliptic encrypts the secret, keeps only its last four characters for display, and logs the addition to your activity feed."
          }
        ]
      },
      {
        "type": "h3",
        "text": "Named keys, defaults, and how a key gets chosen"
      },
      {
        "type": "ul",
        "items": [
          "**Named keys.** A key has a friendly name, unique per org. You can hold several keys across providers and several within one provider, for example a production and a staging OpenAI key.",
          "**Default per provider.** Flip the **Default** switch on a key in the list to make it the one AI reaches for. There is one default **per provider**, and turning on a new default automatically clears the previous default for that same provider.",
          "**Resolution order.** When a feature needs a key it resolves in this order: an explicitly named key id, then the default for the requested provider, then the org's most recent default key overall. If nothing matches, you get a clear error (below).",
          "**Rename and re-default any time.** You can rename a key or change which one is default without downtime. The secret itself is immutable: to rotate a key, add the new one and delete the old."
        ]
      },
      {
        "type": "h3",
        "text": "Optional upstream validation"
      },
      {
        "type": "p",
        "text": "When a key is stored, Elliptic can validate it against the provider with a free models-list call. A `401 Unauthorized` means the provider rejected the key and the save is refused with \"Provider rejected this API key.\" A rate-limited response (`429`) still counts as valid, so a busy account is never wrongly turned away. Validation only applies to the hosted OpenAI and Anthropic endpoints. For Ollama, custom, and Bedrock keys it is skipped and the key is accepted on trust, since there is no universal way to check them."
      },
      {
        "type": "h3",
        "text": "Encryption and the last-4 display"
      },
      {
        "type": "p",
        "text": "A key is encrypted the moment it is saved, using AES-256-GCM authenticated encryption with the organization id bound in as additional authenticated data, so a key encrypted for one org cannot be decrypted in the context of another. The raw secret is write-only: after you save it, only the **last four characters** are ever shown again, and the plaintext cannot be read back out of Elliptic, not even by you. When a feature actually needs to call the provider, the key is decrypted **just in time** for that single call and never lingers in a readable form."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "No key, no AI",
        "text": "If your org has not connected any usable provider key, AI features return a clear error: \"No AI provider key configured for this organization.\" Connect a key under **Settings → AI** first and every downstream surface lights up."
      },
      {
        "type": "h2",
        "text": "Turning AI on or off"
      },
      {
        "type": "p",
        "text": "Independently of keys, an org has a single **workspace AI switch**, on the same **Settings → AI** page. It is on by default. An admin can flip it off to disable all AI at once, for a compliance freeze, an incident, or a period when you simply do not want any model calls leaving the workspace."
      },
      {
        "type": "p",
        "text": "When AI is switched off, every AI surface (the assistant, web search, writing helpers, estimates, charts, meeting summaries) refuses with the same clear error: \"AI is disabled for this workspace.\" Turn the switch back on and everything resumes, using whatever keys you already have stored. The switch gates execution only. It does not delete your keys, conversations, or run history."
      },
      {
        "type": "h2",
        "text": "The in-product assistant"
      },
      {
        "type": "p",
        "text": "The assistant is a chat surface that talks to your workspace. Open it and you get a list of **conversations** on the left and the active thread on the right. Every conversation has a **mode** that decides whether it can change anything: **Ask** is read-only, **Build** can take action. You start a new chat by clicking **Ask** or **Build**, and you can switch a conversation's mode later."
      },
      {
        "type": "h3",
        "text": "Ask: read-only questions about your work"
      },
      {
        "type": "p",
        "text": "An **Ask** conversation is a concise, practical helper for questions about your projects, work items, cycles, and pages. It is strictly read-only: it cannot change any data, and if you ask it to make a change it will tell you to switch the conversation to Build mode. Use it for \"what's the status of WEB-42\", \"summarize the open work in the Platform project\", or \"what did we decide about pricing\"."
      },
      {
        "type": "h3",
        "text": "Build: conversations that can act"
      },
      {
        "type": "p",
        "text": "A **Build** conversation helps you take actions on the workspace. In chat it describes the concrete change it would make, the entity, the fields, and the values, and it is told to respect your role and permissions. The actual mutation happens through the propose, confirm flow described below, never silently from a chat reply."
      },
      {
        "type": "h3",
        "text": "Living with your conversations"
      },
      {
        "type": "p",
        "text": "Conversations are persistent and personal to you. Each one supports the housekeeping you expect:"
      },
      {
        "type": "ul",
        "items": [
          "**Rename.** Double-click a conversation in the sidebar to give it a meaningful title.",
          "**Auto-title.** A fresh conversation starts as \"New chat\" and is automatically titled from your first message (trimmed to a short label), so your sidebar stays readable without any effort.",
          "**Pin.** Pin the conversations you return to. Pinned chats sort to the top of the list.",
          "**Search.** The search box filters your conversations by title, so a long history stays navigable.",
          "**Per-message feedback.** Every assistant reply has thumbs-up and thumbs-down. Your rating is stored on that message (and clicking the active thumb again clears it), giving you a record of which answers landed.",
          "**Delete.** Remove a conversation you no longer need. It and its messages are gone."
        ]
      },
      {
        "type": "h3",
        "text": "@-mentioning projects and work items"
      },
      {
        "type": "p",
        "text": "To ground a question in something specific, **@-mention** it. The mention picker lets you reference a **project** or drill into a project to reference an individual **work item** (task). Mentioned items are resolved into a context block the assistant sees, the project's name and key, or the work item's title, status, and a slice of its description, so its answer is anchored to the exact thing you pointed at rather than guessing from the name."
      },
      {
        "type": "h3",
        "text": "Attaching files"
      },
      {
        "type": "p",
        "text": "You can attach files to a message. Text files (plain text, JSON, and XML) are read and inlined into the assistant's context, truncated if very long, so it can actually reason over their contents. Binaries and images are referenced by filename so the assistant knows they exist and can talk about them, with full image vision pass-through noted as a follow-up. Attachments stay bound to the message you sent them with."
      },
      {
        "type": "h2",
        "text": "Build mode: propose, confirm, execute"
      },
      {
        "type": "p",
        "text": "Build mode never mutates your workspace from a chat reply alone. It follows a deliberate two-step path so you always see the exact change before it happens, and so the change runs with your own permissions."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Propose",
            "text": "In a Build conversation, type what you want and click **Propose**. The model turns your request into one structured action and returns a plain-language summary, for example \"Create work item “Fix the signup race condition” in WEB (priority: high)\". Nothing has changed yet."
          },
          {
            "title": "Confirm",
            "text": "Review the proposed action. If it is right, click **Confirm & run**. If not, discard it and rephrase."
          },
          {
            "title": "Execute as you",
            "text": "On confirm, Elliptic executes the action through the normal RBAC-checked service layer, **as you**. It is exactly as if you had created the item by hand: your role and permissions apply, and the new work item gets its real `KEY-number` identifier."
          }
        ]
      },
      {
        "type": "p",
        "text": "Today the supported Build action is **creating a work item**. The model picks the target project from the projects you actually have, snaps the priority to a valid level (none, low, medium, high, or urgent), and Elliptic re-validates the project on execution, so a proposal can never land work in a project that does not exist or that you cannot touch. If you have no projects yet, Build mode tells you to create one first."
      },
      {
        "type": "h3",
        "text": "Auto-run with batch review"
      },
      {
        "type": "p",
        "text": "A Build conversation has an optional **Auto-run** toggle. With it on, the **Run** button proposes and executes an action in a single step, skipping the separate confirm click for speed. Each auto-run action is still recorded and added to an on-screen **batch review** list, showing the identifier and summary of everything that was created, so a faster loop never means a blind one. Auto-run is only available in Build mode."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Confirm by default, auto-run when you trust it",
        "text": "Leave auto-run off while you are getting a feel for how the assistant interprets your requests, so you confirm each action. Turn it on for a focused session of bulk creation (\"add these eight tasks to OPS\") where reviewing the batch afterward is enough."
      },
      {
        "type": "h2",
        "text": "Web search from the assistant"
      },
      {
        "type": "p",
        "text": "The assistant can answer from the open web, not just your workspace. Type a question and click the **globe** to run a web search. Elliptic fetches results, then has your org's model synthesize a concise answer grounded **only** in those results, citing them inline as numbered references `[1]`, `[2]`, and so on. The sources are listed beneath the answer as clickable links, so every claim is traceable back to where it came from. If the search returns nothing useful, the assistant says so plainly instead of inventing an answer."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Disabled in air-gapped mode",
        "text": "Web search reaches an external service, so it is turned off when the instance is running in **air-gapped** (zero-egress) mode. In that case it refuses with \"Web search is disabled in air-gapped mode.\" Everything else (the assistant, writing helpers, estimates) keeps working on a local or self-hosted model key."
      },
      {
        "type": "h2",
        "text": "AI writing helpers"
      },
      {
        "type": "p",
        "text": "Beyond the assistant chat, AI shows up right inside your documents. There are three writing helpers, all running on your BYOK key. The mechanism lives here. The hands-on usage is on the Notes page, where these are surfaced as you write."
      },
      {
        "type": "h3",
        "text": "Page-anchored doc-assist"
      },
      {
        "type": "p",
        "text": "Doc-assist answers a question or carries out an instruction **anchored to a single page**, grounded on that page's live content. It reads the page title and current text (and an optional passage you have selected) as primary context, then answers or rewrites. When you ask it to write or edit, it returns clean Markdown ready to insert into the page, with no preamble and no code fences. Because it reads the page as it stands right now, it stays in sync with whatever you have typed, not a stale snapshot."
      },
      {
        "type": "h3",
        "text": "In-editor text transforms"
      },
      {
        "type": "p",
        "text": "Select text and apply a transform. The assistant returns only the rewritten text, with no commentary, so it drops straight back into your document. The available transforms are:"
      },
      {
        "type": "table",
        "headers": [
          "Transform",
          "What it does"
        ],
        "rows": [
          [
            "Rephrase",
            "Rewrites the selection for clarity and flow while preserving its meaning."
          ],
          [
            "Summarize",
            "Condenses the selection into a concise summary."
          ],
          [
            "Expand",
            "Adds detail, examples, and explanation to the selection."
          ],
          [
            "Fix grammar",
            "Corrects grammar, spelling, and punctuation while keeping your meaning and tone."
          ],
          [
            "Translate",
            "Translates the selection into a target language you choose."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "The generate block"
      },
      {
        "type": "p",
        "text": "The generate block creates new content from an instruction, optionally using the surrounding document as context. It behaves like a writing assistant embedded in the editor: you give it an instruction (\"draft a rollout plan in three phases\"), it can read the current page for context, and it returns clean Markdown ready to drop in, no preamble, no fences. Use it to start a section from a prompt rather than a blank cursor."
      },
      {
        "type": "h2",
        "text": "Targeted AI features"
      },
      {
        "type": "p",
        "text": "A few places in the product use AI for one specific, bounded job rather than open-ended chat."
      },
      {
        "type": "h3",
        "text": "AI estimate suggestion"
      },
      {
        "type": "p",
        "text": "On a work item, you can ask the AI to **suggest an estimate**. It reads the item's title and description and the project's configured estimate scale (smallest to largest), then picks the single most appropriate value and snaps it to a real point on that scale. The suggestion is always a value your project actually uses, never an off-scale number, so you can accept it with one click or adjust. If the model's answer cannot be matched to the scale, it returns no suggestion rather than a wrong one. A project with no estimate scale configured returns a clear error instead."
      },
      {
        "type": "h3",
        "text": "Natural language to PQL, and the AI chart"
      },
      {
        "type": "ul",
        "items": [
          "**Natural-language filtering** lets you describe the slice of work you want in plain English and have it translated into a PQL query. See the **Views** page for how to use it.",
          "**The AI chart** turns a question about your workspace metrics into a real chart: the model chooses a metric and a breakdown dimension from a fixed set, then Elliptic computes the chart from your actual data rather than letting the model invent numbers. See the **Dashboards** page for how to use it."
        ]
      },
      {
        "type": "h2",
        "text": "Glossary-aware meeting summaries"
      },
      {
        "type": "p",
        "text": "Your organization has its own vocabulary, product names, internal codenames, acronyms, terms of art, and Elliptic can teach the model that vocabulary so it uses your words instead of generic ones. Each term is a **term plus a definition**, managed under **Settings → Vocabulary** and described in detail on the **AI agents & automations** page."
      },
      {
        "type": "p",
        "text": "When a meeting is summarized, Elliptic assembles your terms into a compact glossary block and injects it into the model's system prompt, with an instruction to spell those terms exactly as written and to prefer them over similar-sounding alternatives. The result is that the model gets your internal names right, transcribes your codenames correctly, and stops \"helpfully\" normalizing your jargon into something generic. You maintain the term list in one place, and meeting summaries pick it up automatically."
      },
      {
        "type": "h2",
        "text": "Accountability: every call is on the record"
      },
      {
        "type": "p",
        "text": "Because the AI spends your money on your provider, Elliptic keeps an honest ledger of what it did. Two surfaces give you that visibility: a run log of individual calls, and a credit usage view of the monthly total. A guardrail on structured answers keeps the model from corrupting your data when it misbehaves."
      },
      {
        "type": "h3",
        "text": "The AI run audit log"
      },
      {
        "type": "p",
        "text": "Every outbound call to your provider creates an **AI run** recording exactly what happened. Admins review the full history, newest first, under the AI run list. It is your audit trail and your usage view in one place."
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "What it tells you"
        ],
        "rows": [
          [
            "Provider & model",
            "Which account and which exact model handled the call."
          ],
          [
            "Purpose",
            "What the call was for: a meeting **summarize**, or a **chat** call (which covers the assistant, web search, writing helpers, estimates, charts, proposed actions, and routing)."
          ],
          [
            "Input / output tokens",
            "What the call consumed, for tracking cost against your provider bill."
          ],
          [
            "Status",
            "Running, succeeded, or failed."
          ],
          [
            "Error",
            "The provider's message when a call fails (a bad key, a rate limit, an unknown model), kept for debugging."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Crucially, a **failed** call is still recorded, with its error preserved, so an erroring key or a misconfigured model never silently vanishes from the ledger. Whatever the AI does, including what your agents do, flows through this same log, so nothing is a black box."
      },
      {
        "type": "h3",
        "text": "Per-seat AI credit usage"
      },
      {
        "type": "p",
        "text": "Alongside the raw log, Elliptic tracks AI usage against a simple **per-seat credit pool**. Each AI run counts as one credit, and the org's monthly allowance is **500 credits per billable seat**. The usage view shows credits **used** this calendar month, the **limit** derived from your seat count, and the **remaining** balance (plus a percent-used figure), so you always know how much of the month's AI budget the org has spent. The pool resets at the start of each calendar month."
      },
      {
        "type": "h3",
        "text": "The structured-output guardrail"
      },
      {
        "type": "p",
        "text": "Several features ask the model for **structured** output rather than prose: a chart spec and a proposed Build action. For these, Elliptic asks the provider to constrain its reply to a strict schema (using OpenAI's JSON-schema response format or Anthropic's forced tool use) and then validates the reply with Pydantic. If the model still returns something off-spec, Elliptic **re-asks exactly once** with a pointed correction. If the second attempt is still invalid, the feature falls back to a safe default instead of acting on garbage: the AI chart drops to a sensible default chart, and a proposed action is refused with \"The assistant could not produce a valid action.\" A misbehaving model degrades gracefully. It never corrupts your data."
      },
      {
        "type": "h2",
        "text": "How it all fits together"
      },
      {
        "type": "ul",
        "items": [
          "**One key powers everything.** Connect an OpenAI, Anthropic, Ollama, or custom key once, and the assistant, web search, writing helpers, estimates, charts, and your agents all run on it, on your account, at your cost.",
          "**One switch gates it.** The workspace AI toggle turns all of it on or off in a single move, with a clear error when it is off.",
          "**The assistant respects your role.** Ask is read-only. Build proposes a change, you confirm, and it executes as you through normal permissions.",
          "**Answers are traceable.** Web search cites numbered sources, and the glossary keeps meeting summaries speaking your organization's language.",
          "**Nothing is a black box.** Every call lands in the run log with its model, purpose, tokens, and status, counts against a visible per-seat credit pool, and structured answers are validated with a single safe re-ask."
        ]
      }
    ]
  },
  {
    "title": "AI agents & automations",
    "slug": "ai-agents-automations",
    "description": "Define AI agents as first-class org members with their own identity, model, and budget, then automate triage with rules and skills, steer wording with a glossary, schedule scripts in the runner, route work with the insight engine, and catch up through the company brain.",
    "blocks": [
      {
        "type": "h2",
        "text": "What this page covers"
      },
      {
        "type": "p",
        "text": "Elliptic is Jira for your agents, and this page is about the agents themselves and everything they operate. It walks through **AI agents** (named members that live in your org), the **budgets** that bound what they cost, **triage automations** and **skills** that sort and route work, a **glossary** that fixes how AI features word things, the **agent runner** for scheduled scripts, the **insight engine** that suggests where work belongs, and the **company brain** that lets an agent catch up the way you would. Every AI feature runs on your org's own model key (**BYOK**), so the cost and the data stay with you."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The through-line: agents are members",
        "text": "An AI agent is not a chatbot bolted onto the side. It is a first-class member of your org. It has an identity (a name, a provider, a model, and a system prompt), it runs on your BYOK key, it can carry a spending budget, and it acts on the same surfaces as your people through the company-brain MCP. When an agent files a task, routes triage, or asks what changed since Friday, it is using the same tools a human member uses."
      },
      {
        "type": "h2",
        "text": "AI agents: first-class members of your org"
      },
      {
        "type": "p",
        "text": "An AI agent (internally an \"AI user\") is a named, persistent assistant your org defines. Unlike a throwaway chat, an agent has a stable identity made of four things: a **name**, a **provider**, an exact **model** id, and a **system prompt** that fixes how it behaves. Think \"Scribe\" who summarizes meetings in decision-first bullets, or \"Router\" who explains how inbound work should be filed. Agents are managed under **Settings → AI**, in the AI users card, and from any connected AI client over the brain."
      },
      {
        "type": "p",
        "text": "Because an agent is a member, it does not get a private side door. It runs on your org's BYOK key for its provider, and the actions it takes are the same member actions exposed over the company-brain MCP. Provider calls made through Elliptic (summaries, chat, and other AI features) are recorded as **AI runs** alongside the rest of your AI usage, each with its provider, model, token counts, and status. That is what makes the AI surface operable and accountable rather than a black box."
      },
      {
        "type": "h3",
        "text": "Create an agent"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open AI settings",
            "text": "Go to Settings → AI. The AI users card sits below your provider keys. Click New AI user."
          },
          {
            "title": "Name it",
            "text": "Give the agent a clear, recognizable name like Scribe. Names are unique within your org."
          },
          {
            "title": "Choose provider and model",
            "text": "Pick the provider, then type the exact model id you want it to run on (for example `gpt-5.2`). The agent runs on your org's BYOK key for that provider, so you pick whatever model your key can reach."
          },
          {
            "title": "Write the system prompt",
            "text": "Describe what the agent does and how it should behave, for example \"You summarize meetings for the team in tight, decision-first bullets.\" This instruction shapes every response the agent gives."
          },
          {
            "title": "Create",
            "text": "Save it. A new agent is active by default and immediately available to your org."
          }
        ]
      },
      {
        "type": "h3",
        "text": "Edit, pause, budget, delete"
      },
      {
        "type": "ul",
        "items": [
          "**Edit.** From Settings → AI, open an agent's Edit dialog to change its name, provider, model, or system prompt at any time, for example to move it onto a different model or sharpen its instructions.",
          "**Pause and resume.** Every agent carries an active flag. Pausing it stops it from acting without losing any configuration, and an inactive agent is clearly badged as **Inactive** in the AI users list. Over MCP this is `pause_ai_user` with `active=false` to pause or `active=true` to resume.",
          "**Budget.** Each agent can carry a monthly spend cap. Set it over MCP with `set_ai_user_budget` or through the AI users API.",
          "**Delete.** Remove an agent you no longer need. From the web UI, use the delete button on the agent. From a connected AI client, deletion is a deliberate two-step confirm: the first call previews the agent by name and returns `requires_confirmation`, and only a second call with `confirm=true` actually deletes it, so an agent is never wiped by accident."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Pausing and budgets live over the brain",
        "text": "The web AI users dialog covers an agent's identity (name, provider, model, system prompt) plus delete, and shows an Inactive badge when an agent is paused. The active flag and the monthly budget are set over the company-brain MCP (`pause_ai_user`, `set_ai_user_budget`) or the AI users API, so an agent or an admin tool can manage them programmatically."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Who can manage agents",
        "text": "Creating, editing, pausing, budgeting, and deleting agents is an elevated action. Over the API it requires admin, and over MCP it requires the `agents:write` scope. Read-only visibility (the `agents:read` scope) is baseline, so the whole team and any connected client can see the org's agents and their runs without being able to change them."
      },
      {
        "type": "h2",
        "text": "Agent budgets: a guardrail against a runaway bill"
      },
      {
        "type": "p",
        "text": "An automated member that runs on a schedule or reacts to events could, in principle, spend without limit. Each agent can therefore carry a **monthly spend cap**, set as a number of cents per month. It is a Paperclip-style guardrail that bounds how much an agent is allowed to cost on your provider bill, so an agent left running cannot quietly drain your account."
      },
      {
        "type": "p",
        "text": "Set a budget when you expect an agent to act unattended. Over the company-brain MCP this is `set_ai_user_budget`, which takes the agent and a `budget_monthly_cents` value, and like the rest of agent management it requires the `agents:write` scope."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Budgets and visibility go together",
        "text": "Because the cap is in cents and provider calls are logged as AI runs with their model, token counts, and status, you have both halves of the picture: the ceiling you set, and the running record of AI usage you can read with `list_agent_runs` (the `agents:read` scope)."
      },
      {
        "type": "h2",
        "text": "Triage automations: stop sorting the same work by hand"
      },
      {
        "type": "p",
        "text": "An automation is a saved rule that applies actions to a task on a trigger. Instead of dragging every inbound bug into the right project and tagging it, you write the rule once and it runs every time the trigger fires. Automations live under **Settings → Automations**, and creating or editing them is admin-only."
      },
      {
        "type": "h3",
        "text": "Triggers: when a rule fires"
      },
      {
        "type": "table",
        "headers": [
          "Trigger",
          "Fires when"
        ],
        "rows": [
          [
            "On triage entry",
            "A task lands in the triage queue (inbound work waiting to be sorted)"
          ],
          [
            "On status change",
            "A task moves to a new status on the board"
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Actions: what a rule does"
      },
      {
        "type": "table",
        "headers": [
          "Action",
          "Effect on the task"
        ],
        "rows": [
          [
            "Label",
            "Adds a label (resolved by name or id) that exists in your org, if it is not already on the task"
          ],
          [
            "Route",
            "Moves the task into a specific project and renumbers it for that project's sequence"
          ],
          [
            "Assign",
            "Sets the assignee to a project member who is not a workspace guest"
          ],
          [
            "Set priority",
            "Sets the task's priority to a valid level"
          ]
        ]
      },
      {
        "type": "p",
        "text": "A single rule can **chain several actions**, so one automation can label, route, and assign in one pass. Elliptic validates actions when you **save** the rule: a label that does not exist, a project outside your org, or an assign target who is not an org member (or who is a guest) is rejected up front, so a rule cannot silently misfire later. Every time a rule runs against a task, an `automation_applied` event is written to that task's activity, so you can always see exactly what touched it and why. Rules apply their actions defensively, so one bad action never breaks the rest of the pass."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Assign resolves at run time too",
        "text": "Saving an assign action checks that the target is a member of the org and not a guest. When the rule actually runs, Elliptic also confirms the target is a member of the task's project before setting the assignee, so an assign to someone outside the project is skipped rather than forced."
      },
      {
        "type": "h3",
        "text": "Build an automation"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Automations",
            "text": "Go to Settings → Automations and fill in the new rule form."
          },
          {
            "title": "Name and trigger",
            "text": "Name the rule (for example \"Route inbound bugs\") and pick its trigger: on triage entry or on status change."
          },
          {
            "title": "Add actions",
            "text": "Add one or more actions (label, route, assign, set priority) and fill in each value. Use Add action to chain more in the same rule."
          },
          {
            "title": "Save",
            "text": "Save the automation. New enabled rules start running on their trigger immediately."
          },
          {
            "title": "Toggle or remove later",
            "text": "Each rule has an enable switch and a delete button. Disable a rule to pause it without losing it, or delete it when it is no longer needed."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Automations over MCP",
        "text": "The same surface is available to connected clients. `list_automations`, `create_automation`, `update_automation`, and `delete_automation` (a two-step confirm) mirror the web exactly. Reads use the `automation:read` scope and changes use `automation:write`. This is how an agent can build and adjust the org's routing rules itself."
      },
      {
        "type": "h2",
        "text": "Skills: reusable automations you invoke on demand"
      },
      {
        "type": "p",
        "text": "Sometimes you do not want a rule to fire on every trigger. You want to apply it deliberately, to the one task in front of you. That is a **skill**. A skill is the exact same kind of rule, with the same label, route, assign, and set-priority actions, but flagged so it does **not** run on its trigger automatically. Instead it sits ready to be invoked by hand."
      },
      {
        "type": "p",
        "text": "When you are working the **Triage** queue, each item shows a **Skills** menu listing your enabled skills. Pick one and its actions apply to that task on the spot, with the run logged to the task's activity (a `skill_executed` event) just like an automatic rule. It is the fast way to say \"file this the way I always file these\" without dragging through menus. Only enabled skills appear in that menu, and when you have none the menu does not show at all."
      },
      {
        "type": "h3",
        "text": "Save a rule as a skill"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Build the rule",
            "text": "In Settings → Automations, create a rule with the actions you want to reuse."
          },
          {
            "title": "Flip the skill switch",
            "text": "Turn on \"Save as an invocable skill.\" The rule now carries a Skill badge and stops firing on its trigger."
          },
          {
            "title": "Run it from triage",
            "text": "Open the Triage queue, find the task, open its Skills menu, and pick the skill. Its actions apply to that task on the spot."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Running a skill from a client",
        "text": "A skill can also be invoked against a task without the queue. The API exposes `POST /automations/{id}/run` with the target task, and over MCP `run_automation` runs an enabled skill rule against a task (the `automation:write` scope). The rule must be flagged as a skill and enabled, or the call is rejected. That is how an agent applies your filing logic to a single item the same way you would from triage."
      },
      {
        "type": "h2",
        "text": "Glossary: the words every AI feature should use"
      },
      {
        "type": "p",
        "text": "Your org has names the rest of the world does not: a product codename, a client's acronym, a workflow term you coined. The **glossary** (Settings → Vocabulary) is a list of those terms, each with a short definition. Reading the glossary is open to any member, and adding, editing, or deleting terms is admin-only."
      },
      {
        "type": "p",
        "text": "The glossary is not just a reference page. Elliptic assembles your terms into a system-prompt block that is injected into AI calls, instructing the model to spell these terms exactly as written and to prefer them over similar-sounding alternatives. So once you define a term, AI features stop guessing and start using your vocabulary. The block is built from your terms in alphabetical order."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Vocabulary",
            "text": "Go to Settings → Vocabulary. You will see the term and definition list."
          },
          {
            "title": "Add a term",
            "text": "Enter the term (for example a product or client name) and what it means, then add it. Terms are unique within your org."
          },
          {
            "title": "Edit or remove",
            "text": "Edit a term's definition or delete it. Changes flow into the next AI call."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Glossary over MCP",
        "text": "The same vocabulary is reachable from connected clients: `list_vocabulary` reads the terms, and `create_term`, `update_term`, and `delete_term` (a two-step confirm) write them. Reads use the `vocabulary:read` scope and writes use `vocabulary:write`. An agent can keep your shared vocabulary current as the company's language evolves."
      },
      {
        "type": "h2",
        "text": "The agent runner: scheduled scripts"
      },
      {
        "type": "p",
        "text": "The **runner** (Settings → Runner) is where you author reusable scripts in **JavaScript or TypeScript** and, optionally, give each one a **cron schedule** so it runs on its own cadence. Each script has a name, the code, an optional description, and an enable flag. A cron schedule must be a standard five-field expression (minute, hour, day of month, month, weekday), and one with the wrong number of fields is rejected when you save."
      },
      {
        "type": "p",
        "text": "Open a script to review its **execution history**: the recent runs, each with a status (queued, running, succeeded, or failed), how it was triggered, and its output or error. This is your record of what a script did and when."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "The sandboxed runtime is not yet enabled",
        "text": "The isolated execution runtime that actually runs script code is a documented follow-up. For now, a manual trigger records a queued execution carrying the note that the sandboxed execution runtime is not yet enabled, rather than executing the code. You can still author scripts, set their schedules, and see them queue, so everything is ready for when the worker lands."
      },
      {
        "type": "h2",
        "text": "The insight engine: where work belongs and what relates to it"
      },
      {
        "type": "p",
        "text": "When a task or meeting needs filing, Elliptic can suggest the project it most likely belongs to. The routing is a **heuristic**: it scores your active projects by keyword overlap between the item's text and each project's name, key, and description. No model call is involved, which makes it fast and deterministic, and it is honest about thin evidence. When nothing matches, it returns a null suggestion with zero confidence rather than a confident guess; when something does, it returns the project, the route, and a **confidence** value derived from how far the best match leads the runner-up."
      },
      {
        "type": "p",
        "text": "A companion surface aggregates **related work** for a task: it scans your other tasks, meetings, and notes, scores each by overlap with the task's title and description, and returns the strongest few of each kind (a task's source meeting is weighed heavily). The result carries explicit **coverage**, reported as \"consulted N of M\", plus a **confidence** that reflects how strong and how many the matches were. Both surfaces are built so the UI can show how much was actually looked at rather than implying certainty it does not have."
      },
      {
        "type": "h2",
        "text": "The company brain: catch up the way a member would"
      },
      {
        "type": "p",
        "text": "The brain is a set of cross-project tools that answer the questions you actually have when you sit down: what changed, where did we leave off, and what is on my plate. They read live from your tasks, notes, and activity feed, and they are reachable from any AI client connected to your Elliptic brain over MCP. This is the surface an agent uses to orient itself before acting, exactly as a person would."
      },
      {
        "type": "h3",
        "text": "Catch me up: what changed"
      },
      {
        "type": "p",
        "text": "Ask for everything that has happened in the org since a point in time and the brain returns the recent activity that landed after that moment: tasks created and moved, notes written, meetings imported, and more. This is the \"I was out for three days, what did I miss\" answer, scoped to a timestamp you choose. Over MCP it is `brain_changes_since`, which takes an ISO-8601 timestamp and returns the matching events from the activity feed."
      },
      {
        "type": "h3",
        "text": "Resume: where did we leave off"
      },
      {
        "type": "p",
        "text": "Point the brain at a project and it reconstructs the state of play: the in-flight tasks (work actually started), the most recent notes, and the latest activity on that project. It is the fastest way to reload context on something you have not touched in a while, without scrolling a board. Over MCP it is `brain_resume`, which takes a project id."
      },
      {
        "type": "h3",
        "text": "Open threads: what's on my plate"
      },
      {
        "type": "p",
        "text": "Ask for your open threads and the brain pulls together the tasks assigned to you, the tasks you created, and your triage queue, filtering out anything already completed or cancelled. It is a single honest snapshot of your outstanding work across every project. Over MCP it is `brain_open_threads`. All three brain tools require only the baseline `brain:read` scope."
      },
      {
        "type": "table",
        "headers": [
          "You want to know",
          "The brain answers with",
          "MCP tool"
        ],
        "rows": [
          [
            "What did I miss since Friday?",
            "Recent changes in the org after a timestamp you give",
            "brain_changes_since"
          ],
          [
            "Where were we on this project?",
            "In-flight tasks, recent notes, and recent activity for that project",
            "brain_resume"
          ],
          [
            "What's on my plate right now?",
            "Your open assigned tasks, tasks you created, and your triage queue",
            "brain_open_threads"
          ]
        ]
      },
      {
        "type": "h2",
        "text": "Connecting and revoking agents"
      },
      {
        "type": "p",
        "text": "An agent reaches all of the above through Elliptic's connection layer, and you stay in control of what any connected app can touch. Access is granted in **narrow scopes**, not all-or-nothing. Read scopes like `brain:read`, `agents:read`, `automation:read`, and `vocabulary:read` are baseline. Most write scopes, including `automation:write` and `vocabulary:write`, are ordinary (granted but not flagged as sensitive), while a few like `agents:write` and `agents:keys` are elevated and granted deliberately. A client only ever gets the intersection of what it asked for and what you allowed."
      },
      {
        "type": "p",
        "text": "Manage all of this under **Settings → AI Access**, which lists every connected app and device, the org it is connected to, and exactly which scopes it holds, with a one-click Revoke that cuts a client off immediately. For the full OAuth scope catalog, the connection flow, and revocation in detail, see the [Company-Brain MCP](company-brain-mcp) page."
      },
      {
        "type": "h2",
        "text": "How the pieces fit together"
      },
      {
        "type": "ul",
        "items": [
          "**Agents are members.** A named identity, a provider, a model, a system prompt, an optional budget, and the full member surface over MCP. They run on your BYOK key.",
          "**Budgets bound the bill.** A monthly cap in cents keeps an unattended agent from running away with your provider spend.",
          "**Automations and skills remove busywork.** Rules sort triage and status changes on autopilot; skills apply your filing logic by hand in one click. Both are validated on save and logged on every run.",
          "**The glossary steers the words.** Define your org's terms once and AI features spell them your way.",
          "**The runner schedules scripts.** Author JS or TS, attach a cron, and review run history, with the sandboxed runtime arriving later.",
          "**The insight engine suggests, honestly.** Heuristic routing and related-work aggregation report coverage and confidence instead of guessing.",
          "**The brain reloads context.** Catch-me-up, resume, and open threads give an agent (or you) the same situational awareness a member walks in with."
        ]
      }
    ]
  },
  {
    "title": "The company-brain MCP",
    "slug": "company-brain-mcp",
    "description": "Connect Claude Code, Cursor, or any MCP client to operate your Elliptic workspace as first-class tools, with OAuth 2.1 consent, per-org or all-org tokens, per-domain scopes, and 144 tools across tasks, notes, meetings, calendar, comments, the org, the brain, and AI agents.",
    "blocks": [
      {
        "type": "h2",
        "text": "What the company-brain MCP is"
      },
      {
        "type": "p",
        "text": "The company-brain MCP is a first-party [Model Context Protocol](https://modelcontextprotocol.io) server built directly into the Elliptic API. It exposes your workspace as a set of callable tools, so an MCP client like Claude Code, Cursor, or Claude Desktop can read and write the same surfaces you use in the app: tasks and boards, projects, notes, meetings and transcripts, calendar, comments, notifications, teams, the org and its members, the activity feed, the brain, and your AI agents. This is the mechanism that makes Elliptic Jira for your agents. An agent connects as a member and operates the same surfaces you do, on the org's own model key."
      },
      {
        "type": "p",
        "text": "The server is a stateless FastMCP app mounted in the API at `/api/v1/mcp`. Each tool runs through a single boundary that authenticates the caller, enforces the tool's required scope, resolves the org context, and owns the database transaction, committing on success and rolling back on error. Every call is scoped to one organization and acts as the connecting user, so a tool can do exactly what that person can do in the web app, no more. Whatever an agent does through the MCP lands in activity the same way a person's action would."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Endpoint",
        "text": "On the hosted instance the server lives at `https://api.elliptic.sh/api/v1/mcp`, a single streamable-HTTP MCP endpoint. Self-hosting follows the same path under your own API origin (for local development, `http://localhost:8000/api/v1/mcp`). Authentication is OAuth 2.1, so there is nothing to copy and paste. The client walks you through a browser consent the first time."
      },
      {
        "type": "h2",
        "text": "Authenticating"
      },
      {
        "type": "p",
        "text": "The MCP is protected by OAuth 2.1, so you never hand a client a raw API key. The first time a client connects it discovers the authorization server, registers itself, and opens a Elliptic consent screen in your browser. You pick a workspace and approve a set of permissions, and the client receives a token scoped to that org and those permissions. From then on the client refreshes silently."
      },
      {
        "type": "ul",
        "items": [
          "**Dynamic client registration (RFC 7591).** Clients self-register at the registration endpoint as public PKCE clients. There is no manual app setup, and each registered client gets a generated `client_id`.",
          "**PKCE with S256.** The authorization-code flow requires a `code_challenge` using the `S256` method. Other methods and a missing challenge are rejected, which keeps the flow safe for public and native clients.",
          "**Canonical resource binding.** A `resource` parameter (RFC 8707) on the authorize and token requests must equal the canonical MCP resource URI, so a code minted for this server cannot be replayed against another audience. Clients that omit `resource` still work: the server binds the request to the canonical URI from its own metadata.",
          "**Short-lived codes, rotating refresh.** Authorization codes are single-use and expire after 60 seconds. Refresh tokens rotate on every use, and reusing a consumed refresh token revokes the whole token family.",
          "**Signed request envelope.** The validated authorize parameters are signed into a request id that the consent page cannot tamper with. It is valid for 10 minutes."
        ]
      },
      {
        "type": "h3",
        "text": "The consent screen"
      },
      {
        "type": "p",
        "text": "When a client connects you land on the Elliptic authorization page. You choose a single workspace, or pick all your organizations, then approve the permissions the client asked for. The screen groups permissions by domain. Every domain's read scope is the baseline set: it shows as **Always on** and stays checked and locked, so the standard read surface is always granted. Write and elevated permissions are an explicit, deliberate opt-in. Approve to connect, or decline to cancel. Either way you are returned to the client."
      },
      {
        "type": "p",
        "text": "Consent is the only place permissions are decided. The token the client receives carries exactly the scopes you ticked. A client that requested specific scopes caps the grant at its request; a client that requested none (most MCP clients) receives precisely your selection. Nothing the client does later can widen the grant without a fresh consent."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Root / Admin: one switch for trusted agents",
        "text": "At the top of the consent screen is a **Root / Admin** toggle. Turn it on and every permission is selected at once and locked so the individual rows cannot be unchecked, granting the agent the complete tool surface on your behalf. Use it when you want an agent to act as a full operator of your workspace. Leave it off and hand-pick scopes when you want to keep the agent narrow."
      },
      {
        "type": "h3",
        "text": "Personal access tokens (the no-OAuth path)"
      },
      {
        "type": "p",
        "text": "If you would rather not run the OAuth flow, the MCP also accepts a Elliptic personal access token directly. Send your `cos_pat_` token as a `Bearer` header (or as an `x-api-key` header) and the call is authenticated as you. A PAT is treated like a logged-in session: it acts across every organization you belong to and carries the full scope set, so use it only with clients you trust. OAuth with hand-picked scopes is the safer default for third-party agents."
      },
      {
        "type": "h2",
        "text": "Single-org versus all-orgs tokens"
      },
      {
        "type": "p",
        "text": "Your token comes in one of two shapes, decided at consent time."
      },
      {
        "type": "ul",
        "items": [
          "**Pinned single-org token.** You picked one workspace, so the token is bound to that org. Tools target it automatically, and if a call passes an `org_id` that does not match, it is rejected. This is the tightest setup: the agent can only ever touch the one workspace you chose.",
          "**Cross-org token (all organizations).** You picked all your organizations, so the token carries no fixed org. Every org-scoped tool then accepts an optional `org_id` to choose which workspace the call lands in. If you omit it, the call falls back to your earliest-joined org, so always pass `org_id` when you mean a specific one."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Membership is re-checked on every call",
        "text": "A cross-org token does not bake in your memberships. On each call Elliptic resolves your live membership of the target org with the same join the single-org path uses. If you have been removed from an org, the token loses access to it immediately, even though it still works for the orgs you remain in. Single-org tokens are re-verified the same way."
      },
      {
        "type": "h2",
        "text": "Discovery"
      },
      {
        "type": "p",
        "text": "Clients configure themselves from the endpoint alone, with no hand-entered URLs beyond the MCP address. Two mechanisms make that work."
      },
      {
        "type": "p",
        "text": "First, an unauthenticated request to the MCP endpoint returns a `401` with an RFC 9728 Bearer challenge. The `WWW-Authenticate` header points at the protected-resource metadata, so a client that hits the endpoint cold immediately learns where to begin the OAuth flow:"
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "WWW-Authenticate: Bearer resource_metadata=\"https://api.elliptic.sh/.well-known/oauth-protected-resource/api/v1/mcp\""
      },
      {
        "type": "p",
        "text": "Second, the well-known documents let the client finish self-configuring:"
      },
      {
        "type": "table",
        "headers": [
          "Document",
          "Path",
          "What it provides"
        ],
        "rows": [
          [
            "Protected-resource metadata (RFC 9728)",
            "`/.well-known/oauth-protected-resource/api/v1/mcp`",
            "The canonical resource URI, the authorization server to use, the supported scopes, and that bearer tokens go in the header."
          ],
          [
            "Authorization-server metadata (RFC 8414)",
            "`/.well-known/oauth-authorization-server`",
            "The issuer plus the authorize, token, registration, revocation, and JWKS endpoints, the supported grant and response types, and that `S256` PKCE is required."
          ],
          [
            "JWKS",
            "`/api/v1/oauth/jwks.json`",
            "The public keys used to verify MCP access tokens."
          ]
        ]
      },
      {
        "type": "h2",
        "text": "Installing"
      },
      {
        "type": "h3",
        "text": "Claude Code"
      },
      {
        "type": "p",
        "text": "Add the server, then run `/mcp` and complete the browser consent:"
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "claude mcp add --transport http elliptic https://api.elliptic.sh/api/v1/mcp\n\n# then, inside Claude Code:\n/mcp        # opens the Elliptic consent screen in your browser"
      },
      {
        "type": "h3",
        "text": "Cursor"
      },
      {
        "type": "p",
        "text": "Cursor speaks MCP natively. Add Elliptic to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per-project), then open Cursor Settings, MCP, and complete the browser consent on first use:"
      },
      {
        "type": "code",
        "lang": "json",
        "code": "{\n  \"mcpServers\": {\n    \"elliptic\": {\n      \"url\": \"https://api.elliptic.sh/api/v1/mcp\"\n    }\n  }\n}"
      },
      {
        "type": "p",
        "text": "The first tool call opens the same Elliptic OAuth consent in your browser. No API key is stored in the file."
      },
      {
        "type": "h3",
        "text": "Claude Desktop and other clients"
      },
      {
        "type": "p",
        "text": "Point any MCP client at the endpoint. Clients that do not yet speak OAuth-protected HTTP natively can bridge through `mcp-remote`:"
      },
      {
        "type": "code",
        "lang": "json",
        "code": "{\n  \"mcpServers\": {\n    \"elliptic\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"mcp-remote\", \"https://api.elliptic.sh/api/v1/mcp\"]\n    }\n  }\n}"
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "First connection",
        "text": "The first call triggers the OAuth flow and opens the consent screen in your browser. After you approve, the client stores the token and reconnects automatically. If you self-host, swap the URL for your own API origin."
      },
      {
        "type": "h2",
        "text": "The scope catalog"
      },
      {
        "type": "p",
        "text": "Permissions are expressed as scopes, grouped by domain. Most domains have a read scope and a write scope: approving the read scope lets the agent see that data, and the write scope lets it create, edit, and delete. The read scope of every domain is the baseline set, so it is always on at consent and cannot be unchecked, which means the standard read surface is granted by default. A handful of scopes are flagged **Elevated** and stay unchecked until you opt in deliberately. The **Root / Admin** toggle selects everything at once."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "The scope catalog is broader than the MCP tool surface",
        "text": "The consent catalog lists every grantable scope Elliptic knows about, but not every scope has an MCP tool behind it yet. The **Connected sources** domain (`sources:read`, `sources:write`, `sources:manage`) appears in the catalog and on the consent screen, yet no MCP tool currently requires it, so approving it grants nothing callable over the MCP today. Everything else in the table below is backed by real tools."
      },
      {
        "type": "table",
        "headers": [
          "Domain",
          "Scopes",
          "MCP tools?"
        ],
        "rows": [
          [
            "Tasks",
            "`tasks:read`, `tasks:write`",
            "Yes. Also covers projects, boards, sub-tasks, relations, labels, and triage."
          ],
          [
            "Notes",
            "`notes:read`, `notes:write`",
            "Yes."
          ],
          [
            "Meetings",
            "`meetings:read`, `meetings:write`",
            "Yes. Transcripts, summaries, chapters, share links, templates, and recipes."
          ],
          [
            "Calendar",
            "`events:read`, `events:write`",
            "Yes. Events and briefs."
          ],
          [
            "Comments",
            "`comments:read`, `comments:write`",
            "Yes. Comments and attachments across tasks, notes, and meetings."
          ],
          [
            "Notifications",
            "`notifications:read`, `notifications:write`",
            "Yes."
          ],
          [
            "Activity",
            "`activity:read`",
            "Yes. The feed and per-entity history."
          ],
          [
            "Brain",
            "`brain:read`",
            "Yes. Catch-me-up, open threads, and resume points."
          ],
          [
            "Agents",
            "`agents:read`, `agents:write` (Elevated), `agents:keys` (Elevated)",
            "Yes. AI users, runs, budgets, and provider keys."
          ],
          [
            "Teams",
            "`teams:read`, `teams:write`",
            "Yes."
          ],
          [
            "Views",
            "`views:read`, `views:write`",
            "Yes. Saved board views."
          ],
          [
            "Vocabulary",
            "`vocabulary:read`, `vocabulary:write`",
            "Yes. The org glossary."
          ],
          [
            "Workflow",
            "`workflow:read`, `workflow:write`",
            "Yes. Custom workflow statuses."
          ],
          [
            "Automation",
            "`automation:read`, `automation:write`",
            "Yes. Automation rules, including running them."
          ],
          [
            "Integrations",
            "`integrations:read`, `integrations:manage` (Elevated)",
            "Yes. Slack connection, channels, and posting."
          ],
          [
            "Profile",
            "`profile:read`, `profile:write`",
            "Yes. Your own user profile."
          ],
          [
            "Organization",
            "`org:read`, `org:manage` (Elevated), `org:create` (Elevated)",
            "Yes. Org details, members, roles, invites, creating orgs (`org:create`), and updating or deleting them (`org:manage`)."
          ],
          [
            "All organizations",
            "`orgs:all` (Elevated)",
            "Not a per-tool scope. Granted by the all-organizations consent option and enforced as the token's cross-org reach."
          ],
          [
            "Connected sources",
            "`sources:read`, `sources:write`, `sources:manage` (Elevated)",
            "No. In the catalog but with no MCP tool behind it yet."
          ]
        ]
      },
      {
        "type": "p",
        "text": "The elevated scopes, the ones that stay unchecked until you opt in, are `agents:write`, `agents:keys`, `org:manage`, `org:create`, `integrations:manage`, `sources:manage`, and `orgs:all`. Note that there is no separate delete scope: deleting an event uses `events:write`, deleting a note uses `notes:write`, and so on. Write is enough to remove what write can create."
      },
      {
        "type": "h2",
        "text": "The tool catalog"
      },
      {
        "type": "p",
        "text": "The MCP exposes 144 tools, grouped below by domain. This is most of the member surface, but it is not literal parity with every screen. There are no MCP tools for connected sources or GitHub linking, and there are no cycle, milestone, or PQL-style query tools. Read tools list and fetch, write tools create, edit, move, and delete. Two cross-cutting conventions apply throughout: many creates accept an optional `idempotency_key` so a retried call never duplicates work, and the most destructive deletes take a `confirm` flag (call once with `confirm=false` to preview, again with `confirm=true` to apply)."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Targeting an organization",
        "text": "Org-scoped tools accept an optional `org_id`. With a pinned single-org token you omit it and the call uses the token's workspace. With an all-organizations token, pass `org_id` to choose which workspace a call acts on. A couple of user-level tools (`create_org`, `list_my_orgs`) act on you across orgs and need no org context."
      },
      {
        "type": "h3",
        "text": "Tasks, boards, labels, and triage"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_project_tasks`, `get_task`",
            "List a project's tasks with board-style filters, or fetch one task with its identifier, counts, and blocked state."
          ],
          [
            "`create_task`, `create_tasks_batch`",
            "Create a task (sub-tasks, bug kind, severity, mentions, relations), or several at once from a list."
          ],
          [
            "`update_task`, `transition_task_status`",
            "Edit fields, or move a task to a new workflow status."
          ],
          [
            "`delete_task`",
            "Delete a task (confirm-gated)."
          ],
          [
            "`get_task_board`, `list_my_tasks`, `list_subtasks`",
            "Read the board grouped into status columns, your assigned / created / subscribed / recent tasks, and a task's sub-tasks."
          ],
          [
            "`subscribe_task`, `unsubscribe_task`",
            "Follow or unfollow a task."
          ],
          [
            "`list_task_relations`, `add_task_relation`, `remove_task_relation`",
            "List, link, or unlink blocking / blocked-by / related tasks."
          ],
          [
            "`list_labels`, `create_label`, `attach_task_labels`, `detach_task_labels`, `delete_label`",
            "Manage org labels and apply them to tasks (`create_label` is get-or-create; `delete_label` is confirm-gated)."
          ],
          [
            "`list_triage`, `accept_triage_task`, `decline_triage_task`",
            "Read incoming triage items and route them."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Projects"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_projects`, `get_project`, `create_project`, `update_project`",
            "Browse, read, create, and edit projects."
          ],
          [
            "`delete_project`, `restore_project`, `list_deleted_projects`",
            "Soft-delete, restore, and review deleted projects (delete confirm-gated)."
          ],
          [
            "`subscribe_project`, `unsubscribe_project`, `get_project_subscription`",
            "Follow a project and check your subscription."
          ],
          [
            "`list_project_members`, `add_project_member`, `remove_project_member`",
            "Manage who is on a project."
          ],
          [
            "`list_project_artifacts`, `add_project_artifact`, `remove_project_artifact`",
            "Attach and remove linked artifacts."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Meetings"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_meetings`, `get_meeting`, `create_meeting`, `import_folio_meeting`",
            "Browse and create meetings, or import one from [Folio](https://folio.chele.bi)."
          ],
          [
            "`update_meeting`, `delete_meeting`",
            "Edit or delete a meeting (delete confirm-gated)."
          ],
          [
            "`list_meeting_segments`, `list_meeting_chapters`, `list_meeting_summaries`",
            "Read transcript segments, chapters, and summaries."
          ],
          [
            "`summarize_meeting`, `suggest_meeting_project`",
            "Generate a summary, or suggest the project a meeting belongs to."
          ],
          [
            "`ask_meeting`, `meetings_chat`",
            "Q&A on one meeting, or across all meetings."
          ],
          [
            "`run_meeting_recipe`",
            "Run a saved meeting recipe."
          ],
          [
            "`get_meeting_share`, `create_meeting_share`, `update_meeting_share`",
            "Manage public share links."
          ],
          [
            "`list_meeting_templates`, `create_meeting_template`, `update_meeting_template`, `delete_meeting_template`",
            "Manage meeting templates (delete confirm-gated)."
          ],
          [
            "`list_meeting_recipes`, `create_meeting_recipe`",
            "Browse and create recipes."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Notes, calendar, comments, and notifications"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_notes`, `get_note`, `create_note`, `update_note`, `delete_note`",
            "Browse, read, write, edit, and delete notes (delete confirm-gated)."
          ],
          [
            "`list_calendar_events`, `get_calendar_event`, `create_calendar_event`, `update_calendar_event`, `delete_calendar_event`",
            "Browse, read, and manage calendar events."
          ],
          [
            "`get_event_brief`",
            "Get the AI brief for an event."
          ],
          [
            "`list_comments`, `get_comment`, `create_comment`, `update_comment`, `delete_comment`",
            "Read and write comments on tasks, notes, and meetings (delete confirm-gated)."
          ],
          [
            "`get_attachment`, `view_image_attachment`",
            "Read a comment attachment, or view an image attachment inline."
          ],
          [
            "`list_notifications`, `unread_count`, `mark_notification_read`, `mark_all_notifications_read`",
            "Read your notifications and unread total, and mark them read."
          ],
          [
            "`archive_notification`, `snooze_notification`",
            "Archive or snooze a notification."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Organization, teams, members, and invites"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_my_orgs`",
            "List every organization you belong to (works with an all-organizations token)."
          ],
          [
            "`get_org`, `update_org`",
            "Read and edit the workspace (`update_org` needs `org:manage`)."
          ],
          [
            "`create_org`, `delete_org`",
            "Create a new organization with `org:create` (you become its owner), or delete one with `org:manage` (confirm-gated)."
          ],
          [
            "`list_org_members`, `update_member_role`, `remove_org_member`",
            "Manage members and roles (remove confirm-gated)."
          ],
          [
            "`list_invites`, `create_invite`, `revoke_invite`",
            "Invite people and revoke invitations."
          ],
          [
            "`list_teams`, `get_team`, `create_team`, `update_team`, `delete_team`",
            "Manage teams (delete confirm-gated)."
          ],
          [
            "`list_team_members`, `add_team_member`, `remove_team_member`",
            "Manage team membership."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Activity and the brain"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_activity`, `get_entity_activity`",
            "The org-wide activity feed, and the change history of one task, note, or meeting."
          ],
          [
            "`brain_open_threads`",
            "Open loops that still need attention."
          ],
          [
            "`brain_changes_since`",
            "What changed since a point in time (catch-me-up)."
          ],
          [
            "`brain_resume`",
            "Where you left off in a project, to resume work."
          ]
        ]
      },
      {
        "type": "p",
        "text": "The brain tools are the agent-facing side of the company brain: they exist so an agent can orient itself before it acts, catching up on what changed, finding open threads, and resuming a project without you spelling out the state each time. They are read-only and run under `brain:read`."
      },
      {
        "type": "h3",
        "text": "AI agents and keys"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_ai_users`, `get_ai_user`, `create_ai_user`, `update_ai_user`",
            "Manage the org's AI agents (write under elevated `agents:write`)."
          ],
          [
            "`pause_ai_user`, `set_ai_user_budget`, `delete_ai_user`",
            "Pause, budget, and remove agents (delete confirm-gated)."
          ],
          [
            "`list_agent_runs`",
            "Recent agent runs."
          ],
          [
            "`list_ai_keys`, `create_ai_key`, `update_ai_key`, `revoke_ai_key`",
            "Manage provider API keys (elevated `agents:keys`; revoke confirm-gated)."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Views, vocabulary, workflow, and automation"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`list_views`, `create_view`, `update_view`, `delete_view`",
            "Saved board views (delete confirm-gated)."
          ],
          [
            "`list_vocabulary`, `create_term`, `update_term`, `delete_term`",
            "The org glossary (delete confirm-gated)."
          ],
          [
            "`list_workflow_statuses`, `create_workflow_status`, `update_workflow_status`, `delete_workflow_status`",
            "Custom workflow statuses (delete confirm-gated)."
          ],
          [
            "`list_automations`, `create_automation`, `update_automation`, `delete_automation`, `run_automation`",
            "Manage and run automation rules (delete confirm-gated)."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Integrations and profile"
      },
      {
        "type": "table",
        "headers": [
          "Tool",
          "What it does"
        ],
        "rows": [
          [
            "`get_slack_integration`, `list_slack_channels`",
            "Read the Slack connection and its channels."
          ],
          [
            "`post_meeting_to_slack`",
            "Post a meeting to a Slack channel (elevated `integrations:manage`)."
          ],
          [
            "`get_my_profile`, `update_my_profile`",
            "Read and update your own profile."
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Linking to tasks and notes",
        "text": "Embed a clickable reference to a task or note in any description or comment using a Markdown link of the form `[label](/__mention/kind/id)`. See the References & Mentions page for the full format and examples."
      },
      {
        "type": "h2",
        "text": "Managing access"
      },
      {
        "type": "p",
        "text": "Every consent you give creates a connected-app grant tied to your account, the client, and the org (or, for a cross-org token, no specific org). You can see and revoke these at any time."
      },
      {
        "type": "ul",
        "items": [
          "**Connected apps (grants).** Each connected client shows up as a grant with its name, the org it covers (or all your organizations), its scopes, its status, and when it was granted. Re-approving the same client updates the existing grant rather than stacking duplicates.",
          "**Revoking a grant.** Revoking a grant kills the whole token family behind it, every access and refresh token, so the client loses access immediately and must re-consent to reconnect.",
          "**Token revocation (RFC 7009).** A client can also revoke its own token at the revocation endpoint. Revoking any token in a family tears down the family, and unknown tokens are a safe no-op."
        ]
      },
      {
        "type": "h3",
        "text": "Confidential bot apps (client_credentials)"
      },
      {
        "type": "p",
        "text": "For an unattended bot that has no browser to consent through, register a confidential OAuth app. You get a `client_id` and a one-time `client_secret` (shown once at creation, stored only as a hash). The app then exchanges those credentials at the token endpoint with `grant_type=client_credentials` and receives a bot token that acts as you, the owner, across your organizations. Revoking the app deactivates it and stops it from minting new tokens."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "A bot app acts as its owner",
        "text": "A `client_credentials` token is minted as a personal token of the app's owner, so it inherits the owner's full reach. Treat the client secret like a password, store it in a secret manager, and revoke the app the moment it is no longer needed."
      },
      {
        "type": "h2",
        "text": "Conventions"
      },
      {
        "type": "p",
        "text": "A few rules hold across every tool, so agents behave predictably and safely."
      },
      {
        "type": "ul",
        "items": [
          "**Org-scoped, acting as you.** Every tool resolves to one organization and runs with your membership and role. It can do exactly what you can do in the app, and the result appears in activity the same way.",
          "**Per-call scope checks.** A tool runs only if your token carries its required scope. If not, it returns `insufficient_scope` and does nothing. Scopes are checked on every single call, not just at connect time.",
          "**Idempotent creates.** Pass an `idempotency_key` on a supported create and a retried call returns the original result instead of duplicating work, which makes agent retries safe.",
          "**Confirm-gated deletes.** The most destructive tools take a `confirm` flag. Call once with `confirm=false` to preview what would be removed, then again with `confirm=true` to apply it.",
          "**Live membership re-checks.** With a cross-org token, your membership of the target org is verified on every call, so losing access to an org takes effect instantly."
        ]
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "New permissions need a fresh consent",
        "text": "A token only carries the scopes you approved when you connected. If a new tool domain ships after you connected, or you simply did not tick a scope you now need, the existing token will not have it. Re-run the client's connect flow (`/mcp` in Claude Code) and approve again. Ticking **Root / Admin** grants the entire current surface in one step."
      }
    ]
  },
  {
    "title": "Set up your agent",
    "slug": "agent-project-setup",
    "description": "Wire any project so your AI coding agent (Claude Code, Cursor, Claude Desktop, or any MCP client) reliably treats the Elliptic company brain as its memory for project search and save, with a one-command, project-scoped, opt-in setup plus the manual equivalents.",
    "blocks": [
      {
        "type": "h2",
        "text": "Set up your agent for a project"
      },
      {
        "type": "p",
        "text": "Elliptic is **Jira for your agents**, and this page is how you let one in. It wires a single project so your AI coding agent, Claude Code, Cursor, Claude Desktop, or any MCP client, reaches for the [company-brain MCP](/docs/company-brain-mcp) whenever it looks something up or writes something down about your work. The agent becomes a first-class operator of the same projects, tasks, meetings, and notes your team uses, acting on your organization's own model key (BYOK)."
      },
      {
        "type": "p",
        "text": "Setup is **per project and opt-in**. You wire only the directories where you want Elliptic in the loop, and every other project on your machine stays exactly as it was. The whole thing is one command, and it is safe to run again whenever you like."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Project-scoped, nothing global",
        "text": "Everything the setup writes lives inside the project directory: `.mcp.json`, a marked block in `CLAUDE.md`, and `.claude/skills/elliptic/SKILL.md`. Nothing is installed at the user or machine level, so unrelated projects never see Elliptic and your agent never reaches for it where you did not ask it to."
      },
      {
        "type": "h2",
        "text": "One-command setup"
      },
      {
        "type": "p",
        "text": "From the root of a project you want connected, fetch the setup script, read it, and run it. It is a small, plain bash script with no dependencies beyond a shell, so reviewing it before you run it takes a moment."
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# from the root of a project you want connected\ncd your-project\ncurl -fsSL https://elliptic.sh/elliptic-agent-init.sh -o elliptic-agent-init.sh\nbash elliptic-agent-init.sh"
      },
      {
        "type": "p",
        "text": "The script prints the project it is wiring, the MCP endpoint it will point at, and the server name it will use, then writes the three files described below. It only ever touches the directory you run it in."
      },
      {
        "type": "h3",
        "text": "Flags"
      },
      {
        "type": "p",
        "text": "Two flags let you override the defaults. You will rarely need them on the hosted instance, but they matter for self-hosting or for running more than one workspace side by side."
      },
      {
        "type": "table",
        "headers": [
          "Flag",
          "Default",
          "What it does"
        ],
        "rows": [
          [
            "`--endpoint URL`",
            "the `ELLIPTIC_MCP_URL` env var, else `http://localhost:8000/api/v1/mcp`",
            "The MCP endpoint written into `.mcp.json`. Point it at your Elliptic API's `/api/v1/mcp` path. On the hosted instance that is `https://api.elliptic.sh/api/v1/mcp`."
          ],
          [
            "`--name elliptic`",
            "`elliptic`",
            "The MCP server name. It becomes the key in `.mcp.json` and the `mcp__<name>__*` tool prefix the agent calls, so change it only if you are wiring more than one Elliptic workspace into the same project."
          ]
        ]
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# point at the hosted instance explicitly\nbash elliptic-agent-init.sh --endpoint https://api.elliptic.sh/api/v1/mcp\n\n# or set it once in the environment\nexport ELLIPTIC_MCP_URL=https://api.elliptic.sh/api/v1/mcp\nbash elliptic-agent-init.sh"
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Safe to re-run",
        "text": "Running the script again does not pile up duplicates. It refreshes its own managed block in `CLAUDE.md` between markers, rewrites the skill file, and leaves a `.mcp.json` that already defines the server untouched. Re-run it after an upgrade, or any time you want to be sure a project is current."
      },
      {
        "type": "h2",
        "text": "What gets written"
      },
      {
        "type": "p",
        "text": "The setup writes three small, readable files. Together they tell your agent that this project has a company brain, how to reach it, and when to use it. You can open all three and see exactly what was added."
      },
      {
        "type": "h3",
        "text": "1. .mcp.json, the connection"
      },
      {
        "type": "p",
        "text": "At the project root, `.mcp.json` declares the Elliptic MCP server as an **HTTP** transport pointing at the endpoint. Authentication is OAuth, so the file carries the URL and nothing secret. No API key and no token is written to disk. The agent obtains a token through a browser consent the first time it connects."
      },
      {
        "type": "code",
        "lang": "json",
        "code": "{\n  \"mcpServers\": {\n    \"elliptic\": {\n      \"type\": \"http\",\n      \"url\": \"https://api.elliptic.sh/api/v1/mcp\"\n    }\n  }\n}"
      },
      {
        "type": "p",
        "text": "If a `.mcp.json` already exists and already defines a `elliptic` server, the script leaves it alone. If the file exists without that server, the script will not edit it for you, to avoid corrupting your config. Instead it prints the exact server entry to paste into your existing `mcpServers` object."
      },
      {
        "type": "h3",
        "text": "2. The Elliptic block in CLAUDE.md, the routing rule"
      },
      {
        "type": "p",
        "text": "The script adds a marked **Elliptic (company brain)** block to `CLAUDE.md`, the file your agent reads as project instructions. The block is wrapped in `<!-- elliptic:start -->` and `<!-- elliptic:end -->` markers and is fully idempotent. Re-running drops the old block and appends a fresh one, keeping everything else in the file in place. The block tells the agent three things."
      },
      {
        "type": "ul",
        "items": [
          "**Search first.** Before answering anything about the company, a project, a task, a person, a meeting, or a deadline, query Elliptic (`mcp__elliptic__*`) instead of guessing or relying only on local files.",
          "**Save there.** When asked to create or track work, a task, note, decision, or follow-up, write it to Elliptic, not just to local memory.",
          "**It is authoritative.** Treat Elliptic as the source of truth. Local memory and notes should point to it, not duplicate it."
        ]
      },
      {
        "type": "p",
        "text": "The block closes by reminding the agent to authorize once with `/mcp`. If you keep your project rules somewhere other than `CLAUDE.md`, the same prose works pasted into that file."
      },
      {
        "type": "h3",
        "text": "3. SKILL.md, the on-demand skill"
      },
      {
        "type": "p",
        "text": "The script writes `.claude/skills/elliptic/SKILL.md`, a skill the agent loads on demand rather than keeping in context all the time. Its description triggers whenever you ask to find, search, look up, check the status of, create, update, or save anything about the company, a project, a task, a meeting, a note, a person, or a deadline, and routes those requests to the company brain. Inside, it maps the request to the right tools so the agent does not have to guess."
      },
      {
        "type": "ul",
        "items": [
          "Start from a list or search tool, then drill in: `list_projects`, `list_project_tasks`, `get_task`.",
          "Create and move work with `create_task`, `update_task`, `transition_task_status`.",
          "Capture thinking with `create_note` and `list_notes`, and read schedule context with `list_meetings` and `list_calendar_events`.",
          "Catch up or resume with `brain_changes_since`, `brain_open_threads`, and `brain_resume`.",
          "Reuse an `idempotency_key` on creates so a retry never duplicates the item."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Why a skill and not just CLAUDE.md",
        "text": "The `CLAUDE.md` block is always-on guidance, kept short so it costs little context. The skill carries the heavier tool map and only loads when a request actually looks like company-brain work, so the agent gets precise routing exactly when it needs it without paying for it on every turn."
      },
      {
        "type": "h2",
        "text": "Authorize once"
      },
      {
        "type": "p",
        "text": "The files declare the connection, but no credentials live in them. The first time your agent connects, it walks an OAuth consent in your browser and stores the resulting token itself. You do this once per project."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the project",
            "text": "Open it in Claude Code (or your MCP client). It detects `.mcp.json` and offers to approve the `elliptic` server."
          },
          {
            "title": "Run /mcp and approve",
            "text": "Run `/mcp` and approve **elliptic**. The client kicks off the OAuth flow and opens the Elliptic consent screen in your browser."
          },
          {
            "title": "Pick a workspace and grant access",
            "text": "On the consent screen, choose the **workspace** you want the agent to act in (or **All my organizations** for a cross-org token, when your account can grant one), then approve the permissions. Tick **Root / Admin** to grant the full tool surface in one step, or hand-pick scopes to keep the agent narrow. Some baseline scopes are always on and cannot be unchecked."
          },
          {
            "title": "Done",
            "text": "The client stores the token and reconnects. Your agent now reaches for Elliptic on project search and save in this project, and nowhere else."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The agent acts as you",
        "text": "Every tool call runs with the permissions you approved and is scoped to the workspace you picked, with your membership re-verified on each call. The agent can do exactly what you can do in the web app, no more, and each action shows up in the activity feed the same way a person's would."
      },
      {
        "type": "h2",
        "text": "Other clients and manual setup"
      },
      {
        "type": "p",
        "text": "The script only writes the three pieces above, so you can wire any MCP client by hand. This is the path for Cursor, Claude Desktop, and other clients that read their own project config and rules files. The connection and the routing rule are the two things that matter, the skill file is a Claude Code convenience."
      },
      {
        "type": "h3",
        "text": "The connection"
      },
      {
        "type": "p",
        "text": "Cursor reads a project `.cursor/mcp.json` (or a global `~/.cursor/mcp.json`), and most clients accept the same shape. Point any of them at the endpoint and complete the browser consent on first use."
      },
      {
        "type": "code",
        "lang": "json",
        "code": "{\n  \"mcpServers\": {\n    \"elliptic\": {\n      \"url\": \"https://api.elliptic.sh/api/v1/mcp\"\n    }\n  }\n}"
      },
      {
        "type": "p",
        "text": "Claude Desktop and clients that do not yet speak OAuth-protected HTTP natively can bridge through `mcp-remote`. The full per-client install steps, including the Cursor deeplink and the bridge config, live on the [Company-Brain MCP](/docs/company-brain-mcp) page."
      },
      {
        "type": "h3",
        "text": "The routing rule"
      },
      {
        "type": "p",
        "text": "Paste a Elliptic block into the client's project rules file (`CLAUDE.md` for Claude Code, your project rules for Cursor, and so on). The wording matters less than the three instructions: search first, save there, treat it as authoritative."
      },
      {
        "type": "code",
        "lang": "markdown",
        "code": "## Elliptic (company brain)\n\nElliptic is the source of truth for this org's projects, tasks, meetings,\nnotes, calendar, and activity.\n\n- Search Elliptic (`mcp__elliptic__*`) before answering anything about the\n  company, a project, a task, a person, or a deadline.\n- Save tasks, notes, decisions, and follow-ups to Elliptic, not just locally.\n- Treat it as authoritative. Local memory should point to it, not duplicate it.\n\nAuthorize once with `/mcp`."
      },
      {
        "type": "p",
        "text": "On Claude Code you can also add the optional skill at `.claude/skills/elliptic/SKILL.md` whose description triggers on project search and save and lists the `mcp__elliptic__*` tools, exactly what the script writes."
      },
      {
        "type": "h2",
        "text": "Memory, not duplication"
      },
      {
        "type": "p",
        "text": "The point of all this is one source of truth. Let Elliptic hold the data and have your agent's local memory point to it rather than copy it. When the brain is authoritative, you never have to reconcile a stale note against the real task, and any agent or teammate who opens the workspace sees the same current picture."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Write through, read fresh",
        "text": "When your agent learns something worth keeping, a decision, a follow-up, a status, have it create or update the task, note, or comment in Elliptic instead of stashing it in a local file. When it needs a fact, have it read the live value with a tool call. That habit keeps the brain and your scattered notes from drifting apart."
      },
      {
        "type": "h3",
        "text": "The reverse direction: outbound connectors"
      },
      {
        "type": "p",
        "text": "This page wires your agent to pull *from* and push *into* Elliptic. The opposite is also available: letting Elliptic reach *out* to the tools your work already lives in. An admin can add outbound MCP connectors under **Settings → Connectors**, choosing from a curated catalog (GitHub, Linear, Notion, Sentry) or pointing at any custom HTTP or SSE MCP server. Each connector's credential is encrypted at rest, and a test action connects to the remote server and lists its tools so you can confirm it works before relying on it. The **Marketplace** tab next to it gathers connectable apps, agents, and importers in one place."
      },
      {
        "type": "p",
        "text": "Use the two directions together: this setup makes the company brain your agent's memory, and outbound connectors let that brain act across the rest of your stack, all on your organization's own keys."
      }
    ]
  },
  {
    "title": "Integrations & webhooks",
    "slug": "integrations-webhooks",
    "description": "How Elliptic connects to Slack, GitHub, Sentry, and email to file and link work, and how project webhooks and the event outbox push your domain events out to the tools your team already uses.",
    "blocks": [
      {
        "type": "p",
        "text": "Elliptic is built to sit in the middle of your work, not off to the side. Integrations let the tools your team already lives in feed work straight into your projects, and webhooks let Elliptic push its own events back out the moment they happen. The same surfaces are open to your agents over the company-brain MCP, so an agent can file, link, and react to work through these channels exactly the way a person does."
      },
      {
        "type": "p",
        "text": "This page covers everything in the integrations layer: connecting Slack, GitHub, Sentry, and email so they create and close work for you, configuring per-project webhooks to Slack and Discord, and the event outbox that delivers signed HTTP webhooks to any endpoint you run. Most of these surfaces are admin-gated. Inbound endpoints are authenticated by a per-project token or a signed request, never by your login."
      },
      {
        "type": "h2",
        "text": "Slack"
      },
      {
        "type": "p",
        "text": "The Slack integration connects one Slack workspace to your organization. Once connected, you can post a meeting's summary into a channel with a single click, and your team can file work into Elliptic from Slack with a slash command. The connection is org-wide: one workspace per organization."
      },
      {
        "type": "h3",
        "text": "Connecting a workspace"
      },
      {
        "type": "p",
        "text": "Connecting Slack is an admin action. You complete a standard Slack OAuth handshake, and Elliptic exchanges the authorization code for a bot token. That **bot token is never stored in plaintext**. It is encrypted at rest with your organization's key-encryption key (the same AES-256-GCM custody that protects your BYOK provider keys), bound to your org id, so a leaked database row is useless on its own. Elliptic keeps the workspace's team id and team name alongside the encrypted token, and records who installed it."
      },
      {
        "type": "p",
        "text": "After connecting, the integration status shows `connected` along with the workspace name. Re-running the connect flow updates the stored token in place rather than creating a second connection."
      },
      {
        "type": "h3",
        "text": "Listing channels"
      },
      {
        "type": "p",
        "text": "With a workspace connected, Elliptic can list that workspace's channels using the stored bot token. This is what populates the channel picker when you go to post a meeting, so you choose a destination by name instead of pasting a channel id."
      },
      {
        "type": "h3",
        "text": "Posting a meeting summary"
      },
      {
        "type": "p",
        "text": "From any meeting you can send its AI summary into a Slack channel. Elliptic assembles a single formatted message:"
      },
      {
        "type": "ul",
        "items": [
          "The **meeting title**, in bold.",
          "The latest **AI summary** for the meeting, trimmed to keep the message compact.",
          "An **Action items** section listing up to ten items extracted from that summary.",
          "An embedded **Ask about this meeting** link, when the meeting has an active share."
        ]
      },
      {
        "type": "p",
        "text": "The Ask link points at the meeting's public share page (`/share/meetings/{token}`), so anyone in the channel can open the meeting and ask questions of it without needing a Elliptic seat. The link only appears when a share exists and has not been revoked. Posting is recorded in the activity feed as a `slack_posted` event on the meeting, so the share is part of the meeting's history."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Answers still run on your key",
        "text": "Sharing a meeting to Slack shares the summary that was already generated. When someone opens the Ask link and asks a new question, that answer runs on **your organization's own model key**, same as everywhere else in Elliptic. Nothing about a Slack post moves AI work onto a shared pool."
      },
      {
        "type": "h3",
        "text": "The /elliptic slash command"
      },
      {
        "type": "p",
        "text": "The slash command turns Slack into an intake surface. Anyone in the connected workspace can type `/elliptic <work item title>` and Elliptic files a triage item into a default project, then replies in the channel with the new item's identifier. It is the fastest way to capture a request without leaving the conversation it came up in."
      },
      {
        "type": "code",
        "lang": "text",
        "code": "/elliptic Investigate slow dashboard load for enterprise tenants"
      },
      {
        "type": "p",
        "text": "The item lands as a triage task in the configured project's backlog, tagged with an intake channel of `slack` so you can tell at a glance where it came from. Elliptic replies in-channel with a confirmation like `:white_check_mark: Created COS-214 — Investigate slow dashboard load...`. If you send the command with no text, it replies privately with the usage hint."
      },
      {
        "type": "p",
        "text": "Every slash-command request is verified before it does anything. Elliptic reads the raw request body exactly as Slack sent it and checks Slack's signature: it recomputes the `v0` HMAC-SHA256 over `v0:{timestamp}:{body}` with your Slack signing secret and compares it in constant time. Requests whose timestamp is more than **five minutes** off from now are rejected outright, which blocks replayed requests. An invalid or stale signature is refused before any work item is created."
      },
      {
        "type": "h3",
        "text": "Setting the default project"
      },
      {
        "type": "p",
        "text": "The slash command needs to know where to file items. An admin sets the **default project** for Slack in the integration settings. Until a default project is set, the command replies privately telling the user that an admin needs to pick one, and if the configured project is later deleted the command reports that too. Setting the default project is restricted to owners and admins."
      },
      {
        "type": "h2",
        "text": "GitHub"
      },
      {
        "type": "p",
        "text": "The GitHub integration connects a repository to a project so that two things happen automatically: new issues become triage tasks, and pull requests or commits that reference a Elliptic task by its identifier link back to it and close it when they merge. It is set up per project, GitHub-first, and runs entirely through an inbound webhook, so Elliptic never needs write access to your repo."
      },
      {
        "type": "h3",
        "text": "Connecting a repository"
      },
      {
        "type": "p",
        "text": "On a project you add a connection by entering the repository's `owner` and `repo`. Elliptic mints a unique secret token for that connection and gives you a webhook URL to paste into your repository's settings under Settings, Webhooks:"
      },
      {
        "type": "code",
        "lang": "text",
        "code": "https://elliptic.sh/api/v1/integrations/git/<token>"
      },
      {
        "type": "p",
        "text": "Point GitHub at that URL and choose to send issue, pull request, and push events. Elliptic reads the `X-GitHub-Event` header to tell them apart. The token in the URL is what authenticates the repo to the right project, so treat it as a secret. A connection can be disabled or removed at any time, which immediately stops it from accepting events."
      },
      {
        "type": "h3",
        "text": "Issues become triage tasks"
      },
      {
        "type": "p",
        "text": "When an issue is opened or reopened, Elliptic creates a triage task in the connected project's backlog, carrying the issue title and body. The task is tagged with an intake channel of `github` and remembers the GitHub issue id, so the same issue never produces a duplicate. If GitHub sends a later event for an issue Elliptic already imported, it updates the existing task's title and description in place instead of creating another."
      },
      {
        "type": "h3",
        "text": "Pull requests and commits auto-link and auto-close"
      },
      {
        "type": "p",
        "text": "Elliptic scans the title, body, and branch name of a pull request, and the messages of pushed commits, for a closing keyword followed by a task identifier. The recognized keywords are `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, and `resolved`, and the identifier is your project key plus the task number, like `COS-123`."
      },
      {
        "type": "code",
        "lang": "text",
        "code": "Fixes COS-123: debounce the search input\n\nResolves COS-130 as well."
      },
      {
        "type": "p",
        "text": "For every identifier it finds, Elliptic adds a link from that task to the pull request or commit comparison, so the task page shows where the work happened. What differs between events is closing behavior:"
      },
      {
        "type": "table",
        "headers": [
          "Event",
          "Links the task",
          "Closes the task"
        ],
        "rows": [
          [
            "Pull request merged",
            "Yes",
            "Yes, moves the task to Done unless it is already in a completed status"
          ],
          [
            "Pull request opened or updated, not merged",
            "Yes",
            "No"
          ],
          [
            "Push (commits)",
            "Yes",
            "No"
          ]
        ]
      },
      {
        "type": "p",
        "text": "So a PR that says `closes COS-123` links the task as soon as Elliptic sees the PR, and only flips it to Done once the PR actually merges. Pushes and unmerged PRs link but never close, which keeps the board honest while work is still in flight."
      },
      {
        "type": "h3",
        "text": "Branch name suggestions"
      },
      {
        "type": "p",
        "text": "To keep the link working in the other direction, Elliptic can suggest a git branch name for any task. The suggestion is built from the task's identifier and a slugified title, for example `cos-123-debounce-the-search-input`. Branch off with that name, mention the identifier in your PR, and the auto-link and auto-close behavior above picks it up with no extra setup."
      },
      {
        "type": "h2",
        "text": "Sentry and email intake"
      },
      {
        "type": "p",
        "text": "Sentry and email intake share the same shape: a **per-project, tokenized endpoint** that turns an inbound payload into a triage item. You create the endpoint on a project, paste the URL into Sentry or your email provider, and matching events open work items in that project. The token in the URL is the only credential, so anyone holding it can post to that project. Rotate it by deleting the intake and creating a new one."
      },
      {
        "type": "h3",
        "text": "Sentry alerts"
      },
      {
        "type": "p",
        "text": "Create a Sentry intake on a project and add its URL to a Sentry alert rule's webhook action:"
      },
      {
        "type": "code",
        "lang": "text",
        "code": "https://elliptic.sh/api/v1/integrations/sentry/<token>"
      },
      {
        "type": "p",
        "text": "When Sentry fires the alert, Elliptic opens a triage **bug** in the project. It pulls the issue title, the culprit or transaction, and a link back to Sentry into the task, and it maps Sentry's level to a bug severity so triage is already prioritized:"
      },
      {
        "type": "table",
        "headers": [
          "Sentry level",
          "Bug severity"
        ],
        "rows": [
          [
            "fatal",
            "Critical"
          ],
          [
            "error",
            "High"
          ],
          [
            "warning",
            "Medium"
          ],
          [
            "info",
            "Low"
          ],
          [
            "anything else",
            "Medium"
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Forwarded email"
      },
      {
        "type": "p",
        "text": "Email intake works the same way, for turning a forwarded email into a task. There is no mail server inside Elliptic. Instead you point your email provider's inbound-parse webhook at the intake URL, and the provider posts each email to it:"
      },
      {
        "type": "code",
        "lang": "text",
        "code": "https://elliptic.sh/api/v1/integrations/email/<token>"
      },
      {
        "type": "p",
        "text": "Elliptic opens a triage **task** using the email's subject as the title, and folds the sender and the message body into the description. Both intakes return the new item's identifier (like `COS-318`) in their response, and both tag the task with an intake channel of `sentry` or `email` so you always know how it arrived."
      },
      {
        "type": "h2",
        "text": "Project webhooks (Slack and Discord)"
      },
      {
        "type": "p",
        "text": "Project webhooks are the outbound half of Slack and Discord: instead of pulling work in, they post a formatted message to a channel whenever something happens in Elliptic. You subscribe a webhook to the exact events you care about, and Elliptic pushes a tidy Slack Block Kit message or Discord embed for each one. Managing webhooks is admin-gated, and they are scoped to a project (with a few organization-level events available too)."
      },
      {
        "type": "h3",
        "text": "Subscribing to events"
      },
      {
        "type": "p",
        "text": "When you create a webhook you pick events from a catalog, grouped by domain. The catalog covers task, comment, note, meeting, project, organization, and team events:"
      },
      {
        "type": "table",
        "headers": [
          "Domain",
          "Events you can subscribe to"
        ],
        "rows": [
          [
            "Tasks",
            "created, updated, assigned, status changed, completed, deleted"
          ],
          [
            "Comments",
            "added, updated, deleted"
          ],
          [
            "Notes",
            "created, updated, deleted"
          ],
          [
            "Meetings",
            "created, updated, deleted, summarized"
          ],
          [
            "Projects",
            "updated, member added, member removed"
          ],
          [
            "Organization",
            "member joined, member removed, role changed, invite created, org updated"
          ],
          [
            "Teams",
            "created, member added, member removed"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Task, comment, note, meeting, and project events are scoped to the project the webhook belongs to. The organization and team events are org-wide, so a webhook on any project can subscribe to them. The **task completed** event is special: it fires whenever a status change lands the task in a completed status, so you can be notified about finished work without watching every status change."
      },
      {
        "type": "h3",
        "text": "The signing secret and the test message"
      },
      {
        "type": "p",
        "text": "Creating a webhook returns a **signing secret exactly once**. Elliptic uses it to sign the deliveries it sends, so the receiving side can verify the message genuinely came from Elliptic. Copy it when it is shown, because it is never displayed again. Every webhook also has a **Test** action that sends a sample message to the destination right away, so you can confirm the channel and formatting before you depend on it."
      },
      {
        "type": "p",
        "text": "Each webhook tracks its **last delivery**: when it last fired, whether it succeeded or failed, and the error detail when it failed. The webhook list surfaces this as a delivery status badge, so a broken destination is obvious at a glance. You can enable, disable, edit, or delete a webhook at any time, and deleting one stops all deliveries to it."
      },
      {
        "type": "h3",
        "text": "The destination allowlist"
      },
      {
        "type": "p",
        "text": "Project-webhook destinations are deliberately limited. Only Slack incoming webhooks (on `hooks.slack.com`) and Discord incoming webhooks (on Discord's webhook hosts, under `/api/webhooks/`) are accepted, and only over HTTPS. Any other host, including localhost and cloud metadata addresses, is rejected when you save the webhook. This allowlist is what closes the **server-side request forgery** surface that an arbitrary outbound URL would open."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "The URL is encrypted, only a hint is shown",
        "text": "A webhook's full destination URL (which for Slack and Discord contains a secret) is **encrypted at rest** with your org's key, exactly like the Slack bot token. The API never returns the real URL. You only ever see a masked `url_hint`, the host plus the last four characters, enough to recognize which webhook is which without exposing the secret."
      },
      {
        "type": "h2",
        "text": "The event outbox and generic HTTP webhooks"
      },
      {
        "type": "p",
        "text": "Underneath the Slack and Discord webhooks sits a general-purpose delivery backbone. As your organization works, Elliptic captures domain events into a durable **event outbox**. Generic **HTTP webhook endpoints** then subscribe to those events by type, and a scheduler drains the outbox and delivers each event to every matching endpoint with a signed request. This is the surface to use when you want to drive your own automation off Elliptic events rather than post into a chat tool."
      },
      {
        "type": "h3",
        "text": "Registering an endpoint"
      },
      {
        "type": "p",
        "text": "An admin registers a webhook endpoint on the organization with a destination URL, an optional list of event types to filter on, and a secret. If you do not supply a secret, Elliptic generates one. An endpoint with an **empty event-type list receives every event**; otherwise it receives only the event types you list. Endpoints are enabled by default and can be deleted when you no longer need them."
      },
      {
        "type": "h3",
        "text": "Signed deliveries"
      },
      {
        "type": "p",
        "text": "Each delivery is a JSON POST carrying the event id, event type, entity type, entity id, the initiator type, and any event data. Elliptic signs the body with HMAC-SHA256 using the endpoint's secret and sends the result in an `X-Elliptic-Signature` header, so your receiver can verify authenticity. Recompute the same HMAC over the raw request body and compare:"
      },
      {
        "type": "code",
        "lang": "ts",
        "code": "import { createHmac, timingSafeEqual } from \"node:crypto\";\n\nfunction verify(rawBody: string, signature: string, secret: string): boolean {\n  const expected = createHmac(\"sha256\", secret).update(rawBody).digest(\"hex\");\n  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));\n}"
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Two webhook surfaces, two signatures",
        "text": "Generic outbox deliveries put a bare HMAC-SHA256 hex digest of the body in `X-Elliptic-Signature`. The Slack and Discord project webhooks above use a different scheme: they sign `{timestamp}.{body}` and send `sha256=<hex>` alongside `X-Elliptic-Timestamp` and `X-Elliptic-Event` headers. Verify against whichever surface you are receiving from, they are not interchangeable."
      },
      {
        "type": "h3",
        "text": "Retries and the dead-letter"
      },
      {
        "type": "p",
        "text": "Delivery is resilient. An endpoint that returns an HTTP error or is unreachable is retried, up to **five attempts**, with exponential backoff between tries (the wait doubles each attempt, in minutes). If an event still has not been delivered after five attempts, it is marked **failed** and moved out of the active queue, so a permanently broken endpoint never blocks the rest. A delivery counts as successful only when every matching endpoint accepts it."
      },
      {
        "type": "p",
        "text": "An event whose endpoints all happen to filter it out is marked delivered immediately, with no HTTP call. That keeps the outbox from accumulating events that have nowhere to go."
      },
      {
        "type": "h3",
        "text": "The delivery log, manual dispatch, and retry"
      },
      {
        "type": "p",
        "text": "Elliptic keeps a delivery log of recent outbox events that you can filter by status: **pending**, **delivered**, or **failed**. Each entry shows the event type, attempt count, the last delivery error, and when it was created. From the log you can:"
      },
      {
        "type": "ul",
        "items": [
          "**Retry** a dead-lettered event. This resets its failed flag and attempt count and queues it for another delivery, useful once you have fixed the receiving endpoint.",
          "**Dispatch** pending events on demand, instead of waiting for the next scheduled drain, when you want to flush the queue immediately."
        ]
      },
      {
        "type": "p",
        "text": "Left alone, the outbox drains itself. A background scheduler runs about once a minute, finds every organization with due, undelivered events, and dispatches them. Delivery is locked per row so two drains never send the same event twice, and the whole loop is idempotent: re-running it only touches events that have not been delivered yet."
      },
      {
        "type": "h2",
        "text": "Related"
      },
      {
        "type": "p",
        "text": "Integrations bring outside tools to Elliptic through fixed connectors. For installable apps, agents, importers, and outbound MCP connectors that let your agents reach other systems, see the [Marketplace & connectors](/docs/marketplace-connectors) page. For how inbound items land as triage and how you accept or decline them, see [Projects & Tasks](/docs/projects-and-tasks)."
      }
    ]
  },
  {
    "title": "Public sharing",
    "slug": "public-sharing",
    "description": "Publish boards, pages, saved views, and meetings to no-login links backed by revocable, unguessable tokens, with anonymous comments, page export, and a guest Ask scoped to shared content.",
    "blocks": [
      {
        "type": "h2",
        "text": "The sharing model"
      },
      {
        "type": "p",
        "text": "Most of Elliptic lives behind a login, scoped to your organization and your project memberships. Public sharing is the deliberate exception: a handful of surfaces you can open up to people who do not have an account, so a board, a page, a saved view, or a meeting can be read by anyone holding the link. Every one of these surfaces works the same way under the hood, which makes the model easy to reason about and easy to undo."
      },
      {
        "type": "p",
        "text": "When you publish something, Elliptic mints a **secrets-based token**, a long, unguessable random string, and that token becomes the public URL. The token is the only thing standing between the world and the content, so the link is the secret. Nothing about the public surface is searchable or listed: the only way in is the link itself. Share it with the people who should see it, and treat it like a password."
      },
      {
        "type": "p",
        "text": "Public surfaces are **read-only or narrowly scoped** by design. A public board shows only the task attributes you choose. A public page renders your note as HTML and accepts anonymous comments, nothing more. A public view is a read-only list of tasks. A shared meeting shows the summary and, only if you opt in, the transcript. No public surface lets an anonymous visitor change anything inside your org."
      },
      {
        "type": "p",
        "text": "And every public surface is **revocable**. Publishing is reversible at any moment: unpublish a board, page, or view and the token is cleared, so the old URL stops resolving and returns a not-found page. Revoke a meeting share and the link goes dead. There is no separate cleanup step, the link simply stops working the instant you pull it."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Visibility caveat",
        "text": "A public link is a capability, not a wall. Anyone who has the URL can open it, and they can forward it. Elliptic does not log anonymous readers in, so you cannot tell who has visited. If something must never leave the org, do not publish it. If you published and changed your mind, unpublish or revoke immediately. Note that re-publishing the same thing mints a brand-new token, so the previous link stays dead."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Air-gapped instances",
        "text": "If your Elliptic is self-hosted on a private network, public links resolve only to people who can reach that network. A public board on `localhost` or an internal host is public only to those already inside the perimeter. On the hosted instance at elliptic.sh, a published link is reachable from the open internet. Know which one you are on before you share."
      },
      {
        "type": "p",
        "text": "Because agents are first-class members of your org, the same publish and revoke actions are available to them over the company-brain MCP. An agent can mint, change, or revoke a meeting share through `create_meeting_share`, `update_meeting_share`, and `get_meeting_share`, on your org's own key, exactly as a person would from the web app."
      },
      {
        "type": "h2",
        "text": "Public boards"
      },
      {
        "type": "p",
        "text": "A **public board** publishes a project's Kanban board to a no-login URL. It is the right tool when you want an external partner, a client, or the whole company to follow a project's progress without giving anyone a seat in your org. Visitors see the board grouped into status columns exactly as your team sees it, but as a read-only snapshot they can never edit."
      },
      {
        "type": "p",
        "text": "What makes a public board safe to share is that you decide, attribute by attribute, how much of each task is exposed. A task always shows its **identifier** (like `WEB-42`) and its **title**. Everything beyond that is opt-in. You choose from four extra visible attributes, plus status, which is always the column grouping:"
      },
      {
        "type": "ul",
        "items": [
          "**Priority**, the task's priority level. A task whose priority is `none` shows no priority badge.",
          "**Assignee presence**, whether the task is assigned or not. The board shows an `assigned` badge, never the person's name or identity, so you can signal that work is owned without exposing who owns it.",
          "**Due date**, the task's due date.",
          "**Labels**, the names of the labels attached to the task.",
          "**Status**, which is always how the board is organized: tasks are grouped into one column per status, so status is shown whether or not you select anything else."
        ]
      },
      {
        "type": "p",
        "text": "The board only ever shows real, active work. **Archived tasks** are excluded, and so are **triage items** (inbound, unaccepted work waiting in the triage queue). Tasks appear in the same order your team sees them on the board, and the public page hides any status column that has no tasks in it, so the link stays tidy."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the project board",
            "text": "Go to the project whose Kanban board you want to share."
          },
          {
            "title": "Publish the board",
            "text": "Choose to publish the board. Elliptic mints a token and gives you a public path of the form `/public/boards/<token>`."
          },
          {
            "title": "Pick the visible attributes",
            "text": "Select which of priority, assignee presence, due date, and labels should appear. Anything you do not select is simply absent from every card. Status is always shown as the column grouping."
          },
          {
            "title": "Share the link",
            "text": "Send the URL. The reader lands on a page headed \"Public board · read-only\". They see your columns, cards, and only the attributes you chose."
          }
        ]
      },
      {
        "type": "p",
        "text": "You can change your mind without re-sharing. Updating the board's privacy keeps the same token and the same URL, it only changes which attributes are visible. So you can tighten a board (drop labels, hide due dates) or loosen it later, and everyone holding the existing link sees the change the next time they load it."
      },
      {
        "type": "p",
        "text": "Unpublishing a board clears its token. The old link returns a \"Board not found\" page that tells the reader the link has been unpublished or does not exist. If you publish the same board again later, it gets a fresh token, so the previous URL never comes back to life."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Attribute changes are filtered",
        "text": "Only the five recognized attributes (status, priority, assignee, due date, labels) are ever honored. Anything else you pass is dropped on the way in. There is no way to expose task descriptions, comments, assignee names, or any other field through a public board, the surface is intentionally limited to these five."
      },
      {
        "type": "h2",
        "text": "Public pages"
      },
      {
        "type": "p",
        "text": "A **public page** publishes a note as a rendered web page anyone can read. It is the way to turn a spec, a changelog, an announcement, or a policy into a clean public document without copying it anywhere. Publishing mints a token and a path of the form `/public/pages/<token>`, and the reader sees your note's title, its icon, and its body rendered as HTML."
      },
      {
        "type": "p",
        "text": "Rendering uses a small, safe subset of Markdown: headings, bold, italic, inline code, links, bullet lists, code fences, and paragraphs. Your note's content is run through that converter into the page, and the text is escaped first, so what you write in the note is what readers see, formatted and readable, with no raw HTML injection."
      },
      {
        "type": "h3",
        "text": "Anonymous comments and abuse reports"
      },
      {
        "type": "p",
        "text": "A public page accepts **anonymous comments**. Any reader can leave a name (optional, it defaults to \"Anonymous\") and a comment body, with no account and no login. New comments appear oldest-first under the page. This makes a public page a lightweight way to collect feedback on a draft or an announcement from people outside your org."
      },
      {
        "type": "p",
        "text": "Because comments are anonymous, every comment carries a **report control** (a flag icon that appears on hover). Anyone can report a comment they consider abusive. A reported comment is hidden from the public page right away, it no longer appears to readers, so the community can keep an open page clean without waiting on a moderator."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Open the gate deliberately",
        "text": "A published page is readable and commentable by anyone with the link. If you only want feedback from named teammates, keep the note private and use in-app sharing instead. Publish a page when you genuinely want it open to the world."
      },
      {
        "type": "p",
        "text": "Unpublishing a page clears its token, and the old link returns a \"Page not found\" page. There is one more rule worth knowing: an **archived page 404s** even while a token is set. If you archive a note that was published, its public link immediately stops resolving and returns not-found, so archiving doubles as a fast way to take a page offline. Un-archive it and, if the token is still set, it resolves again."
      },
      {
        "type": "h3",
        "text": "Exporting a page"
      },
      {
        "type": "p",
        "text": "Separate from publishing, you can export any note as a file to take it out of Elliptic. Export does not create a public link, it just downloads or opens the content. There are two formats, plus print-to-PDF:"
      },
      {
        "type": "table",
        "headers": [
          "Format",
          "What you get"
        ],
        "rows": [
          [
            "Markdown",
            "A `.md` file whose first line is the note's title as a top-level heading, followed by its raw Markdown content. Ideal for moving a note into another tool or a repo."
          ],
          [
            "HTML",
            "A standalone, self-styled HTML document with the title, the rendered body, and clean built-in typography (a readable column width and styling for headings, code, and links). It opens in a browser, and because it is a complete document it also opens in a word processor."
          ],
          [
            "PDF",
            "There is no separate PDF export. Open the HTML export and use your browser's print-to-PDF. The HTML is styled to print cleanly, with a readable column width, so the printed result looks like a proper document."
          ]
        ]
      },
      {
        "type": "h2",
        "text": "Public views"
      },
      {
        "type": "p",
        "text": "A **saved view** is a named, filtered slice of your tasks (by status, assignee, label, or search). A **public view** publishes that saved view as a read-only link. It is the lightest of the public surfaces: where a public board shows a whole project's columns, a public view shows exactly the filtered list of tasks the view defines, and nothing more."
      },
      {
        "type": "p",
        "text": "Publishing a view mints a token and a path of the form `/public/views/<token>`. The reader sees the view's name and its tasks, each with its **identifier**, **title**, **status**, and **priority**. As with public boards, archived and triage tasks are excluded, and the view's own filters are applied, so the public list mirrors the view's definition. There is no editing and no per-reader gating: anyone with the link sees the same read-only dataset."
      },
      {
        "type": "p",
        "text": "Only someone who can modify the view can publish or unpublish it. Personal views are publishable by their owner, teamspace views by a team member or an admin, and org-wide team views by an admin. Unpublishing clears the token and the old link returns a \"View not found\" page."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Board or view?",
        "text": "Reach for a **public board** when you want partners to see a project's full Kanban with columns and chosen attributes. Reach for a **public view** when you want to expose one focused, filtered list, for example \"open bugs labeled customer\" or \"everything in review\", without the rest of the board."
      },
      {
        "type": "h2",
        "text": "Shared meetings with guest Ask"
      },
      {
        "type": "p",
        "text": "A **shared meeting** publishes a single meeting to a tokenized link at `/share/meetings/<token>`, so someone who was not in the room, and who has no account, can catch up. The guest view leads with what matters: the meeting title, the AI **summary**, the **action items**, and the **decisions**, pulled from the meeting's latest summary. It deliberately surfaces what was decided and who owns what, rather than replaying the whole conversation."
      },
      {
        "type": "p",
        "text": "The full **transcript is optional**. When you mint a share you choose whether to include it, and the default is off. With the transcript off, guests see only the summary, action items, and decisions. With it on, the guest view adds the timestamped, speaker-attributed transcript below the decisions. This lets you share an outcome without exposing every word that was said."
      },
      {
        "type": "h3",
        "text": "Guest Ask"
      },
      {
        "type": "p",
        "text": "Every shared meeting carries a guest **Ask** panel, headed \"Ask about this meeting\". A visitor can type a question and get an AI answer, with no login. The answer is **scoped strictly to the shared content**. If the transcript is included, the model answers from the transcript. If it is not, the model answers from the summary instead. Nothing else in your org is ever in scope, the guest cannot reach other meetings, tasks, or notes."
      },
      {
        "type": "p",
        "text": "If there is no shared context to answer from (no transcript and no summary), the guest Ask says so plainly rather than guessing, returning a message that there is not enough shared context to answer. Each answer also carries a **grounded flag** under the hood, signalling whether it was actually backed by a transcript or a summary. The page reminds guests, in a line below the Ask box, that AI answers are scoped to the meeting and that anything important should be verified."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Whose key runs the guest answer",
        "text": "There is no anonymous AI budget. A guest's question runs on **your organization's own model key (BYOK)**, on behalf of the meeting's owner. The guest never sees or supplies a key. Your org pays for, and controls, the model that answers, the same key that powers every other AI feature in Elliptic."
      },
      {
        "type": "p",
        "text": "You stay in control of a share after you mint it. You can **toggle the transcript** on or off at any time, which changes both what guests see and what their Ask can draw from, and you can **revoke** the share entirely. A revoked link goes dead immediately and the guest page shows \"This link is no longer available\", suggesting they ask the owner to share it again. Re-sharing the same meeting re-enables the existing token, and the transcript setting you pass takes effect. Only the meeting's creator or an org admin can create, change, or revoke a meeting share."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the meeting",
            "text": "Go to the meeting you want to share. Make sure it has been summarized, the summary, action items, and decisions are what guests see first."
          },
          {
            "title": "Create the share",
            "text": "Mint a public share and decide whether to include the transcript (it is left out by default). Elliptic generates the `/share/meetings/<token>` link."
          },
          {
            "title": "Send the link",
            "text": "Share the URL. Guests land on the summary, action items, and decisions, plus the transcript if you included it, and can ask questions in the guest Ask panel."
          },
          {
            "title": "Adjust or revoke",
            "text": "Later, toggle the transcript or revoke the share. Revoking kills the link at once. Toggling the transcript reshapes both the view and what guest Ask can ground on."
          }
        ]
      },
      {
        "type": "h2",
        "text": "Public intake"
      },
      {
        "type": "p",
        "text": "The public surfaces above are all about letting people **read** your work. **Public intake forms** are the inbound counterpart: a no-login link where someone outside your org can **submit** a request that lands in a project's triage queue. The boards, pages, views, and meeting shares push information out, an intake form pulls work in."
      },
      {
        "type": "p",
        "text": "An intake form lives at a tokenized link (under `/intake/<token>` or `/intake-forms/<token>`) and asks only for a short summary, optional details, and an optional name and email, no account required. On submit, the request is logged as a triage task in the target project, tagged as inbound, and the submitter gets back a reference number to track it. From there it flows through your normal triage and automations, just like any other inbound task."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Where to set intake up",
        "text": "This page covers intake only as the inbound public surface. Creating a form, choosing its target project, and managing submissions live with the triage and automations features that route inbound work, where you can also see how a submitted request becomes a triage task and gets sorted onto a board."
      },
      {
        "type": "h2",
        "text": "At a glance"
      },
      {
        "type": "table",
        "headers": [
          "Surface",
          "Public URL",
          "What's exposed",
          "Direction"
        ],
        "rows": [
          [
            "Public board",
            "`/public/boards/<token>`",
            "A project's Kanban grouped by status, with the task attributes you choose",
            "Read-only out"
          ],
          [
            "Public page",
            "`/public/pages/<token>`",
            "A note rendered as HTML, with anonymous comments and abuse reports",
            "Read + comment out"
          ],
          [
            "Public view",
            "`/public/views/<token>`",
            "A saved view's filtered task list (identifier, title, status, priority)",
            "Read-only out"
          ],
          [
            "Shared meeting",
            "`/share/meetings/<token>`",
            "Summary, action items, decisions, optional transcript, plus a scoped guest Ask",
            "Read + ask out"
          ],
          [
            "Public intake",
            "`/intake/<token>`",
            "A no-login form that submits a request into a project's triage queue",
            "Submit in"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Every row above mints a revocable, secrets-based token, and every one can be pulled back the instant you no longer want it open. Page export is the one exception that is not a link at all, it just hands you a file. When in doubt, publish narrowly, share the link only with the people who need it, and revoke the moment the work is done being public."
      }
    ]
  },
  {
    "title": "Marketplace & connectors",
    "slug": "marketplace-mcp-connectors",
    "description": "Browse the curated marketplace of apps, agents, importers, and connectors, and wire up outbound MCP connectors so your organization's agents can use the tools of remote servers like GitHub, Linear, Notion, and Sentry.",
    "blocks": [
      {
        "type": "h2",
        "text": "What this page covers"
      },
      {
        "type": "p",
        "text": "Elliptic is **Jira for your agents**: people and AI agents work the same surfaces, and agents act over the [company-brain MCP](/docs/company-brain-mcp) on your organization's own model key. This page is about extending that surface outward. Two features live here, both under **Settings**, in the **Integrations** group. The **Marketplace** is a curated, browsable registry of everything you can add to a workspace: apps, AI agents, importers, and connectors. **Connectors** let you wire your org up to remote Model Context Protocol servers, so your agents can reach the tools those servers expose, alongside everything they already do inside Elliptic."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Two directions of MCP",
        "text": "Elliptic speaks MCP both ways. **Inbound**, the company-brain MCP exposes Elliptic to outside agents. **Outbound**, connectors let your agents reach into other companies' MCP servers. The last section of this page lays the two side by side."
      },
      {
        "type": "h2",
        "text": "The marketplace"
      },
      {
        "type": "p",
        "text": "The marketplace is a curated registry of extension points for your workspace. It aggregates four kinds of things into one place, each labeled with its category: **apps** that connect Elliptic to outside systems, **AI agents** you can add as teammates, **importers** that pull work in from elsewhere, and every **connector** in the connector catalog. You reach it under **Settings, Integrations, Marketplace**."
      },
      {
        "type": "p",
        "text": "Open the marketplace and you see a short summary line, then the listings grouped by category. You can filter to a single category with the **All / Apps / Agents / Importers / Connectors** buttons at the top, or browse everything at once. Each listing shows its name, a one-line description, and a category badge."
      },
      {
        "type": "h3",
        "text": "What is in the catalog"
      },
      {
        "type": "table",
        "headers": [
          "Category",
          "Listing",
          "What it does"
        ],
        "rows": [
          [
            "App",
            "Slack",
            "Post updates and run slash commands from Slack."
          ],
          [
            "App",
            "GitHub sync",
            "Turn issues into triage items and auto-close on PR merge."
          ],
          [
            "App",
            "Email to task",
            "Forward emails into a project's triage queue."
          ],
          [
            "Agent",
            "AI agent (bot user)",
            "A non-billable AI teammate that can be assigned work and run tasks."
          ],
          [
            "Importer",
            "CSV importer",
            "Bulk-import work items from a CSV file."
          ],
          [
            "Connector",
            "Every connector",
            "Each remote MCP server in the connector catalog appears here too, so the marketplace is the single front door to the connector setup as well."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "How Set up deep-links you to the right place"
      },
      {
        "type": "p",
        "text": "Every listing carries an `install_kind` that tells Elliptic where to take you. Pressing **Set up** on a listing does not perform a generic install. It deep-links you straight to the screen where that thing is actually configured, so setup happens with the proper form and permissions in front of you."
      },
      {
        "type": "ul",
        "items": [
          "**Settings listings** open the matching settings tab. A connector opens the **Connectors** tab, the Slack app opens the integrations tab, and the AI agent opens the **AI** tab.",
          "**Project listings** open your **Projects** list, because importers and project-scoped apps (GitHub sync, Email to task, CSV importer) are wired up inside a specific project rather than org-wide."
        ]
      },
      {
        "type": "h3",
        "text": "The installed / active summary"
      },
      {
        "type": "p",
        "text": "Below the heading, the marketplace shows a live summary of what is actually live in this workspace, not just what is available to add. It counts your active AI agents and your configured connectors, rendered as a line like \"2 agents and 1 connector active\". Behind that line, Elliptic also tracks how many listings exist per category (apps, agents, importers, connectors), so the registry can show you both sides at a glance: what you could add, and what you already have."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "The marketplace is a directory, not an installer",
        "text": "Think of the marketplace as the map. It tells you what extension points exist and walks you to each one's real setup screen. The actual work of connecting Slack, adding an agent, or wiring a connector happens on the destination page that **Set up** opens."
      },
      {
        "type": "h2",
        "text": "Outbound MCP connectors"
      },
      {
        "type": "p",
        "text": "A connector is your organization's connection to a **remote MCP server** run by someone else. Once a connector is added and enabled, your org's agents can call the tools that remote server exposes. This is how a Elliptic agent reaches outside its own walls, to read a GitHub pull request, file a Linear issue, search Notion, or pull a Sentry error, using the same Model Context Protocol that powers the company brain."
      },
      {
        "type": "p",
        "text": "Connectors live under **Settings, Integrations, Connectors**. Adding, changing, and removing a connector is an **admin** action (admins and owners), because a connector grants agents new reach with stored credentials. Reading the list of connectors is available to any member of the org."
      },
      {
        "type": "h3",
        "text": "The connector catalog"
      },
      {
        "type": "p",
        "text": "You start from a curated catalog of remote servers. Four are pre-filled with the right endpoint and auth so there is nothing to look up, and a fifth lets you point at any server you run yourself."
      },
      {
        "type": "table",
        "headers": [
          "Connector",
          "Transport",
          "Auth",
          "Covers"
        ],
        "rows": [
          [
            "GitHub",
            "HTTP",
            "Bearer token",
            "Issues, pull requests, repositories, and code search."
          ],
          [
            "Linear",
            "HTTP",
            "Bearer token",
            "Linear issues, projects, and cycles."
          ],
          [
            "Notion",
            "HTTP",
            "Bearer token",
            "Notion pages, databases, and search."
          ],
          [
            "Sentry",
            "HTTP",
            "Bearer token",
            "Sentry issues and error events."
          ],
          [
            "Custom MCP server",
            "HTTP",
            "Header credential",
            "Connect any HTTP or SSE Model Context Protocol server by URL."
          ]
        ]
      },
      {
        "type": "p",
        "text": "For the four named servers the endpoint URL comes from the catalog, so you only supply a credential. For **Custom MCP server** the endpoint is blank, so you type your server's URL (for example `https://your-mcp-server/mcp`) and supply the access token the server expects."
      },
      {
        "type": "h3",
        "text": "Adding a connector"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Connectors",
            "text": "Go to **Settings, Integrations, Connectors**, or press **Set up** on any connector listing in the marketplace, which deep-links you here."
          },
          {
            "title": "Pick a server from the catalog",
            "text": "Under **Available connectors**, find the server you want and press its **+** button to open the inline add form."
          },
          {
            "title": "Set the endpoint, if needed",
            "text": "Named servers already have their endpoint URL filled in. For a **Custom MCP server**, enter the server's URL in the field that appears."
          },
          {
            "title": "Paste an access token",
            "text": "Enter the access token the remote server expects. It is stored encrypted and never shown back to you. You can leave it blank only if the server needs no credential."
          },
          {
            "title": "Connect",
            "text": "Press **Connect**. The connector is created enabled by default and joins your list of configured connectors. A toast confirms, for example, \"GitHub connected\"."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "What the credential becomes",
        "text": "For the named servers your token is sent as `Authorization: Bearer <token>` when an agent connects. A custom server can instead carry the token under a named header, but that header is set when the connector is created, not collected by the add form, so connectors you create from the UI use bearer auth. The remote server's own scopes decide what the agent can then actually do."
      },
      {
        "type": "h2",
        "text": "Managing a connector"
      },
      {
        "type": "p",
        "text": "Each configured connector shows its display name, an enable switch, a **Test** button, a **remove** button, and its endpoint URL. From here an admin controls its whole lifecycle."
      },
      {
        "type": "h3",
        "text": "Encrypted credentials"
      },
      {
        "type": "p",
        "text": "Connector credentials are encrypted at rest with your organization's key. Elliptic seals each token with AES-256-GCM under the org **key-encryption key (KEK)**, binding it to this connector's purpose with additional authenticated data of the form `mcp-connector:{org_id}`. That binding means a sealed credential cannot be decrypted in the wrong context, even within the same database. The plaintext token is never returned by the API and never rendered in the UI after you save it."
      },
      {
        "type": "h3",
        "text": "Enable, disable, delete"
      },
      {
        "type": "ul",
        "items": [
          "**Enable / disable** with the switch on the connector row. Toggling off keeps the connector and its stored credential, but takes it out of service. Toggle back on at any time, no need to re-enter the token.",
          "**Delete** with the trash button. This removes the connector and its encrypted credential from the workspace. A toast confirms \"Connector removed\". Re-adding later means supplying the credential again."
        ]
      },
      {
        "type": "h3",
        "text": "The Test button"
      },
      {
        "type": "p",
        "text": "**Test** connects to the remote server right now and lists the tools it exposes. Elliptic decrypts the stored credential, opens a session to the endpoint using a [fastmcp](https://github.com/jlowin/fastmcp) client, and calls the server's tool listing. On success you see a toast like \"Found 12 tools\" and the tool names render as badges under the connector, each tool's description available on hover. If the server returns no tools, it shows \"No tools discovered.\""
      },
      {
        "type": "p",
        "text": "When the connection fails, Test reports the error instead of tools, so you can tell a bad token from a wrong URL or an unreachable server before any agent ever tries to use it. Use Test as your sanity check right after adding a connector, and again whenever an agent reports it cannot reach the server."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Test is read-only",
        "text": "Test only asks the remote server which tools it offers. It does not run any of them and changes nothing on the other side. It is always safe to press."
      },
      {
        "type": "h2",
        "text": "Inbound vs outbound: how connectors differ from the company brain"
      },
      {
        "type": "p",
        "text": "It is easy to confuse connectors with the company-brain MCP, because both involve MCP. They point in opposite directions, and understanding which is which keeps your mental model clean."
      },
      {
        "type": "table",
        "headers": [
          "",
          "Company-brain MCP (inbound)",
          "Connectors (outbound)"
        ],
        "rows": [
          [
            "Direction",
            "Exposes Elliptic to outside agents and clients",
            "Lets your org's agents reach into other companies' MCP servers"
          ],
          [
            "Who runs the server",
            "Elliptic itself, built into the API",
            "A third party, or you, for a custom server"
          ],
          [
            "What it surfaces",
            "Your tasks, projects, meetings, notes, calendar, brain, and more, as tools",
            "Whatever tools the remote server offers: GitHub, Linear, Notion, Sentry, custom"
          ],
          [
            "Who sets it up",
            "Any member, by connecting their own MCP client through OAuth consent",
            "An org admin, by adding a connector with a stored credential"
          ],
          [
            "Credentials",
            "OAuth 2.1 token minted per consent, scoped to your permissions",
            "An access token you paste, encrypted at rest under the org KEK"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Put plainly: the **company-brain MCP** is the door in, it is how Claude Code, Cursor, or any agent acts as a first-class member inside your workspace. **Connectors** are the doors out, they are how those same agents, while operating Elliptic, can also pull from and push to the systems your team already uses. Together they let an agent live inside Elliptic and still reach the rest of your stack."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "See also",
        "text": "For the inbound side, including OAuth consent, scopes, and the full tool catalog, see [The Company-Brain MCP](/docs/company-brain-mcp). For adding AI agents that operate these surfaces on your own key, see [AI, Brain & Automations](/docs/ai-brain-automations)."
      }
    ]
  },
  {
    "title": "Organizations, teams & members",
    "slug": "organizations-teams-members",
    "description": "How to create and configure organizations, switch workspaces, manage members and invitations, build teamspaces, and find every admin setting in Elliptic.",
    "blocks": [
      {
        "type": "h2",
        "text": "Organizations, teams, and members"
      },
      {
        "type": "p",
        "text": "An **organization** (org) is the home for everything in Elliptic: your projects, tasks, notes, meetings, the activity log, your people, and your agents. Every screen in the app lives inside one org, and every org is **fully isolated** from every other one. People you invite see only the org they were invited to, and the same separation holds for agents, which are first-class members that operate the same surfaces over the company-brain MCP on the org's own key. This page covers how to create an org, configure its behavior, switch between workspaces, manage roles and invitations, group people into teams, and find every admin setting."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Where this all lives",
        "text": "Most of what follows happens under **Settings**, reachable at `/app/<your-org>/settings`. Settings is grouped, searchable, and deep-linkable: every panel has its own URL of the form `/app/<org>/settings?tab=<panel>`. This page focuses on **General**, **Members**, and **Teams**. The fine-grained permission system lives on its own **Roles** page, and the GDPR, residency, and audit-export workflows live on **Compliance** and the **Audit log**."
      },
      {
        "type": "h2",
        "text": "Organizations"
      },
      {
        "type": "p",
        "text": "An org is a tenant: a self-contained workspace with its own members, data, and configuration that never bleeds into another org. Underneath, every org-scoped table carries the org's id, so the boundary is enforced in the database, not just the UI. You can belong to many orgs at once and move between them freely, but nothing you do in one is visible from another."
      },
      {
        "type": "h3",
        "text": "Creating an organization"
      },
      {
        "type": "p",
        "text": "When you first sign in, Elliptic sends you to a workspace picker that lists every org you belong to. If you have exactly one, it takes you straight in. If you have none, it prompts you to create your first one."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the workspace picker",
            "text": "Go to the app. If you are not auto-redirected into an org, you land on the \"Choose a workspace\" screen, which lists your organizations and shows how many are available."
          },
          {
            "title": "Click \"New organization\"",
            "text": "Use the button in the header of the \"Your organizations\" card. If you have no orgs yet, the empty state shows a \"Create organization\" button instead, with the same effect."
          },
          {
            "title": "Name it",
            "text": "Enter a name such as \"Acme Inc\". The form requires at least 2 characters. There is no description field at creation time. You can add a description later through the API, and you can rename the org anytime in Settings."
          },
          {
            "title": "Click \"Create\"",
            "text": "Elliptic creates the org and drops you straight into a fresh project at `/app/<new-org>/projects?new=1`, so you can start working immediately."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "You become the owner automatically",
        "text": "Whoever creates an org is made its **owner**. Elliptic also seeds a default task workflow (the set of statuses your work moves through) for the new org so you can create tasks right away, and records a \"created\" entry in the activity log."
      },
      {
        "type": "p",
        "text": "On a self-hosted instance, an instance admin can disable workspace creation for everyone except instance admins. When creation is turned off, the \"New organization\" action is rejected with a clear message."
      },
      {
        "type": "h3",
        "text": "About the slug"
      },
      {
        "type": "p",
        "text": "Every org gets a URL-friendly **slug** derived from its name (for example, \"Acme Inc\" becomes `acme-inc`). The slug is unique across the whole instance. If your chosen name produces a slug that is already taken, a short random suffix is added automatically (for example, `acme-inc-4f9a2c`). The slug is stable: renaming your org does not change it. App URLs, however, are keyed by the org's id, not its slug, so every in-app path looks like `/app/<orgId>/…`."
      },
      {
        "type": "h3",
        "text": "Organization settings (General)"
      },
      {
        "type": "p",
        "text": "The **General** panel under Settings is where you manage the org's identity. The Organization card lets you **rename** the org and shows the **slug** in a disabled field, since the slug never changes after creation. Editing the organization requires **admin** or **owner**. A plain member can open General and view it, but the server rejects the save."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Settings → General",
            "text": "Navigate to Settings and stay on the default General panel."
          },
          {
            "title": "Edit the name",
            "text": "Change the value in the Name field. The Slug field below it is shown but disabled."
          },
          {
            "title": "Save changes",
            "text": "Click \"Save changes\". The button stays disabled until the new name is at least 2 characters and actually different from the current one."
          }
        ]
      },
      {
        "type": "p",
        "text": "The General panel also surfaces two related areas: **Deleted projects**, where you review and restore projects removed within the last 30 days, and **Project notifications**, where you tune which project events notify you. Renaming the org is recorded as an \"updated\" entry in the activity log."
      },
      {
        "type": "h3",
        "text": "Org-wide behavior flags"
      },
      {
        "type": "p",
        "text": "Beyond its name, an org carries a set of org-wide flags that change how the whole workspace operates. These are not all edited from the General panel: each one lives on the surface it governs. The flags below are stored on the organization and can also be read and set programmatically (the company-brain MCP exposes the name and description; the other flags are set through the app or the REST API)."
      },
      {
        "type": "table",
        "headers": [
          "Flag",
          "What it controls",
          "Where you set it",
          "Default"
        ],
        "rows": [
          [
            "AI enabled",
            "The org-wide AI kill switch. When off, Elliptic stops calling AI on this org's behalf across every feature, regardless of any provider key being connected.",
            "AI panel",
            "On"
          ],
          [
            "Block backward transitions",
            "When on, work items cannot move backward through the workflow (for example, from a later stage back to an earlier one). Status changes become forward-only.",
            "Workflow panel",
            "Off"
          ],
          [
            "Data residency region",
            "A region declaring where this org's data should reside. The Compliance panel offers a fixed set (United States, European Union, United Kingdom, Asia-Pacific, or Not declared). It is a recorded, audited declaration, not enforced storage sharding.",
            "Compliance panel",
            "Not declared"
          ],
          [
            "Compliance frameworks",
            "The frameworks this org claims to operate under. The Compliance panel offers SOC 2, ISO 27001, GDPR, HIPAA, and CCPA, stored as a list.",
            "Compliance panel",
            "Empty list"
          ],
          [
            "Data controller",
            "The legal entity named as data controller for this org, up to 255 characters.",
            "Compliance panel",
            "Empty"
          ],
          [
            "DPO contact",
            "The contact detail for the data protection officer, up to 255 characters.",
            "Compliance panel",
            "Empty"
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The residency and compliance flags live on Compliance",
        "text": "The residency region, compliance frameworks, data controller, and DPO contact are set on the **Compliance** panel, which is also where the GDPR data-subject export and erasure workflows run. Editing any of these flags requires admin or owner, the same as renaming the org."
      },
      {
        "type": "h3",
        "text": "Deleting an organization"
      },
      {
        "type": "p",
        "text": "Deleting an org is an **owner-only** action and it is total. The delete cascades at the database level: a single delete on the organization row removes its members, projects, tasks, notes, meetings, activity, MCP grants, invitations, teams, and everything else scoped to that org, because every org-scoped table declares `ON DELETE CASCADE` on `org_id`. Over the MCP, `delete_org` requires an explicit confirmation step before it runs."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Deletion cannot be undone",
        "text": "There is no recovery window for a deleted organization, unlike the 30-day grace period on a deleted project. When the org row goes, all of its data goes with it in the same transaction. Export anything you need first."
      },
      {
        "type": "h2",
        "text": "Switching workspaces"
      },
      {
        "type": "p",
        "text": "Because you can belong to many orgs, Elliptic makes moving between them quick. Everything you do inside an org lives under `/app/<orgId>/…`, where `orgId` is the org's id. Switching workspace simply means routing to a different `orgId`."
      },
      {
        "type": "p",
        "text": "The workspace picker lists every org you are a member of. Elliptic remembers the last org you opened: next time you sign in, it sends you straight back there. If you have only a single org, it skips the picker entirely and takes you in. Otherwise you pick one, and your choice is remembered for the next visit. Selecting an org routes you to its projects at `/app/<orgId>/projects`."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Listing your orgs programmatically",
        "text": "An agent or script can list the orgs it belongs to the same way the picker does, then operate inside whichever one it needs by passing that org's id. The membership list is per-identity, so an agent only ever sees the orgs its key is a member of."
      },
      {
        "type": "h2",
        "text": "Members and roles"
      },
      {
        "type": "p",
        "text": "Everyone with access to an org is a **member** of it, and every member holds exactly one built-in role. The roles form a strict hierarchy, from most to least powerful: **owner**, **admin**, **member**, **guest**."
      },
      {
        "type": "table",
        "headers": [
          "Role",
          "Rank",
          "In one line"
        ],
        "rows": [
          [
            "Owner",
            "Highest",
            "Full control, including managing other owners and the org's existence."
          ],
          [
            "Admin",
            "High",
            "Day-to-day management: people, teams, projects, invites, settings."
          ],
          [
            "Member",
            "Base",
            "Does the work: projects, tasks, notes, meetings. No management powers."
          ],
          [
            "Guest",
            "Lowest",
            "Limited collaborator. Capped at comment-level access on the projects they are added to."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Elliptic enforces roles on the server, so these limits hold no matter what the UI shows. The dividing line is that managing the org (people, teams, invites, projects, settings) requires **admin or higher**, while a handful of sensitive actions are reserved for **owners** only. The detailed permission matrix and any custom roles your org defines live on the **Roles** page under Settings; this page covers the built-in hierarchy and the membership guardrails."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Owner is a superset of admin",
        "text": "Anything an admin can do, an owner can do too. The owner-only powers all concern other owners: inviting someone as owner, granting or changing an owner role, and removing an owner."
      },
      {
        "type": "h3",
        "text": "Viewing the members list"
      },
      {
        "type": "p",
        "text": "Open Settings → **Members**. The Members card lists everyone in the org with their name, email, and role, in the order they joined. Your own row is marked with \"(you)\". The top of the panel shows your edition and seat usage, so admins can see how many billable seats are in use against the plan's limit."
      },
      {
        "type": "p",
        "text": "If you are an admin or owner, each row shows a role dropdown and a remove button so you can manage people inline. If you are a plain member, you see the same list but roles appear as read-only badges with no management controls."
      },
      {
        "type": "h3",
        "text": "Changing a member's role"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Settings → Members",
            "text": "You must be an admin or owner to see the role controls."
          },
          {
            "title": "Find the person",
            "text": "Locate their row in the Members list."
          },
          {
            "title": "Pick a new role",
            "text": "Use the role dropdown on their row and choose owner, admin, member, or guest. The change saves immediately."
          }
        ]
      },
      {
        "type": "p",
        "text": "Guardrails keep the org safe, and they are enforced server-side:"
      },
      {
        "type": "ul",
        "items": [
          "**You cannot change your own role.** This stops an admin self-promoting and stops an owner self-demoting out of control.",
          "**Only an owner can grant, modify, or strip an owner role.** An admin can move people between guest, member, and admin, but cannot touch anyone who is, or is becoming, an owner.",
          "**The last owner cannot be demoted.** If only one owner remains, the system refuses to lower their role, so an org always has at least one owner.",
          "**Demoting someone to guest tightens their access.** On every project, any role above commenter is dropped to commenter, and any work items assigned to them are unassigned, so a guest never holds elevated project access."
        ]
      },
      {
        "type": "p",
        "text": "Every role change is written to the activity log and recorded in the **Role audit** trail, capturing who changed whose role, from what to what."
      },
      {
        "type": "h3",
        "text": "Removing a member"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Settings → Members",
            "text": "Admin or owner only."
          },
          {
            "title": "Click the remove (trash) button",
            "text": "It sits at the end of the person's row. Your own row's remove button is disabled, so you cannot remove yourself this way."
          },
          {
            "title": "Confirm",
            "text": "The member loses access to the org immediately."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Removal cascades through teams and projects",
        "text": "When you remove someone from the org, Elliptic also strips them out of every team and every project they belonged to within that org, in the same step, so nothing is left pointing at a person who no longer has access. The owner protections still apply: only an owner can remove an owner, and the last owner cannot be removed. The removal is logged to activity and the Role audit. Over the MCP, `remove_org_member` requires an explicit confirmation step."
      },
      {
        "type": "h2",
        "text": "Invitations"
      },
      {
        "type": "p",
        "text": "You add people to an org by inviting them by email. They do not need a Elliptic account yet. When they accept (after signing in or signing up with that same email), they become members. Each invitation carries a role and, optionally, a project to drop the new member straight into."
      },
      {
        "type": "h3",
        "text": "Sending an invitation"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Settings → Members",
            "text": "The \"Invite people\" card appears only if you are an admin or owner."
          },
          {
            "title": "Enter their email",
            "text": "Type the address you want to invite, for example `teammate@company.com`."
          },
          {
            "title": "Choose a role",
            "text": "Pick the role they will join as. The dropdown offers member, admin, or guest. To invite someone directly as an owner you must be an owner yourself, and you would do that through the role controls or the API rather than this dropdown."
          },
          {
            "title": "Add to a project (optional)",
            "text": "Pick a project from the dropdown, or leave it on \"No project\". When set, accepting the invite also adds the new member to that project."
          },
          {
            "title": "Click \"Invite\"",
            "text": "Elliptic creates the invitation, emails a link to the address, and shows you a copyable invite link you can share directly."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "The invite link is shown once",
        "text": "The one-time token is only returned the moment you create the invite, which is why the copyable link appears right after you click Invite. Only a SHA-256 hash of the token is stored, never the token itself, so the link cannot be recovered later. If you lose it, revoke the invite and send a fresh one."
      },
      {
        "type": "p",
        "text": "A few rules apply when creating an invitation:"
      },
      {
        "type": "ul",
        "items": [
          "**The default role is member** if you do not pick one.",
          "**One pending invite per email per org.** If an unaccepted invite for that address already exists, you cannot create a second one. Revoke the first to change its role or project.",
          "**No inviting existing members.** If the email already belongs to a member of this org, the invite is rejected.",
          "**Invites expire after 7 days.** After that the link no longer works and you send a new one.",
          "**Owner invites are owner-only.** Only an owner can invite someone as owner; an admin attempting it is blocked.",
          "**The optional project must belong to this org.** Linking a project from another org is rejected."
        ]
      },
      {
        "type": "p",
        "text": "Creating an invite is recorded in both the activity log and the Role audit trail."
      },
      {
        "type": "h3",
        "text": "Pending invites and revoking"
      },
      {
        "type": "p",
        "text": "Below the invite form, the \"Invite people\" card lists every **pending** invite with its email and role. Each has a trash button. Click it to revoke an invite you no longer want, and the link immediately stops working. Only invites that are still pending can be revoked; an already-accepted, expired, or previously revoked one cannot."
      },
      {
        "type": "h3",
        "text": "Previewing and accepting an invite"
      },
      {
        "type": "p",
        "text": "An invite link points to an accept page at `/invite/<token>`. Before showing the accept flow, the page **previews** the invite by its token, with no sign-in required, to confirm it is real and still good. The preview returns the org name, the invited email, the role, and the **effective** status. A pending invite past its expiry reads as expired, and an unknown or garbage token reads as an invalid link rather than a working accept screen."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the invite link",
            "text": "It takes you to a \"Join <org>\" page showing which org you are joining and as what role."
          },
          {
            "title": "Sign in or sign up with the invited email",
            "text": "The account must use the exact email the invite was issued to, otherwise the server rejects it. If email verification is required on the instance, verify your email first."
          },
          {
            "title": "Accept",
            "text": "When you are signed in with the invited email and the invite is still valid, Elliptic accepts it for you, adds you to the organization (and to the linked project, if the invite had one), and takes you straight to its projects."
          }
        ]
      },
      {
        "type": "p",
        "text": "If acceptance fails, the page tells you why. Common reasons an accept is refused:"
      },
      {
        "type": "ul",
        "items": [
          "**Wrong account.** The invite was issued to a different email than the one you are signed in with.",
          "**Expired.** More than 7 days have passed; the invite is marked expired on the spot.",
          "**Already used or revoked.** The invite is no longer pending.",
          "**Already a member.** You are already in that org, so there is nothing to accept."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Elevated invites are re-validated at accept time",
        "text": "If you were invited as an admin or owner, Elliptic re-checks the inviter's standing the moment you accept. If the person who invited you has since been demoted or removed and no longer holds that level of authority, the elevated grant is rejected as stale. The granted role is also capped at owner. This keeps a departed or demoted admin from leaving behind invites that hand out power they no longer have."
      },
      {
        "type": "p",
        "text": "When an invite is accepted, a \"member added\" entry is written to the activity log and the Role audit. If the invite carried a project, the new member is added there too, at commenter level for a guest and member level otherwise."
      },
      {
        "type": "h2",
        "text": "Teams (teamspaces)"
      },
      {
        "type": "p",
        "text": "A **team**, also called a teamspace, is a named group of people inside an org with a shared purpose and a portfolio of work. A teamspace has a **name**, an optional **lead**, a **charter** (a free-text statement of what the team owns and its mission), and a **logo** built from an icon and a color. The same person can be on more than one team."
      },
      {
        "type": "p",
        "text": "Team names must be unique within the org. The lead, if set, must already be a member of the org, and is automatically added as a team member when you name them."
      },
      {
        "type": "h3",
        "text": "Who can create and manage a team"
      },
      {
        "type": "p",
        "text": "Creating and deleting teamspaces is an **admin-or-owner** action. Once a team exists, it can be managed by the **team lead** or by any org **admin or owner**: they can edit the name, charter, logo, and lead, add and remove members, and link or unlink projects. A plain member who is not the lead sees the team read-only."
      },
      {
        "type": "p",
        "text": "You can only add someone to a team if they are already a member of the org, and the same person cannot be added twice. Adding and removing team members is written to the activity log and the Role audit. When you remove someone from the whole org, they are taken off all of their teams automatically. Deleting a team is permanent, and any project owned by that team loses its team assignment."
      },
      {
        "type": "h3",
        "text": "Adding a member auto-grants project access"
      },
      {
        "type": "p",
        "text": "Teams are wired to projects, so membership carries access. When you add someone to a team, Elliptic walks every project linked to that team and ensures the new member sits at **at least member level** on each one. The grant never downgrades an existing higher role, and guests are skipped to preserve their access ceiling. This means joining a team is enough to start working on everything the team owns, with no per-project invite."
      },
      {
        "type": "h2",
        "text": "Teams and projects"
      },
      {
        "type": "p",
        "text": "A teamspace links to the projects it owns. From the team's **Projects** tab you link projects and unlink them, and every link drives the access grant described above."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the team and go to Projects",
            "text": "From Settings → Teams, open a teamspace, then choose the **Projects** tab. The tab notes that linking a project grants every team member access to it."
          },
          {
            "title": "Link a project",
            "text": "Pick a project from the dropdown and click **Link**. The underlying call accepts a list, so several projects can be attached in one request. Each newly linked project grants its team-member access to every current team member."
          },
          {
            "title": "Unlink a project",
            "text": "Use the trash icon on a linked project row to unlink it."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Unlinking is sticky",
        "text": "Unlinking a project removes the link only. It does not revoke the project memberships that the link granted, so a teammate who was given access keeps it until someone removes them from the project directly. This avoids quietly cutting off access that may also have been granted manually."
      },
      {
        "type": "h3",
        "text": "Portfolio stats and the cycles feed"
      },
      {
        "type": "p",
        "text": "Each team rolls up a **portfolio view** of the projects it owns. Team stats report the project count, the total work-item count, how many are done, and how many are overdue, with cancelled and duplicate items excluded from the totals so the numbers reflect real in-flight work."
      },
      {
        "type": "p",
        "text": "The team's **Cycles** tab shows a single feed of the **active and upcoming** cycles across all of the team's linked projects, each tagged with its project key and a progress bar of completed versus total work items. It is the fastest way to see what every project under a team is shipping right now, without opening each one."
      },
      {
        "type": "h2",
        "text": "Finding settings"
      },
      {
        "type": "p",
        "text": "Everything administrative lives under **Settings** at `/app/<org>/settings`. The surface is **grouped** into sections, **searchable** by keyword, and **deep-linkable**: each panel has a stable URL of the form `/app/<org>/settings?tab=<panel>`, so you can bookmark or link directly to, say, Roles or the audit log. Search matches both labels and keywords, so typing \"byok\", \"rbac\", or \"residency\" jumps you to the right panel."
      },
      {
        "type": "p",
        "text": "The groups and the panels inside them:"
      },
      {
        "type": "table",
        "headers": [
          "Group",
          "Panels",
          "What it covers"
        ],
        "rows": [
          [
            "General",
            "General, Appearance, Notifications",
            "Org name and slug; theme; notification preferences."
          ],
          [
            "Members & Access",
            "Members, Teams, Roles, Tokens",
            "People and invitations, teamspaces, the permission matrix and custom roles, and personal access tokens."
          ],
          [
            "Identity",
            "SSO, Sign-in, Domains, Directory, SCIM",
            "Enterprise identity: single sign-on, sign-in providers, domain verification, LDAP/AD directory, and SCIM provisioning."
          ],
          [
            "Integrations",
            "Connectors, Marketplace, Webhooks, Automations, Runner",
            "MCP connectors and external tools, the app marketplace, webhooks, automation rules, and the code runner."
          ],
          [
            "AI",
            "AI, AI Access",
            "The BYOK provider key and the AI kill switch, and which agents and AI users have access and budget."
          ],
          [
            "Customization",
            "Vocabulary, Templates, Workflow, Work types",
            "Brain vocabulary, meeting templates, workflow statuses, and the work-item hierarchy."
          ],
          [
            "Compliance & Audit",
            "Compliance, Audit log, Role audit",
            "GDPR and residency posture, the exportable audit log, and the role-change history."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Several of these connect directly to material covered elsewhere. **Roles** (under Members & Access) holds the full permission detail and any custom roles. **Compliance** (under Compliance & Audit) is where you set the residency region and compliance frameworks and run the GDPR data-subject workflows. Your edition and seat usage sit at the top of the **Members** panel. The **AI** kill switch lives on the AI panel, and **Block backward transitions** lives on the Workflow panel."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Agents reach the same surfaces",
        "text": "Elliptic is Jira for your agents. An agent added as a member or AI user operates these same surfaces over the company-brain MCP, scoped to its role and the org it belongs to, on the org's own provider key. The guardrails on this page, the owner protections, the seat and access limits, and the residency and compliance posture, apply to agents exactly as they do to people."
      }
    ]
  },
  {
    "title": "Roles & permissions",
    "slug": "roles-permissions",
    "description": "Verified corrected DocPage for roles-permissions against the Elliptic code.",
    "blocks": [
      {
        "type": "h2",
        "text": "How access works in Elliptic"
      },
      {
        "type": "p",
        "text": "Access in Elliptic is layered. Every person and every agent in your organization carries one **org role** that sets their baseline across the whole workspace. On top of that, each project can give them a separate **project role** that only applies inside that project. And when those two built-in axes are not specific enough, an admin can define **custom roles** that carry an exact set of permissions, plus a **permission matrix** that narrows access resource by resource and action by action."
      },
      {
        "type": "p",
        "text": "The model is deliberately additive and restrictive. Owners and admins always have everything. A plain member starts from a sensible baseline. Custom roles can only ever grant a member more on the permission side, or narrow them on the matrix side, and never touch what owners and admins can do. This page walks each layer in order, then ends with a quick who-can-do-what reference."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Agents are members too",
        "text": "Elliptic is Jira for your agents, so an agent is a first-class member of your organization with its own org role and project memberships. Everything on this page applies to agents exactly as it applies to people. An agent invited as a **member** with a **viewer** role on one project and a custom role on another is governed by the same rules described here, operating those surfaces over the company-brain MCP on your org's own key."
      },
      {
        "type": "h2",
        "text": "Built-in organization roles"
      },
      {
        "type": "p",
        "text": "Membership in an organization always comes with exactly one org role. There are four, and they form a strict hierarchy from least to most powerful: **guest**, **member**, **admin**, **owner**. Each higher role can do everything the role beneath it can, and endpoints across the product gate themselves on a minimum role, so granting someone admin automatically gives them every member capability as well."
      },
      {
        "type": "table",
        "headers": [
          "Role",
          "Rank",
          "What it is"
        ],
        "rows": [
          [
            "Owner",
            "Highest",
            "Full control of the organization. The person who creates an org becomes its first owner. Owners do everything an admin can, and only an owner can grant, modify, or remove the owner role on someone else."
          ],
          [
            "Admin",
            "High",
            "Manages the organization: org settings, invites, member roles, billing and plan, the model key and AI providers, integrations, automations, and custom roles. An admin cannot grant or touch the owner role."
          ],
          [
            "Member",
            "Default",
            "The standard working role and the default for invited people. Members create projects, create and assign work items, and publish pages, then work inside the projects they belong to."
          ],
          [
            "Guest",
            "Lowest",
            "A limited, free seat for outside collaborators. Guests can be brought into specific projects but are capped at view or comment level and can never be assigned work. See the limits below."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Because the hierarchy is strict, the question an endpoint asks is always \"is this caller's role at least X\". Inviting and removing members, changing roles, and editing org settings require **admin** or higher. Granting **owner** requires **owner**. There is no way to be, say, an admin for billing but a member everywhere else through the built-in roles alone. That kind of slicing is exactly what custom roles and the permission matrix exist for."
      },
      {
        "type": "h3",
        "text": "Owner protection"
      },
      {
        "type": "p",
        "text": "An organization always keeps at least one owner. Elliptic enforces this directly: you cannot demote the last remaining owner to a lower role, and you cannot remove the last remaining owner from the org. Only an owner may remove another owner, or grant the owner role to someone else."
      },
      {
        "type": "p",
        "text": "You also cannot change your own role. This keeps an admin from quietly self-promoting and keeps an owner from accidentally self-demoting out of control while other owners exist. Role changes always target someone else."
      },
      {
        "type": "h3",
        "text": "Guest limits"
      },
      {
        "type": "p",
        "text": "Guests are designed for contractors, clients, or anyone outside the core team who needs to see or comment on a slice of work without becoming a full member. Their limits are enforced, not just conventions:"
      },
      {
        "type": "ul",
        "items": [
          "**Capped to viewer or commenter on projects.** A guest may only hold the **viewer** or **commenter** project role. Trying to give a guest the member or admin project role is rejected.",
          "**Never an assignee.** A guest cannot be set as a project's intake owner or default assignee, and work items cannot be assigned to a guest.",
          "**Free seats.** Guests do not consume a billable seat. Owners, admins, and members are billable, guests are not, which is what makes them safe to hand out widely."
        ]
      },
      {
        "type": "p",
        "text": "These rules are also enforced retroactively when someone is downgraded. If you change an existing member into a guest, Elliptic automatically pulls any of their over-cap project memberships down to **commenter** and clears every work item currently assigned to them, so the guest invariants always hold the moment the role changes."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Self-joining public projects",
        "text": "When someone joins a public project on their own, the project role they get depends on their org role. A guest who self-joins lands as a **commenter**, while everyone else lands as a **member**. Same rule, applied automatically."
      },
      {
        "type": "h2",
        "text": "Project roles"
      },
      {
        "type": "p",
        "text": "The org role is the workspace-wide baseline. A **project role** is the second axis: it is granted per project, when someone is added as a project member, and it only governs what they can do inside that one project. The two combine, the org role sets the ceiling and the project role sets the access within a given project."
      },
      {
        "type": "p",
        "text": "There are four project roles, also ranked from least to most powerful:"
      },
      {
        "type": "table",
        "headers": [
          "Project role",
          "Rank",
          "Intended for"
        ],
        "rows": [
          [
            "Admin",
            "Highest",
            "Runs the project: configuration, membership, and full edit access to its work."
          ],
          [
            "Member",
            "High",
            "The normal contributor. Creates and works on items inside the project."
          ],
          [
            "Commenter",
            "Low",
            "Can read the project and add comments, but not change its work items. The ceiling for guests."
          ],
          [
            "Viewer",
            "Lowest",
            "Read-only access to the project."
          ]
        ]
      },
      {
        "type": "p",
        "text": "How the two axes combine in practice: your org role decides whether you can exist in the org at all and what org-wide actions you can take, while your project role decides your reach inside each specific project you belong to. A member of the org can be a project admin on one project and only a viewer on another. A guest, by contrast, is capped at commenter no matter what, because the guest org role overrides any attempt to grant more inside a project. For the full membership flow, default roles, and how public versus private projects affect joining, see the [Projects & Tasks](/docs/projects-and-tasks) page."
      },
      {
        "type": "h2",
        "text": "Custom roles"
      },
      {
        "type": "p",
        "text": "Sometimes owner, admin, member, and guest are too coarse. You want a \"Release manager\" who can manage automations and integrations but should not touch billing, or a \"Recruiter\" who can invite members but cannot create projects. That is what **custom roles** are for. A custom role is a named role you define inside your org that carries a precise set of permissions, and you attach it on top of someone's base member role."
      },
      {
        "type": "p",
        "text": "Custom roles live in **Settings → Roles**. Creating, editing, assigning, and deleting them requires **admin** or higher. Each role has a name that is unique within the org, an optional description, the set of permissions it grants, and an optional permission matrix (covered in the next section)."
      },
      {
        "type": "h3",
        "text": "The permission catalog"
      },
      {
        "type": "p",
        "text": "A custom role is built from a fixed catalog of twelve permission keys. You pick the ones the role should grant. These are the same keys the product checks when gating an action:"
      },
      {
        "type": "table",
        "headers": [
          "Key",
          "Grants the ability to"
        ],
        "rows": [
          [
            "`projects.create`",
            "Create projects"
          ],
          [
            "`projects.delete`",
            "Delete projects"
          ],
          [
            "`tasks.create`",
            "Create work items"
          ],
          [
            "`tasks.delete`",
            "Delete work items"
          ],
          [
            "`tasks.assign`",
            "Assign work items"
          ],
          [
            "`members.invite`",
            "Invite members"
          ],
          [
            "`members.remove`",
            "Remove members"
          ],
          [
            "`notes.publish`",
            "Publish pages"
          ],
          [
            "`automations.manage`",
            "Manage automations"
          ],
          [
            "`billing.manage`",
            "Manage billing & plan"
          ],
          [
            "`ai.manage`",
            "Manage AI providers"
          ],
          [
            "`integrations.manage`",
            "Manage integrations"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Keys outside this catalog are simply ignored. When a role is saved, Elliptic drops any permission that is not one of the twelve and de-duplicates the rest, so a role always carries a clean, well-formed set."
      },
      {
        "type": "h3",
        "text": "Defining and assigning a role"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the Roles settings",
            "text": "Go to **Settings → Roles**. You see the list of existing custom roles and a form to create a new one."
          },
          {
            "title": "Name the role",
            "text": "Give it a clear name like `Release manager`. The name must be unique within the organization, and creating a role with a name already in use is rejected."
          },
          {
            "title": "Pick its permissions",
            "text": "Check the permission keys from the catalog that this role should grant. The create form requires a name and at least one permission before it will submit."
          },
          {
            "title": "Optionally narrow with the matrix",
            "text": "If you want this role to be more restricted than a normal member on specific resources, set matrix cells (see the next section). Leave the matrix empty to grant without narrowing."
          },
          {
            "title": "Create, then assign",
            "text": "Save the role. Then assign it to a member, which attaches the custom role to that member's membership and layers its grants on top of their base member role. A membership holds at most one custom role at a time."
          }
        ]
      },
      {
        "type": "h3",
        "text": "How effective permissions resolve"
      },
      {
        "type": "p",
        "text": "At any moment, a caller has a set of **effective permissions**. Elliptic resolves them like this:"
      },
      {
        "type": "ul",
        "items": [
          "**Owners and admins always have every permission in the catalog.** Custom roles do not apply to them and cannot reduce them.",
          "**A plain member starts from a base set:** `projects.create`, `tasks.create`, `tasks.assign`, and `notes.publish`. This is what every member can do without any custom role.",
          "**A member with a custom role gets the base set plus whatever the role grants.** The two are unioned, so a custom role can only ever add permissions to a member, never remove them."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Check your own permissions",
        "text": "The roles settings reads the permission catalog and your effective grants from a single endpoint, so the UI always reflects exactly what the backend will enforce. If an action is greyed out or refused, it is because the permission it requires is not in your effective set."
      },
      {
        "type": "p",
        "text": "Because custom-role permissions are purely additive for members, they are the right tool to **extend** a member, give a trusted member the ability to manage integrations, say, without making them a full admin. To **restrict** a member below the member baseline on specific resources, use the permission matrix instead."
      },
      {
        "type": "h2",
        "text": "The permission matrix"
      },
      {
        "type": "p",
        "text": "The permission catalog answers org-wide yes-or-no questions. The **permission matrix** is finer. It lets a custom role narrow access on a per-resource, per-action basis, so you can say a role may edit only its own work items, or may read every project but create none. The matrix is the restrictive counterpart to the additive permission catalog."
      },
      {
        "type": "p",
        "text": "The matrix is a grid. Rows are resources, columns are actions on that resource, and each cell holds one of four values."
      },
      {
        "type": "table",
        "headers": [
          "Resource",
          "Actions you can constrain"
        ],
        "rows": [
          [
            "Work items (`tasks`)",
            "create, read, update, delete, comments, links, reactions"
          ],
          [
            "Projects (`projects`)",
            "create, read, update, delete"
          ],
          [
            "Comments (`comments`)",
            "create, update, delete"
          ],
          [
            "Pages (`notes`)",
            "create, read, update, delete"
          ],
          [
            "Views (`views`)",
            "create, read, update, delete"
          ],
          [
            "Cycles (`cycles`)",
            "create, read, update, delete"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Each cell you set takes one of four values, from most restrictive to least:"
      },
      {
        "type": "table",
        "headers": [
          "Cell",
          "Meaning"
        ],
        "rows": [
          [
            "`none`",
            "Deny this action outright."
          ],
          [
            "`own`",
            "Allow only on items the caller owns (where the caller is the item's owner)."
          ],
          [
            "`lead`",
            "Allow only where the caller is the lead (for example the project lead)."
          ],
          [
            "`all`",
            "Allow this action on everything."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "The additive-restrictive rule"
      },
      {
        "type": "p",
        "text": "The matrix only ever **narrows** access, and only for members an admin has explicitly constrained. The evaluation, for any resource and action, is:"
      },
      {
        "type": "ul",
        "items": [
          "**Owners and admins always allow.** The matrix never applies to them.",
          "**A member with no custom role always allows.** Without a custom role there is no matrix to consult, so the member baseline stands.",
          "**An unset cell always allows.** If a member has a custom role but that role leaves this particular cell blank, the action is permitted. You only restrict the cells you deliberately set.",
          "**A set cell resolves by its value:** `none` denies, `own` permits only when the caller owns the item, `lead` permits only when the caller is the lead, and `all` permits."
        ]
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Set only what you mean to restrict",
        "text": "Because blank cells inherit and allow, the matrix is a list of exceptions, not a full allow-list. Setting a cell to `none` or `own` is the act of taking something away from this role. Everything you leave unset keeps the normal member behavior. This is why a custom role with an empty matrix grants permissions without restricting anything."
      },
      {
        "type": "p",
        "text": "When you save a matrix, Elliptic keeps only the cells that name a known resource, a valid action for that resource, and one of the four valid values. Anything else is dropped, so a role's stored matrix is always well-formed."
      },
      {
        "type": "h3",
        "text": "Worked example"
      },
      {
        "type": "p",
        "text": "Say you want a \"Contributor\" custom role for members who should fully participate but only edit and delete their own work items, while still reading everything. You would grant the `tasks.create` permission and set these matrix cells on the `tasks` resource:"
      },
      {
        "type": "code",
        "lang": "json",
        "code": "{\n  \"tasks\": {\n    \"read\": \"all\",\n    \"update\": \"own\",\n    \"delete\": \"own\"\n  }\n}"
      },
      {
        "type": "p",
        "text": "A member assigned this role can read every work item, but can only update or delete items they own. The `create` action is left unset, so it inherits the member baseline and stays allowed. Owners and admins are unaffected, they still do everything."
      },
      {
        "type": "h2",
        "text": "Quick reference"
      },
      {
        "type": "p",
        "text": "Putting the layers together, here is who can do what. \"Org\" columns are the built-in roles, and the rightmost column shows when a plain member's access can be changed by a custom role."
      },
      {
        "type": "table",
        "headers": [
          "Capability",
          "Owner",
          "Admin",
          "Member",
          "Guest",
          "Adjustable by custom role?"
        ],
        "rows": [
          [
            "Grant or modify the owner role",
            "Yes",
            "No",
            "No",
            "No",
            "No"
          ],
          [
            "Org settings, invites, member roles",
            "Yes",
            "Yes",
            "No",
            "No",
            "No"
          ],
          [
            "Manage billing, AI providers, integrations, automations, custom roles",
            "Yes",
            "Yes",
            "No",
            "No",
            "Yes, grant via permission keys"
          ],
          [
            "Invite or remove members",
            "Yes",
            "Yes",
            "No",
            "No",
            "Yes, grant via `members.invite` / `members.remove`"
          ],
          [
            "Create projects",
            "Yes",
            "Yes",
            "Yes (base)",
            "No",
            "Already in member base, matrix can restrict"
          ],
          [
            "Delete projects",
            "Yes",
            "Yes",
            "No",
            "No",
            "Yes, grant via `projects.delete`, matrix can restrict"
          ],
          [
            "Create work items",
            "Yes",
            "Yes",
            "Yes (base)",
            "No",
            "Already in member base, matrix can restrict"
          ],
          [
            "Assign work items",
            "Yes",
            "Yes",
            "Yes (base)",
            "No",
            "Already in member base"
          ],
          [
            "Be assigned a work item",
            "Yes",
            "Yes",
            "Yes",
            "No (never)",
            "No"
          ],
          [
            "Publish pages",
            "Yes",
            "Yes",
            "Yes (base)",
            "No",
            "Already in member base"
          ],
          [
            "Hold a project role above commenter",
            "Yes",
            "Yes",
            "Yes",
            "No (viewer/commenter only)",
            "No"
          ],
          [
            "Consume a billable seat",
            "Yes",
            "Yes",
            "Yes",
            "No (free)",
            "No"
          ]
        ]
      },
      {
        "type": "p",
        "text": "If you are choosing how to scope someone, the order of thinking is: pick the right org role first, since it sets the ceiling and decides billing. Use project roles to control reach project by project. Reach for a custom role only when you need to extend a member with specific powers or narrow them on specific resources. And whenever you constrain through the matrix, remember that owners, admins, and every cell you leave blank still allow, so you are only ever carving out the exceptions you set on purpose."
      }
    ]
  },
  {
    "title": "Accounts, auth & tokens",
    "slug": "accounts-auth-tokens",
    "description": "How you sign in to Elliptic and prove who you are, from password login and two-factor codes to personal access tokens, OAuth bot apps, and social and per-org sign-in methods.",
    "blocks": [
      {
        "type": "h2",
        "text": "Signing in"
      },
      {
        "type": "p",
        "text": "Your account is a single global identity, your email address and a password, that follows you across every organization you belong to. You sign in once and Elliptic keeps you in a secure session, so you do not have to re-enter your password on every visit. When you create an account, Elliptic hashes your password with **argon2id** and never stores the plaintext. Passwords are 8 to 128 characters."
      },
      {
        "type": "p",
        "text": "On the hosted instance you sign in at [elliptic.sh](https://elliptic.sh). When you submit your email and password, Elliptic verifies the credentials and starts a session for you."
      },
      {
        "type": "h3",
        "text": "Email verification at sign-up"
      },
      {
        "type": "p",
        "text": "When the instance is configured to send email, a brand-new account starts unverified: Elliptic emails you a 6-digit code, and you confirm it before you can sign in. If your instance has no mail configured, accounts are verified automatically and you can sign in right away. The account-creation walkthrough lives in [Overview & Getting Started](/docs/overview-getting-started). This page focuses on how sign-in and tokens work once you have an account."
      },
      {
        "type": "h3",
        "text": "Session cookies"
      },
      {
        "type": "p",
        "text": "A successful login issues two short JSON Web Tokens and sets them as cookies on your browser: an **access token** that authorizes each request, and a longer-lived **refresh token** used to get a new access token when the first one expires. Both cookies are `httpOnly`, so page scripts cannot read them, and both are `SameSite=Lax`. On the hosted instance they are also marked `Secure`, so they only travel over HTTPS. You stay signed in until the refresh token expires or you log out."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Two tokens, two jobs",
        "text": "The **access token** is short-lived and proves who you are on every call. The **refresh token** lives much longer and exists only to mint a fresh access token. Keeping the access token short means a leaked one expires quickly, while the refresh token quietly keeps your session alive in the background."
      },
      {
        "type": "h3",
        "text": "Refresh and logout"
      },
      {
        "type": "p",
        "text": "When your access token expires, the web app refreshes the pair automatically: on a `401` it calls the refresh endpoint once, then retries your request, so the rotation is invisible to you. Programmatic clients can drive this themselves. The refresh endpoint accepts the refresh token either from the cookie or from the request body, and returns a new access and refresh token. Logging out clears both cookies, ending the session on that device."
      },
      {
        "type": "h3",
        "text": "Three ways the API accepts your credentials"
      },
      {
        "type": "p",
        "text": "Every authenticated request resolves your identity from one of three places, checked in this order. The first one present wins:"
      },
      {
        "type": "table",
        "headers": [
          "Method",
          "How you send it",
          "When to use it"
        ],
        "rows": [
          [
            "Bearer token",
            "`Authorization: Bearer <token>` header",
            "Scripts and API clients. Send a personal access token or a session access token here."
          ],
          [
            "API key header",
            "`x-api-key: <token>` header",
            "Tools that prefer a dedicated key header over `Authorization`."
          ],
          [
            "Session cookie",
            "The `access_token` cookie set at login",
            "The web app. Sent automatically by your browser, no header needed."
          ]
        ]
      },
      {
        "type": "p",
        "text": "If the credential starts with `cos_pat_`, Elliptic treats it as a personal access token and resolves it through the owning user. Otherwise it decodes it as a session access token. Either way the request runs as you, with exactly your permissions."
      },
      {
        "type": "p",
        "text": "You can browse the full REST surface, with every endpoint and its request and response shapes, at `/api/v1/docs` on your instance."
      },
      {
        "type": "h2",
        "text": "Two-factor authentication"
      },
      {
        "type": "p",
        "text": "Two-factor authentication (2FA) adds a second step to sign-in: after your password, you enter a rotating 6-digit code from an authenticator app. Elliptic uses **TOTP** (time-based one-time passwords), the open standard supported by Google Authenticator, 1Password, Authy, and similar apps. Codes rotate every 30 seconds, and Elliptic tolerates one period of clock drift in either direction, so a code that just turned over still works."
      },
      {
        "type": "h3",
        "text": "Turning it on"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Start setup",
            "text": "Begin enrollment from your account security settings. Elliptic generates a fresh secret and returns it along with an `otpauth://` URI you can render as a QR code."
          },
          {
            "title": "Scan the QR code",
            "text": "Open your authenticator app and scan the QR code, or paste the secret by hand. The app starts showing a new 6-digit code every 30 seconds, labeled `Elliptic` with your email."
          },
          {
            "title": "Confirm a code to enable",
            "text": "Enter the current code to finish. Elliptic verifies it against the pending secret and only then switches 2FA on. This proves your app is set up correctly before you depend on it."
          }
        ]
      },
      {
        "type": "p",
        "text": "Once 2FA is enabled, signing in takes one extra field. You submit your email and password as usual, and Elliptic tells the login screen that a code is required. You enter the current code from your app, and the session starts. Without a valid code, login does not complete."
      },
      {
        "type": "p",
        "text": "To turn 2FA off, confirm one more current code. Elliptic verifies it, then disables two-factor and discards the stored secret, so re-enabling later starts a fresh enrollment."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Keep your authenticator safe",
        "text": "The secret lives in your authenticator app. Elliptic does not issue backup codes, so if you lose the device with no backup, you lose your second factor. Use an app that backs up or syncs its codes, or enroll a backup device during setup."
      },
      {
        "type": "h2",
        "text": "Your profile"
      },
      {
        "type": "p",
        "text": "Your profile carries the basics of your identity: your **full name**, your sign-in **email**, and your preferred **locale** (which defaults to `en`). You can update your name and locale from your profile settings at any time. Your email is the stable handle for your account and is shown read-only there."
      },
      {
        "type": "p",
        "text": "The account is **global**. The same name, email, and 2FA settings apply everywhere you work, across every organization you are a member of. Switching organizations changes the workspace around you, not who you are. Your role and permissions, by contrast, are set per organization, which is covered in [Organizations & Members](/docs/organizations-teams-members)."
      },
      {
        "type": "h2",
        "text": "Personal access tokens"
      },
      {
        "type": "p",
        "text": "A **personal access token** (PAT) lets a script, a CI job, or any tool call the Elliptic API as you, without your password and without a browser session. Every token begins with the prefix `cos_pat_` so it is easy to spot, and you send it exactly like any other credential, as a `Bearer` token or in the `x-api-key` header."
      },
      {
        "type": "h3",
        "text": "Minting a token"
      },
      {
        "type": "p",
        "text": "Create a token from your access-tokens settings. You give it a name (and an optional description) so you remember what it is for, and you can set an optional expiry between 1 and 365 days. With no expiry it lasts until you revoke it."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "The plaintext shows exactly once",
        "text": "When you mint a token, Elliptic shows the full value a single time, right after creation. Copy it then and store it somewhere safe. It is hashed with SHA-256 before storage, so Elliptic cannot show it to you again. If you lose it, regenerate or revoke and create a new one."
      },
      {
        "type": "h3",
        "text": "Listing, regenerating, and revoking"
      },
      {
        "type": "ul",
        "items": [
          "**List** shows your active tokens with their metadata only: name, description, a short prefix, when each was created, when it was last used, and any expiry. The secret itself is never shown again.",
          "**Regenerate** rotates a token's secret in place. The name, description, and expiry stay, the old value stops working immediately, and you get a fresh plaintext to copy once. Use this to rotate a key without re-wiring everything that references it.",
          "**Revoke** permanently disables a token. Any request using it is rejected from that moment on."
        ]
      },
      {
        "type": "p",
        "text": "A token only ever works while your account is active. Tokens carry your identity, so anything you can reach in the API, the token can reach too. Scope them by purpose, give each automation its own, and revoke the ones you no longer use."
      },
      {
        "type": "h2",
        "text": "OAuth bot apps"
      },
      {
        "type": "p",
        "text": "When you want an automation to run on its own, on a schedule or from another service, rather than carrying a token you pasted by hand, you register an **OAuth app**. This is a confidential **client-credentials** application: it holds a client id and a secret, and it exchanges them for a token that acts as you. In agent-native terms, this is how a background agent earns its own credentials to operate the same surfaces you do."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Register the app",
            "text": "Create the app with a name. Elliptic returns a `client_id` (it looks like `app-<random>`) and a `client_secret` that begins with `cos_secret_`. The secret is shown once, just like a personal access token, so copy it immediately."
          },
          {
            "title": "Exchange credentials for a bot token",
            "text": "Your automation posts `grant_type=client_credentials` with its `client_id` and `client_secret` to the token endpoint. Elliptic validates the pair and returns a **bot token** that acts as you, the app's owner. The bot token is itself a personal access token, named `bot:<app name>`, minted on your account."
          },
          {
            "title": "Call the API as the bot",
            "text": "Use the returned token like any other credential, as a `Bearer` token. Every call runs with your identity and your permissions."
          }
        ]
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "curl -X POST https://elliptic.sh/api/v1/oauth/token \\\n  -d grant_type=client_credentials \\\n  -d client_id=app-xxxxxxxx \\\n  -d client_secret=cos_secret_xxxxxxxx"
      },
      {
        "type": "p",
        "text": "You can list your registered apps and revoke any of them. Revoking an app stops it from minting new bot tokens. Because a bot token acts as the owner, treat the client secret with the same care as a password."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Two flavors of OAuth",
        "text": "This client-credentials flow is for **your own** automations acting as you. The interactive flow, where a person connects an MCP client like Claude Code and grants it scoped access through a consent screen, is the full OAuth 2.1 story documented in [Company-Brain MCP](/docs/company-brain-mcp). Both flows share the same `/api/v1/oauth/token` endpoint; pick client-credentials when there is no human in the loop."
      },
      {
        "type": "h2",
        "text": "Social and per-org sign-in methods"
      },
      {
        "type": "p",
        "text": "Beyond email and password, Elliptic can sign you in with **Google** or **GitHub**. Pick the provider on the login screen, approve access on Google's or GitHub's side, and you land back signed in. The first time you sign in this way, Elliptic provisions your account automatically from the verified email the provider returns (just-in-time provisioning), so there is no separate registration step."
      },
      {
        "type": "p",
        "text": "Social providers appear on the login screen only when the instance has been configured with the relevant client credentials. With no credentials set, the Google and GitHub buttons are hidden and email and password remain the way in."
      },
      {
        "type": "h3",
        "text": "Choosing what your org allows"
      },
      {
        "type": "p",
        "text": "An admin or owner can set which sign-in methods their organization records as allowed, from the sign-in providers settings. These are stored per organization:"
      },
      {
        "type": "table",
        "headers": [
          "Setting",
          "What it controls"
        ],
        "rows": [
          [
            "Password",
            "Email and password sign-in."
          ],
          [
            "Magic code",
            "Email one-time-code sign-in, with no password."
          ],
          [
            "Google",
            "Sign in with a Google account."
          ],
          [
            "GitHub",
            "Sign in with a GitHub account."
          ],
          [
            "Allow self-signup",
            "Whether new users can register without an invite."
          ],
          [
            "Restrict OAuth to verified domains",
            "Intended to allow social sign-in only for verified email domains, so outsiders cannot slip in through a personal Google or GitHub account."
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Single sign-on",
        "text": "For enterprise identity, the login screen also offers **single sign-on**: enter your company domain and Elliptic hands you off to your configured SSO provider. SAML or OIDC SSO, SCIM directory provisioning, and LDAP are configured separately from the per-org sign-in toggles above. Reach for SSO and SCIM when you need to centralize identity across the whole company."
      }
    ]
  },
  {
    "title": "Enterprise identity: SSO, SCIM, LDAP & domains",
    "slug": "enterprise-identity",
    "description": "Connect your identity provider to Elliptic: verify a domain, turn on OIDC single sign-on with group sync, automate membership over SCIM 2.0, and authenticate against LDAP or Active Directory.",
    "blocks": [
      {
        "type": "h2",
        "text": "What enterprise identity gives you"
      },
      {
        "type": "p",
        "text": "Elliptic lets you put your own identity provider in front of the workspace. Instead of every person managing a separate Elliptic password, you connect the directory your company already runs, and membership follows it. There are four building blocks: you **verify a domain** to prove you own it, you connect **single sign-on (OIDC)** so people log in through your IdP, you add **SCIM 2.0** so accounts are created and deactivated automatically, and you can connect **LDAP or Active Directory** to authenticate directly against an on-prem directory. **IdP group sync** rides on top of SSO to turn directory groups into project roles."
      },
      {
        "type": "p",
        "text": "All of this is configured under **Settings**. SSO, IdP group mappings, LDAP, and verified domains are write-protected behind the org **admin** or **owner** role, while the sign-in endpoints your members hit (`/auth/sso/...`, `/auth/ldap/login`) and the SCIM endpoints your IdP hits are public, authenticated by their own signed state or bearer token rather than by a session."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Agents are members too",
        "text": "Elliptic is Jira for your agents, and an agent is a first-class member of the org just like a person. Enterprise identity governs how human accounts get into the workspace. Agents operate the same surfaces over the company-brain MCP on your org's own key (BYOK), so they sit alongside the people your IdP provisions rather than going through SSO themselves."
      },
      {
        "type": "h2",
        "text": "Domain verification"
      },
      {
        "type": "p",
        "text": "A **verified domain** is how you prove to Elliptic that your organization controls an email domain like `acme.com`. Verifying a domain unlocks domain-gated SSO, and a verified domain is **globally unique**, so one domain can be verified by exactly one workspace."
      },
      {
        "type": "p",
        "text": "You add a domain, Elliptic hands you a DNS TXT record, you publish it at your DNS provider, and then Elliptic checks for it over DNS. Until the record is found, the domain sits in a **Pending** state."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Add the domain",
            "text": "In Settings, open Verified domains, type the domain (for example `acme.com`), and select Add domain. Elliptic normalizes what you type: it strips any `http://` or `https://` and trailing slash, and if you paste a full email address it keeps only the part after the `@`. The domain is created in the Pending state."
          },
          {
            "title": "Copy the TXT record",
            "text": "Elliptic generates a unique token and shows you a TXT record of the form `elliptic-verify=<token>`. The record name is the root of the domain (shown as `@`). Use the copy button to grab the exact value."
          },
          {
            "title": "Publish it in DNS",
            "text": "At your DNS provider, add a TXT record on the domain with that `elliptic-verify=...` value. DNS changes can take a few minutes to propagate."
          },
          {
            "title": "Verify",
            "text": "Back in Elliptic, select Verify. Elliptic looks up the domain's TXT records and checks that the expected `elliptic-verify=<token>` value is present. If it is, the domain flips to Verified and records the time. If it isn't there yet, you get a clear message to add the record and allow time for DNS to propagate, and you can retry."
          }
        ]
      },
      {
        "type": "p",
        "text": "Under the hood Elliptic resolves the TXT records over **DNS-over-HTTPS** (it queries `https://dns.google/resolve`), so it needs no special network setup and works the same on the hosted instance and a self-hosted one. The lookup reads only TXT records for the exact domain you added."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "One workspace per domain",
        "text": "A domain can be verified by only one organization. When you add a domain that another workspace has already verified, Elliptic refuses it, and verification re-checks this at the moment you verify, so two workspaces can't race to claim the same domain."
      },
      {
        "type": "p",
        "text": "You can remove a domain at any time. Removing a verified domain frees it to be claimed again, so do it only when you intend to disconnect that domain from the workspace."
      },
      {
        "type": "h2",
        "text": "Single sign-on (OIDC)"
      },
      {
        "type": "p",
        "text": "**SSO** connects your organization to an **OpenID Connect** identity provider, gated by an email domain. Once it's enabled, anyone whose IdP email is on that domain can sign in through your IdP, and if they don't have a Elliptic account yet, one is created for them on first login (just-in-time provisioning). Elliptic ships OIDC today. SAML is a deferred follow-up and is not available yet."
      },
      {
        "type": "h3",
        "text": "Connect your IdP"
      },
      {
        "type": "p",
        "text": "There is one SSO connection per organization. You configure it in Settings under Single sign-on (OIDC) with these fields:"
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "What it is"
        ],
        "rows": [
          [
            "Email domain",
            "The domain SSO is gated on, for example `acme.com`. Only users whose IdP email is on this domain are accepted. The domain is stored lowercased and is unique across organizations, so a domain connected to one org's SSO can't be connected to another's."
          ],
          [
            "Issuer URL",
            "Your IdP's OIDC issuer, for example `https://idp.example.com`. Elliptic appends `/.well-known/openid-configuration` to discover the authorization, token, and userinfo endpoints automatically, so you don't enter those by hand."
          ],
          [
            "Client ID",
            "The OAuth client ID for the application you register in your IdP."
          ],
          [
            "Client secret",
            "The client secret for that application. It's encrypted at rest and never returned. When editing an existing connection, leave it blank to keep the current secret."
          ],
          [
            "Redirect URI",
            "Where the IdP sends users back after they authenticate. Elliptic pre-fills this with your instance's `/auth/sso/callback` URL. Register the same value in your IdP."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Register an OIDC application in your IdP with the redirect URI above, then paste the issuer, client ID, and client secret into Elliptic and select Save SSO. The connection carries an enabled flag, and the sign-in flow only works while it is enabled."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "The client secret is encrypted at rest",
        "text": "Your OIDC client secret is sealed with **AES-256-GCM**, the same key custody Elliptic uses for your BYOK model keys. It's stored encrypted, never sent back to the browser, and the connection you read from the API returns everything except the secret."
      },
      {
        "type": "h3",
        "text": "The sign-in flow"
      },
      {
        "type": "p",
        "text": "Once the connection is enabled and its domain is set, a member signs in through your IdP like this:"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Start by domain",
            "text": "The login surface calls `/auth/sso/start?domain=acme.com`. Elliptic finds the enabled SSO connection for that domain, reads your IdP's discovery document, and returns the IdP authorization URL with `scope=openid email profile` and a signed `state` value. If no enabled SSO is configured for the domain, it says so."
          },
          {
            "title": "Authenticate at the IdP",
            "text": "The user is sent to your IdP, signs in there, and the IdP redirects back to the configured redirect URI with an authorization `code` and the `state`."
          },
          {
            "title": "Exchange and verify",
            "text": "Elliptic calls `/auth/sso/callback?code=...&state=...`. It verifies the signed state (which is short-lived, valid for ten minutes), decrypts the client secret, exchanges the code for tokens at the IdP's token endpoint, and fetches the user's profile from the userinfo endpoint."
          },
          {
            "title": "Check the email domain",
            "text": "Elliptic reads the email from userinfo and requires its domain to match the connection's domain exactly. If the IdP returns no email, or the email is on a different domain, the login is rejected. This is the guardrail that keeps a connection scoped to the company that owns it."
          },
          {
            "title": "Provision and sign in",
            "text": "If no Elliptic account exists for that email, one is created just-in-time, marked email-verified, with the name from the IdP profile. If the user isn't yet a member of the org, they're added as a Member. Elliptic then issues the session cookies and the user is in."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Verify the domain before you point SSO at it",
        "text": "SSO matches users by the email domain on the connection, and that only means something if you actually own the domain. Verify the domain first under Verified domains, then configure SSO against the same domain."
      },
      {
        "type": "h2",
        "text": "IdP group sync"
      },
      {
        "type": "p",
        "text": "**Group sync** turns the groups your IdP reports into **project roles** inside Elliptic. You map an IdP group name to a project plus a role, and when a member signs in via SSO, the groups in their profile are reconciled against those mappings so they land in the right projects with the right access automatically. It's an extension of SSO, configured right below the SSO connection in Settings."
      },
      {
        "type": "h3",
        "text": "Map groups to project roles"
      },
      {
        "type": "p",
        "text": "Each mapping is a triple: an IdP group name, a project, and one of the project roles. Add as many as you need."
      },
      {
        "type": "table",
        "headers": [
          "Project role",
          "Grants"
        ],
        "rows": [
          [
            "Admin",
            "Full control over the project, the highest project role."
          ],
          [
            "Member",
            "Works inside the project: tasks and the board."
          ],
          [
            "Commenter",
            "Can comment but not change project structure."
          ],
          [
            "Viewer",
            "Read-only access, the lowest project role."
          ]
        ]
      },
      {
        "type": "p",
        "text": "When a user belongs to several groups that map to the same project, **the highest role wins**. So if `engineering` maps a project to Member and `eng-leads` maps the same project to Admin, a user in both gets Admin. The ranking, from lowest to highest, is Viewer, Commenter, Member, Admin."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Sync only touches synced memberships",
        "text": "Reconcile only ever adds, changes, or removes project memberships it created itself (the ones marked `synced`). Anyone you added to a project by hand is left completely alone: group sync will never change their role or remove them. Sync owns its own rows and nothing else."
      },
      {
        "type": "p",
        "text": "Reconcile computes the desired memberships from the user's groups, then: it **adds** a synced membership for any mapped project the user isn't in, **changes** the role on an existing synced membership when the mapping calls for a different role, and, when removal is enabled, **removes** synced memberships for projects the user no longer has a matching group for. Manual memberships are never in scope for any of these."
      },
      {
        "type": "p",
        "text": "By default the connection runs sync on every login, and it reads groups from the `groups` claim in the IdP profile. Auto-removal of stale synced memberships is off by default, so the conservative behavior is to grant and update access without revoking it. These are connection-level defaults rather than toggles in the Settings UI today, so out of the box you get grant-and-update sync on each login."
      },
      {
        "type": "h3",
        "text": "Dry-run preview"
      },
      {
        "type": "p",
        "text": "Before you trust a set of mappings, the API can preview exactly what a sync would do for a given user and group set without changing anything. The preview runs the same reconcile engine in **dry-run** mode and returns the diff it would apply, split into adds, changes, and removes, each listing the project and the role. Nothing is written. Use it to sanity-check a new mapping or to understand why someone is landing in a project."
      },
      {
        "type": "h2",
        "text": "SCIM 2.0 provisioning"
      },
      {
        "type": "p",
        "text": "**SCIM** lets your IdP (Okta, Microsoft Entra ID, and others) create, update, and deactivate Elliptic members automatically, so org membership tracks your directory without anyone clicking Invite. Where SSO provisions a user the first time they happen to log in, SCIM provisions them up front and deactivates them the moment they're offboarded in your IdP. Elliptic implements **SCIM 2.0** for users."
      },
      {
        "type": "h3",
        "text": "Mint a token and point your IdP at it"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Generate the token",
            "text": "In Settings under SCIM provisioning, select Generate token. Elliptic mints a per-org bearer token (it begins with `scim_`) and shows you the raw value once. Copy it immediately, it won't be shown again. Generating again rotates the token: the old one is revoked and a new one is issued."
          },
          {
            "title": "Copy the base URL",
            "text": "Elliptic shows the SCIM base URL for your org, of the form `/scim/v2/orgs/{org_id}` on your instance. The Settings page renders it as a full URL you can copy."
          },
          {
            "title": "Configure your IdP",
            "text": "In Okta or Entra, set up SCIM provisioning pointing at that base URL, with the token as the bearer credential. Your IdP will then create and manage users under `/scim/v2/orgs/{org_id}/Users`."
          }
        ]
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# SCIM base URL your IdP points at\nhttps://elliptic.sh/scim/v2/orgs/{org_id}\n\n# every request carries the per-org bearer token\nAuthorization: Bearer scim_xxxxxxxxxxxxxxxxxxxxxxxx"
      },
      {
        "type": "p",
        "text": "Every SCIM request is authenticated by that bearer token and scoped to your org. A missing or non-matching token is rejected. The Settings page shows whether a token is configured, its non-secret prefix, and when it was last used, so you can confirm your IdP is actually talking to Elliptic. You can revoke the token to cut the connection off entirely."
      },
      {
        "type": "h3",
        "text": "The provisioning lifecycle"
      },
      {
        "type": "p",
        "text": "Your IdP drives the standard SCIM Users endpoints, and Elliptic maps them onto org membership:"
      },
      {
        "type": "table",
        "headers": [
          "SCIM operation",
          "What Elliptic does"
        ],
        "rows": [
          [
            "POST /Users (provision)",
            "Reads the user's email from `userName` (falling back to the first entry in `emails`) and their name. If no Elliptic account exists for that email, it creates one just-in-time, marked email-verified. If they aren't a member of the org, it adds them as a Member, and records a `scim.user.provisioned` event."
          ],
          [
            "GET /Users, GET /Users/{id}",
            "Returns SCIM User resources for the org's members, with `active` reflecting whether the person is still a member."
          ],
          [
            "PUT /Users/{id}",
            "Sets the user active or inactive based on the resource's `active` field (defaulting to active when absent)."
          ],
          [
            "PATCH /Users/{id}",
            "Honors the common Azure and Okta 'replace active' patch op: Elliptic reads the `active` value from the operation whose path is `active` and activates or deactivates accordingly."
          ],
          [
            "DELETE /Users/{id}",
            "Deactivates the user (treated the same as setting active to false) and returns 204."
          ]
        ]
      },
      {
        "type": "p",
        "text": "Deactivating a user **drops their org membership** but preserves the account and everything they authored. Tasks, notes, meetings, and history stay intact, the person simply loses access to the workspace, and a `scim.user.deactivated` event is recorded. Re-activating them re-adds the membership as a Member."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "The last owner is protected",
        "text": "Elliptic refuses to deactivate the **last owner** of an org over SCIM. If a deactivation would remove the only remaining owner, the membership is left in place, so a misconfigured IdP rule can never lock everyone out of the workspace."
      },
      {
        "type": "h2",
        "text": "LDAP / Active Directory"
      },
      {
        "type": "p",
        "text": "If you run an on-prem **LDAP** directory or **Active Directory**, you can have Elliptic authenticate members directly against it. People sign in with their directory username and password, Elliptic binds to the directory to check the credentials, and provisions them just-in-time on the first successful sign-in. There's one LDAP connection per organization."
      },
      {
        "type": "h3",
        "text": "Connect the directory"
      },
      {
        "type": "p",
        "text": "Configure the connection in Settings under LDAP / Active Directory. The form edits these fields:"
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "What it is",
          "Example"
        ],
        "rows": [
          [
            "Server URI",
            "The directory server to connect to. Use an `ldaps://` URI for TLS.",
            "`ldaps://ad.example.com`"
          ],
          [
            "Bind DN",
            "The service account Elliptic binds as to search the directory.",
            "`cn=service,dc=example,dc=com`"
          ],
          [
            "Search base",
            "Where in the tree to search for the signing-in user.",
            "`dc=example,dc=com`"
          ],
          [
            "Search filter",
            "How to find the user by their username. `{username}` is substituted in, safely escaped.",
            "`(sAMAccountName={username})`"
          ],
          [
            "Email attribute",
            "The directory attribute that holds the user's email.",
            "`mail`"
          ],
          [
            "Bind password",
            "The service account's password. Encrypted at rest and never returned. Leave blank when editing to keep the current one.",
            "—"
          ]
        ]
      },
      {
        "type": "p",
        "text": "The connection also carries a few settings that default to standard Active Directory values: TLS is on (the connection is made over SSL when the URI uses `ldaps://`), and the given-name and family-name attributes default to `givenName` and `sn`, which are combined to build the display name. With those defaults, a standard AD setup often needs little more than the server URI, bind DN, bind password, and search base. Like the other secrets here, the bind password is encrypted at rest and never returned."
      },
      {
        "type": "h3",
        "text": "Test the connection"
      },
      {
        "type": "p",
        "text": "Before you rely on it, use **Test connection**. Elliptic performs the service bind with your bind DN and password and runs a small sample search against the search base, then returns a plain-language result. On success you get a confirmation that it connected and how many sample entries the search base returned. On failure you get a specific message, for example that the service bind failed (check the bind DN and password) or that the connection itself couldn't be made. This turns directory misconfiguration into a readable diagnostic instead of a failed login later."
      },
      {
        "type": "h3",
        "text": "The login flow"
      },
      {
        "type": "p",
        "text": "When a member signs in with their directory credentials at `/auth/ldap/login`, Elliptic runs the standard service-bind-then-rebind pattern:"
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Service bind",
            "text": "Elliptic binds to the directory as the configured service account (the bind DN and decrypted bind password). If that bind fails, the login is rejected."
          },
          {
            "title": "Search for the user",
            "text": "It runs your search filter with the submitted username substituted in (escaped to prevent injection) under the search base, requesting the email, first-name, and last-name attributes. If no entry matches, the login fails."
          },
          {
            "title": "Rebind as the user",
            "text": "It then attempts a fresh bind as the found user's distinguished name with the password they typed. A successful bind proves the password, a failed one rejects the login. This is the actual credential check."
          },
          {
            "title": "Provision and sign in",
            "text": "On success, Elliptic reads the email from the directory entry. If no Elliptic account exists for that email, it creates one just-in-time (email-verified, with the name built from the first and last attributes). If the user isn't a member of the org, it adds them as a Member, then issues the session."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Choosing between SSO, SCIM, and LDAP",
        "text": "These are complementary. **SSO (OIDC)** is the modern default for cloud IdPs and gives you browser-based login plus group sync. **SCIM** automates the membership lifecycle so accounts appear and disappear with your directory. **LDAP / Active Directory** is for authenticating directly against an on-prem directory. Many orgs run SSO for login and SCIM for provisioning together, and reach for LDAP when the source of truth lives inside the network."
      }
    ]
  },
  {
    "title": "Compliance & audit",
    "slug": "compliance-audit",
    "description": "Declare your compliance posture, handle GDPR data-subject and erasure requests, and read the filterable, exportable audit log and role-change trail.",
    "blocks": [
      {
        "type": "h2",
        "text": "Compliance and audit in Elliptic"
      },
      {
        "type": "p",
        "text": "Elliptic gives an organization four tools for governance and recordkeeping, all gathered under the **Compliance & Audit** group in **Settings**. You declare your compliance posture, handle GDPR data-subject and right-to-erasure requests, read a filterable audit log of every recorded change, and read a dedicated trail of every membership and role change. These live on the **Compliance**, **Audit log**, and **Role audit** tabs, and they are admin work."
      },
      {
        "type": "p",
        "text": "Because agents are first-class members in Elliptic, the same recordkeeping covers them. When an agent moves a task, files a note, or is added to a project, that lands in the same audit log and, where access changes, the same role audit. Each audit-log entry carries an actor type, so you can see at a glance whether an action came from a person or the system."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Admin-only",
        "text": "The data-subject export, the erasure request, the audit log, and the role audit are all restricted to **admins** and **owners**. Editing the posture fields requires the same. Regular members do not see these tabs. The plain compliance posture (residency region, frameworks, controller, DPO contact) is the only piece a member-level reader can retrieve, through the compliance endpoint."
      },
      {
        "type": "h2",
        "text": "Compliance posture"
      },
      {
        "type": "p",
        "text": "Your **compliance posture** is a declared, recorded statement of how your organization handles data. It is stored as four fields on the organization itself, set on **Settings → Compliance**, and any member can read it through the compliance endpoint while only admins can change it. It is a declaration for your records and your auditors, not an enforcement switch. In the words of the settings screen itself, the residency region is \"a recorded, audited declaration (not enforced storage sharding).\""
      },
      {
        "type": "p",
        "text": "The posture has four parts:"
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "What it is"
        ],
        "rows": [
          [
            "Data residency region",
            "Where you declare your data is held. One of United States, European Union, United Kingdom, or Asia-Pacific, or left as Not declared."
          ],
          [
            "Frameworks",
            "The compliance frameworks you assert against, chosen from `soc2`, `iso27001`, `gdpr`, `hipaa`, and `ccpa`. Any combination, toggled independently."
          ],
          [
            "Data controller",
            "The legal entity acting as data controller, a free-text field, for example your company's registered name."
          ],
          [
            "DPO contact",
            "The contact for your data protection officer, typically an email such as `dpo@example.com`."
          ]
        ]
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the Compliance tab",
            "text": "Go to **Settings** and open the **Compliance** tab under **Compliance & Audit**. You land on the **Compliance & data residency** section."
          },
          {
            "title": "Set the residency region",
            "text": "Pick a region from the **Data residency region** dropdown. Choosing **Not declared** clears it. The change saves as soon as you select it."
          },
          {
            "title": "Toggle your frameworks",
            "text": "Check the boxes for the frameworks you assert against. Each one toggles on its own and saves immediately, so you can claim, for example, `soc2` and `gdpr` together."
          },
          {
            "title": "Record the controller and DPO",
            "text": "Fill in **Data controller** with your legal entity and **DPO contact** with your data protection officer's contact. Each field saves when you click away from it. Clearing a field and clicking away removes the value."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "These live on the organization",
        "text": "The four posture fields live on the organization, alongside its name and slug, so they are part of the same org configuration you manage on the [Organizations & Members](/docs/organizations-teams-members) page. Setting `gdpr` here is also what frames the data-subject and erasure tools below as GDPR workflows."
      },
      {
        "type": "h2",
        "text": "GDPR data-subject requests"
      },
      {
        "type": "p",
        "text": "When a member exercises a data-subject access request under GDPR, you assemble a **data-subject export bundle** for them, a single document that gathers what Elliptic holds about that person inside your organization. You file it from the **Data-subject requests (GDPR)** section on the same **Compliance** tab, and the same section is where you file a right-to-erasure request."
      },
      {
        "type": "h3",
        "text": "Assembling a data-subject export bundle"
      },
      {
        "type": "p",
        "text": "The bundle has two parts. The **subject** part is the member's personal data Elliptic stores: their user id, email, full name, and their role in your organization. The **content** part is a privacy-respecting count of what they have authored, the number of authored tasks, authored notes, and authored comments, rather than the content itself. The bundle is built only for someone who is actually a member of your organization. Asking for a non-member returns a not-found error."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Pick the member",
            "text": "In **Data-subject requests (GDPR)**, choose the person from the **Select a member** dropdown. It lists everyone in your organization by name, or by email when they have no name set."
          },
          {
            "title": "Export the data",
            "text": "Click **Export data**. Elliptic assembles the bundle and downloads it to your machine as a JSON file named `data-subject-<user-id>.json`."
          },
          {
            "title": "Hand it over",
            "text": "Deliver the JSON file to the data subject, or retain it as the record of what you fulfilled. The file is the full bundle, ready to attach to your response."
          }
        ]
      },
      {
        "type": "p",
        "text": "The downloaded JSON looks like this:"
      },
      {
        "type": "code",
        "lang": "json",
        "code": "{\n  \"subject\": {\n    \"id\": \"<user-id>\",\n    \"email\": \"jordan@example.com\",\n    \"full_name\": \"Jordan Lee\",\n    \"role\": \"member\"\n  },\n  \"content\": {\n    \"authored_tasks\": 42,\n    \"authored_notes\": 7,\n    \"authored_comments\": 118\n  }\n}"
      },
      {
        "type": "h3",
        "text": "Filing a right-to-erasure request"
      },
      {
        "type": "p",
        "text": "When a member asks to be erased, you file a **right-to-erasure request**. From the same section, with the member selected, click **Request erasure**. Elliptic records the request against your organization and returns a status of `pending_review`. The request is logged for review, it does not delete the member or their content on the spot, so an admin makes the deletion decision deliberately rather than as a side effect of a button press."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Every export and erasure is audited",
        "text": "Each data-subject export records a `data_subject_exported` event, and each erasure request records an `erasure_requested` event, both with you as the actor and the subject's id captured. An erasure request also stores the reason if one was given. These events show up in the audit log below, so you always have a record of who requested what and when."
      },
      {
        "type": "h2",
        "text": "The audit log"
      },
      {
        "type": "p",
        "text": "The **audit log** is the org-wide compliance view over everything Elliptic records: every meaningful change to a task, project, note, comment, or the organization, with the actor who made it, when it happened, and the before/after values. It is the activity history read through a governance lens, on **Settings → Audit log**, and it is admin-only. Each entry tells you who did it, what they touched, what event it was, and what changed."
      },
      {
        "type": "h3",
        "text": "Filtering"
      },
      {
        "type": "p",
        "text": "The log is paginated, newest first. You narrow it with these filters:"
      },
      {
        "type": "ul",
        "items": [
          "**Entity type** — the kind of thing that changed: `task`, `project`, `organization`, `note`, `comment`, `cycle`, `milestone`, or `release`. The default is **All entities**.",
          "**Date range** — a **From** and **To** date that bound the window. Each bound is inclusive of its whole day."
        ]
      },
      {
        "type": "p",
        "text": "In the table, each row shows when it happened, the actor (with a `system` badge for automated actions whose actor resolves to **System**), the humanized event, the entity type, and the changed fields rendered as a compact `key: value` list. Rows with no recorded field changes show a dash."
      },
      {
        "type": "h3",
        "text": "CSV export"
      },
      {
        "type": "p",
        "text": "Click **Export CSV** to download the log as a spreadsheet-ready file named `audit-log.csv`. The export honors whatever filters you currently have applied, so you can scope it to a single entity type or a date range before downloading. The export returns up to **5000 rows** in one file."
      },
      {
        "type": "p",
        "text": "The CSV carries these columns:"
      },
      {
        "type": "code",
        "lang": "text",
        "code": "timestamp, actor, actor_type, entity_type, entity_id, event, changes"
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Export caps at 5000 rows",
        "text": "A single CSV export returns at most 5000 matching rows. For a busy organization with a long history, narrow the **Date range** (or filter by entity type) before exporting so the window you care about fits inside the cap."
      },
      {
        "type": "h2",
        "text": "The role and permission audit"
      },
      {
        "type": "p",
        "text": "The **role and permission audit** is a dedicated trail for one question: who changed whose access, from what to what, and when. It is separate from the general audit log because every row carries the **role before** and the **role after** of the change, so access decisions are legible on their own without digging through the wider activity stream. You read it on **Settings → Role audit**, and it is admin-only."
      },
      {
        "type": "p",
        "text": "The trail is written automatically whenever access changes in the organization. Inviting a member, a member being added when they accept an invite, removing a member, and changing a member's org role each append one immutable record. The same machinery covers project and team membership changes as well, so the scope of a row tells you which surface the change touched."
      },
      {
        "type": "table",
        "headers": [
          "Action",
          "When it is recorded"
        ],
        "rows": [
          [
            "Member invited",
            "An admin sends an invitation. The record captures the invited email and the role the invite grants."
          ],
          [
            "Member added",
            "An invited person accepts and joins the organization, recorded with the role they were granted."
          ],
          [
            "Member removed",
            "An admin removes a member, recorded with the role they had before removal."
          ],
          [
            "Org role changed",
            "A member's organization role is changed, recorded with both the role before and the role after."
          ],
          [
            "Project role changed",
            "A member's role on a project changes."
          ],
          [
            "Team member added / removed",
            "A member is added to or removed from a team."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "Filtering"
      },
      {
        "type": "p",
        "text": "Like the audit log, this trail is paginated, newest first, and filterable. You narrow it by:"
      },
      {
        "type": "ul",
        "items": [
          "**Action** — the kind of change, such as **Member invited** or **Org role changed**. The default is **All actions**.",
          "**Scope** — `org`, `project`, or `team`, the surface the grant belongs to. The default is **All scopes**.",
          "**Date range** — a **From** and **To** bound, each inclusive of its full day."
        ]
      },
      {
        "type": "p",
        "text": "Each row shows when it happened, the actor, the humanized action, the subject (falling back to the invited email for an invite that has no resolved member yet), a scope badge, and the change rendered as `role_before → role_after`. A row with no role transition, such as a plain removal, shows a dash."
      },
      {
        "type": "h3",
        "text": "CSV export"
      },
      {
        "type": "p",
        "text": "Click **Export CSV** to download the trail as `rbac-audit.csv`. As with the audit log, the export respects your current filters and returns up to **5000 rows**. It is the richer of the two exports, carrying the subject, the scope, and both role values on every row:"
      },
      {
        "type": "code",
        "lang": "text",
        "code": "timestamp, actor, actor_type, subject, scope, resource_id, action, role_before, role_after, detail"
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Two logs, two jobs",
        "text": "Reach for the **Audit log** when you need the full picture of what changed across tasks, notes, and the org. Reach for the **Role audit** when an auditor asks specifically about access, since it isolates membership and role changes and spells out the before-and-after on each one."
      }
    ]
  },
  {
    "title": "Billing, seats & onboarding",
    "slug": "billing-seats-onboarding",
    "description": "How Elliptic counts seats, what each plan lists, how the per-seat AI credit pool is sized, and how the get-started checklist drives setup for new workspaces.",
    "blocks": [
      {
        "type": "h2",
        "text": "What this page covers"
      },
      {
        "type": "p",
        "text": "Every organization in Elliptic has an **edition** (its plan), a **seat count** (who is billable and who is free), a pool of **AI credits**, and, when it is new, a **get-started checklist**. This page is the admin-facing reference for all four. It explains how a seat is counted, how a plan maps to a seat limit and a list of features, how the per-seat AI credit pool is sized, and how the onboarding checklist is computed from your live workspace. Everything here matches what the product actually does, so you can read your numbers with confidence."
      },
      {
        "type": "p",
        "text": "You will find the controls under **Settings → Members**. The **Plan & licensing** card and the **Seats** card sit at the top of that page, above the invite form and the member list. The get-started checklist appears on your organization home until you finish or dismiss it."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Agents are members too, and they are free",
        "text": "Elliptic is Jira for your agents. Your AI users (agents) operate the same surfaces as people, over the company-brain MCP on your org's own key (BYOK). They count separately from human seats and never consume a billable seat. You will see them broken out as **agents (non-billable)** wherever seats are shown."
      },
      {
        "type": "h2",
        "text": "Seats"
      },
      {
        "type": "p",
        "text": "A **seat** is a membership in your organization. Elliptic splits seats into billable and free based on the member's role, counts your agents on their own line, and shows the full breakdown by role. Nothing here requires a payment method to read. It is accounting, so you always know where you stand against your plan's limit."
      },
      {
        "type": "h3",
        "text": "Billable seats vs free seats"
      },
      {
        "type": "p",
        "text": "Your organization has four roles: **owner**, **admin**, **member**, and **guest**. The first three use a paid seat. Guests are free. So the seat math is simple:"
      },
      {
        "type": "table",
        "headers": [
          "Bucket",
          "Roles counted",
          "Billable"
        ],
        "rows": [
          [
            "Billable seats",
            "`owner`, `admin`, `member`",
            "Yes, counts against your plan's seat limit"
          ],
          [
            "Free seats",
            "`guest`",
            "No, never counted against the limit"
          ],
          [
            "Agents (non-billable)",
            "Active AI users",
            "No, counted on their own line, separate from people"
          ]
        ]
      },
      {
        "type": "p",
        "text": "**Billable seats** is the sum of your owners, admins, and members. **Free (guests)** is the count of guests. **Total members** is billable plus free. **Agents (non-billable)** is the number of your active AI users. Only billable seats are measured against your plan's `seat_limit`, so adding guests or agents never pushes you over the line."
      },
      {
        "type": "p",
        "text": "This is also why guest is the right role for an outside collaborator. A guest joins specific projects with a limited project role (viewer or commenter), takes a free seat, and is not left holding task assignments. When you demote a member to guest, Elliptic caps their project access to viewer or commenter and clears any task assignments they held. Promoting someone from guest to member is the moment they start consuming a billable seat."
      },
      {
        "type": "h3",
        "text": "The breakdown by role"
      },
      {
        "type": "p",
        "text": "The **Seats** card shows three headline numbers, **billable seats**, **free (guests)**, and **agents (non-billable)**, followed by a row of badges with the exact count per role. The badges appear in a fixed order, owner, admin, member, then guest, and a role only shows when it has at least one member. So a small team might read `owner · 1`, `member · 4`, while a larger org adds `admin · 2` and `guest · 3`."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Agents do not need a seat to work",
        "text": "Because agents are non-billable, you can run as many named AI users as your provider budget allows without buying seats for them. Each agent runs on your org's BYOK key and can carry its own monthly spend cap. See [AI, Brain & Automations](/docs/ai-brain-automations) for agent setup and budgets."
      },
      {
        "type": "h2",
        "text": "Editions and plans"
      },
      {
        "type": "p",
        "text": "An **edition** is the plan your organization is on. Every org starts on **Free**. The plan is a single setting that records three things: a billable seat limit, a per-seat AI credit figure shown on the card, and a list of features for that tier. Elliptic ships four plans."
      },
      {
        "type": "table",
        "headers": [
          "Plan",
          "Seat limit",
          "AI credits / seat (card figure)",
          "Features listed"
        ],
        "rows": [
          [
            "Free",
            "5",
            "500",
            "projects, tasks, notes, search"
          ],
          [
            "Pro",
            "50",
            "1,000",
            "Free plus dashboards, automations, cycles"
          ],
          [
            "Business",
            "200",
            "2,000",
            "Pro plus sso, audit log, custom roles"
          ],
          [
            "Enterprise",
            "100,000",
            "5,000",
            "all features"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Each step up raises the seat limit and the per-seat AI credit figure on the card, and the feature list grows. The **Free** plan lists the core surfaces, projects, tasks, notes, and search. **Pro** adds dashboards, automations, and cycles. **Business** adds the governance features, and **Enterprise** carries `*`, which the card renders as a single **all features** badge."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Plan features are descriptive, not hard gates",
        "text": "The plan stores a feature list and the **Plan & licensing** card renders it as badges, but Elliptic does not currently lock those features behind the plan. Capabilities like dashboards, automations, cycles, the RBAC audit log, and custom roles are available regardless of edition. Treat the feature badges as the catalog for a tier, not a switch that disables functionality on lower plans."
      },
      {
        "type": "h3",
        "text": "The feature badges"
      },
      {
        "type": "p",
        "text": "The Plan & licensing card lists your edition's features as small badges, with underscores rendered as spaces, so `audit_log` reads as **audit log**. The badges to know about:"
      },
      {
        "type": "ul",
        "items": [
          "**`sso`** (single sign-on), **`audit_log`** (a record of sensitive RBAC actions), and **`custom_roles`** (org-defined roles with a granular permission set) appear on **Business** and above.",
          "**`dashboards`**, **`automations`**, and **`cycles`** appear on **Pro** and above.",
          "**Enterprise** carries `*`, which the card renders as a single **all features** badge."
        ]
      },
      {
        "type": "h3",
        "text": "The over-limit flag"
      },
      {
        "type": "p",
        "text": "Your edition compares your **billable seats** against your plan's **seat limit**. When billable seats exceed the limit, the card shows a warning: you are over your seat limit, upgrade to add more billable members. When you are within the limit, it instead shows how many seats remain on your current plan, for example **2 seats remaining on Free**."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Going over the limit is a flag, not a hard block",
        "text": "Crossing the seat limit raises the over-limit warning so an admin notices and upgrades. It does not block work. Only owners, admins, and members count toward it. Guests and agents never do, so the fastest way to stay under the limit for outside collaborators is to invite them as guests."
      },
      {
        "type": "h3",
        "text": "Changing the plan"
      },
      {
        "type": "p",
        "text": "Changing the plan is an admin action. The Plan & licensing card has a plan dropdown listing all four editions, Free, Pro, Business, Enterprise. Pick a plan and the change applies immediately: the seat limit, the per-seat AI credit figure on the card, and the feature badges all update to the new edition. The API restricts the change to admins and owners, so when a member or guest tries to switch plans the request is rejected."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open Settings → Members",
            "text": "The Plan & licensing card is the first card on the page, above the Seats card and the invite form."
          },
          {
            "title": "Read your current edition",
            "text": "The card shows your plan, your billable seats against your seat limit, any non-billable agents, and the AI credits per seat for the tier. Below that is either seats remaining or the over-limit warning."
          },
          {
            "title": "Pick a new plan",
            "text": "Open the plan dropdown and choose a higher or lower edition. Owners, admins, and members carry over as the same billable seats under the new limit."
          },
          {
            "title": "See the card refresh",
            "text": "The feature badges, seat limit, and the AI credits figure all update to the chosen plan right away."
          }
        ]
      },
      {
        "type": "h2",
        "text": "AI credits"
      },
      {
        "type": "p",
        "text": "Elliptic meters AI work as **AI credits**. One AI action, any single call Elliptic makes to your model, summarizing a meeting, answering a brain question, an agent acting, uses one credit. The credit pool is sized by your billable seats, so as your team grows, your monthly allowance grows with it. You read it on the **AI credits** card under **Settings → AI**."
      },
      {
        "type": "p",
        "text": "The pool is **500 credits per billable seat per month**, and your monthly limit is **500 multiplied by your billable seats** (with a floor of one seat, so a brand-new solo org still gets a full pool). Usage is counted per calendar month and resets on the first of each month."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "The credit pool is the same on every plan",
        "text": "The AI credits card always meters against **500 credits per billable seat**, regardless of edition. The larger per-seat figure shown on the Plan & licensing card (1,000 on Pro, 2,000 on Business, 5,000 on Enterprise) is a plan-card label and does not change the metered pool today. Size your usage planning against the 500-per-seat number you see on the AI credits card."
      },
      {
        "type": "p",
        "text": "Usage is tracked against the same AI run log that records everything your models do. The AI credits card reports **used**, **limit**, and **remaining** for the current month, with a progress bar that turns red past 90 percent, so an admin can see how much of the pool is left before month-end. Because the count is just AI runs, the credit pool and your run history always agree."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Credits meter usage, your key pays the bill",
        "text": "AI credits are an allowance for how much AI work Elliptic meters. The actual model cost still runs on your own provider key (BYOK). For the full accounting of AI runs, model spend, and how usage is reported, see [AI, Brain & Automations](/docs/ai-brain-automations)."
      },
      {
        "type": "h2",
        "text": "The onboarding checklist"
      },
      {
        "type": "p",
        "text": "A new workspace shows a **Get started** checklist on the organization home. It is not a static tutorial. Every item is computed from your live workspace data, so a step ticks itself the moment the real thing exists. This makes it a reliable map of how far an org has come, which is exactly what you want as the admin standing up a new team."
      },
      {
        "type": "h3",
        "text": "The steps"
      },
      {
        "type": "p",
        "text": "There are six steps, each backed by a live count in your organization:"
      },
      {
        "type": "table",
        "headers": [
          "Step",
          "Marked done when"
        ],
        "rows": [
          [
            "Create your first project",
            "Your org has at least one project"
          ],
          [
            "Add a work item",
            "Your org has at least one task"
          ],
          [
            "Invite a teammate",
            "Your org has more than one member"
          ],
          [
            "Plan a cycle",
            "Your org has at least one cycle"
          ],
          [
            "Write a note or doc",
            "Your org has at least one note"
          ],
          [
            "Connect an AI provider",
            "Your org has at least one AI provider key"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Because each step reads a real count, there is no separate checkbox to tick. Create a project and the first step is done. Invite a second person and the teammate step is done. The checklist reports how many of the six are complete, the total, and whether the whole list is finished."
      },
      {
        "type": "h3",
        "text": "How admins use it"
      },
      {
        "type": "p",
        "text": "The checklist is the standard path for getting a workspace operational, and each step links straight to where you do it: the project, task, and cycle steps open Projects, the teammate step opens Settings → Members, the note step opens your workspace browser, and the AI step opens Settings → AI. Work down the list and you end up with a project, a first task, a second teammate, a planned cycle, a written note, and a connected model key, which is everything an org needs to actually run."
      },
      {
        "type": "ul",
        "items": [
          "**It shows progress at a glance.** A progress bar and an _N of 6 done_ label sit at the top, so you can see how complete the setup is without reading every line.",
          "**Done steps are crossed off.** Each finished step gets a check and a strikethrough, while open steps keep a link to go act on them.",
          "**Connecting AI is on the list.** Because every AI feature runs on your own key, the last step nudges you to add your provider key so agents, summaries, and brain answers can run.",
          "**It is dismissable, and it gets out of the way.** You can dismiss the checklist with the close button, and it also disappears on its own once all six steps are complete."
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Also seen during getting started",
        "text": "The same checklist is referenced in [Overview & Getting Started](/docs/overview-getting-started) as one of the first things a new org sees. Keep this page for the admin-facing detail, which step maps to which count, and use the getting-started page for the first-run walkthrough."
      }
    ]
  },
  {
    "title": "Self-hosting & operations",
    "slug": "self-hosting",
    "description": "Run your own Elliptic instance with Docker Compose: the one-command quick start, the compose stack and its environment wiring, secrets and encryption, BYOK on your own keys, releases and upgrades, and air-gapped operation.",
    "blocks": [
      {
        "type": "h2",
        "text": "Running your own Elliptic"
      },
      {
        "type": "p",
        "text": "Elliptic is open source and self-hostable, so the whole platform, your projects, tasks, meetings, notes, the activity log, the company brain, and the built-in MCP server your agents connect to, can run entirely on your own infrastructure. The fastest path is **Docker Compose**: one command brings up the database, the API, and the web app together. This page walks through that quick start, the compose stack and how its services are wired, the secrets and encryption you set before any real deployment, how AI runs on your own keys, and how to upgrade. The canonical hosted instance lives at elliptic.sh; everything here is about running the same software yourself."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Two app services and one database",
        "text": "A Elliptic deployment is three containers: **postgres** (the only stateful dependency), **api** (Python / FastAPI, which also serves the MCP server), and **web** (Next.js). The browser talks only to the web app, which proxies API calls same-origin under `/api`. Agents reach the workspace over the built-in MCP server on the same API, on your org's own key."
      },
      {
        "type": "h2",
        "text": "Quick start"
      },
      {
        "type": "p",
        "text": "You need [Docker](https://docs.docker.com/get-docker/) with the Compose plugin. Clone the repo, copy the example environment file, and bring the stack up. The build compiles both images the first time and is cached after that."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Clone and enter the repo",
            "text": "Run `git clone https://github.com/woosal1337/elliptic.git` and then `cd elliptic`."
          },
          {
            "title": "Create your env file",
            "text": "Copy the template with `cp .env.example .env`. The defaults in it are wired for local evaluation, so the stack will come up with no edits at all."
          },
          {
            "title": "Bring the stack up",
            "text": "Run `docker compose up --build`. Compose builds the api and web images, starts Postgres first, waits for it to pass its health check, then starts the API, then the web app."
          },
          {
            "title": "Open the app",
            "text": "Go to http://localhost:3000. Create your account, create your first organization, and you are in. The API is on http://localhost:8000 with a health endpoint at `/api/v1/health`."
          }
        ]
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "git clone https://github.com/woosal1337/elliptic.git\ncd elliptic\ncp .env.example .env\ndocker compose up --build\n\n# then open http://localhost:3000"
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Migrations run automatically on boot",
        "text": "You do not run database migrations by hand. The API container runs `alembic upgrade head` on every start before it serves, so a fresh database is brought fully up to schema on first boot, and an existing one is upgraded in place every time you start a newer image. Alembic is idempotent, so re-runs are safe. The API's own health check (it waits up to a 30-second start period before reporting healthy) is what the web service waits on, so by the time the web app is reachable, the database is migrated and the API is live."
      },
      {
        "type": "h2",
        "text": "The compose stack"
      },
      {
        "type": "p",
        "text": "`docker-compose.yml` defines the three services and one named volume. Each service reads a small set of environment variables, most of which are driven by your `.env` file, with sensible local defaults baked in so the stack runs out of the box for evaluation."
      },
      {
        "type": "table",
        "headers": [
          "Service",
          "Image",
          "Role"
        ],
        "rows": [
          [
            "postgres",
            "postgres:17-alpine",
            "The database. Stores all org data on the `elliptic_pgdata` volume and exposes a `pg_isready` health check that the API waits on."
          ],
          [
            "api",
            "built from apps/api",
            "FastAPI backend, MCP server, and in-process realtime relay. Listens on port 8000, runs migrations on start, and exposes a health check at `/api/v1/health`."
          ],
          [
            "web",
            "built from apps/web",
            "Next.js web app, served on port 3000. Waits for the API to be healthy, then talks to it through a same-origin `/api` proxy."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "How the services are wired"
      },
      {
        "type": "p",
        "text": "The startup order is enforced by health checks: Postgres must pass `pg_isready` before the API starts, and the API must pass its `/api/v1/health` check before the web app starts. The API connects to the database, and the web app connects to the API. The key environment variables on each service:"
      },
      {
        "type": "table",
        "headers": [
          "Variable",
          "On",
          "What it does"
        ],
        "rows": [
          [
            "DATABASE_URL",
            "api",
            "The async Postgres connection string. In compose it points at the `postgres` service: `postgresql+asyncpg://elliptic:elliptic@postgres:5432/elliptic`."
          ],
          [
            "ELLIPTIC_KEK",
            "api",
            "The key-encryption key. A 32-byte urlsafe-base64 key that encrypts every stored secret (integration, SSO, connector, and MCP signing keys, among others). See Secrets and encryption below."
          ],
          [
            "JWT_SECRET_KEY",
            "api",
            "Signs the session tokens that keep people logged in. Must be a strong, long random string in production."
          ],
          [
            "ENV",
            "api",
            "`development` (HTTP-friendly, non-secure cookies, for local eval) or `production` (secure cookies and strict secret enforcement)."
          ],
          [
            "CORS_ORIGINS",
            "api",
            "The comma-separated list of browser-facing web origins allowed to call the API. Defaults to `http://localhost:3000`."
          ],
          [
            "APP_BASE_URL",
            "api",
            "The public URL of your web app, used when the API builds links (for example invite links). Defaults to `http://localhost:3000`."
          ],
          [
            "BACKEND_ORIGIN",
            "web",
            "Where the web app's `/api` proxy forwards to. Baked into the web image at build time; defaults to the compose-internal `http://api:8000`."
          ]
        ]
      },
      {
        "type": "h3",
        "text": "The same-origin /api proxy"
      },
      {
        "type": "p",
        "text": "The browser never calls the API directly. The web app proxies any request under `/api` through to the backend at `BACKEND_ORIGIN`, using a Next.js rewrite. This means the browser only ever talks to one origin (the web app), which keeps cookies first-party and the CORS surface small. Because `BACKEND_ORIGIN` is a build argument baked into the web image, the default `http://api:8000` only needs changing if you run the web app outside this compose file (for example on a separate Next.js host that has to reach the API over a different address)."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Changing host ports",
        "text": "The API publishes on host port 8000 and the web app on 3000 by default. If either is taken on your machine, set `API_PORT` or `WEB_PORT` in your `.env` to remap the host side. The Postgres credentials are also overridable with `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`; if you change them, `DATABASE_URL` follows along because compose builds it from the same values."
      },
      {
        "type": "h2",
        "text": "Secrets and encryption"
      },
      {
        "type": "p",
        "text": "The `.env.example` defaults are deliberately public and for **local evaluation only**. Before you run Elliptic for real, you generate two fresh secrets: a key-encryption key (`ELLIPTIC_KEK`) and a JWT signing secret (`JWT_SECRET_KEY`). Both are critical, and production mode refuses to start without strong, non-default values for them."
      },
      {
        "type": "h3",
        "text": "ELLIPTIC_KEK, the key-encryption key"
      },
      {
        "type": "p",
        "text": "`ELLIPTIC_KEK` is the master key from which Elliptic encrypts every secret it stores at rest: your BYOK provider keys, your integration credentials, your SSO and LDAP configuration, your connector secrets, and the private signing key behind MCP tokens. Nothing sensitive is written to the database in the clear; it is all sealed with this key. It must be a **32-byte key, urlsafe-base64 encoded**. Elliptic validates this on startup: if the value does not decode to exactly 32 bytes, the API refuses to boot. Generate one like this:"
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# 32-byte urlsafe-base64 key-encryption key\nELLIPTIC_KEK=$(python3 -c \"import base64,os;print(base64.urlsafe_b64encode(os.urandom(32)).decode())\")"
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Treat the KEK as irreplaceable",
        "text": "If you lose or change `ELLIPTIC_KEK`, every secret encrypted under it, BYOK keys, integration tokens, SSO secrets, connector credentials, and the MCP signing key, becomes undecryptable. Store it somewhere durable and secret (a secrets manager, not the repo), back it up, and do not rotate it casually. Leaving it empty falls back to a public development key, which is fine for local evaluation and unacceptable for anything real."
      },
      {
        "type": "h3",
        "text": "JWT_SECRET_KEY, the session signing secret"
      },
      {
        "type": "p",
        "text": "`JWT_SECRET_KEY` signs the access and refresh tokens that keep your users logged in. Anyone who knows it can forge a session, so it must be a long, unpredictable random string that is unique to your deployment. Generate one with:"
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# strong JWT signing secret\nJWT_SECRET_KEY=$(openssl rand -hex 32)"
      },
      {
        "type": "h3",
        "text": "What production mode refuses to start without"
      },
      {
        "type": "p",
        "text": "Setting `ENV=production` does two things: it switches cookies to secure (so you must serve the web app over HTTPS), and it turns on strict validation of your configuration at boot. In production the API will refuse to start unless all of the following hold:"
      },
      {
        "type": "ul",
        "items": [
          "**`JWT_SECRET_KEY` is set and strong.** It cannot be empty and cannot be one of the known weak development defaults (`insecure-dev-secret`, or the `local-dev-jwt-secret-change-in-production` placeholder shipped in the compose file). A weak or default value aborts startup.",
          "**`ELLIPTIC_KEK` is set.** A missing key-encryption key in production aborts startup; the value must also decode to exactly 32 bytes, which is checked in every mode.",
          "**`CORS_ORIGINS` is not a wildcard.** Because the API allows credentialed requests, a `*` origin is rejected in production. You list your real web origins explicitly, comma-separated."
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "A minimal production .env",
        "text": "Put your real generated values in, set `ENV=production`, list your real web origin, and serve the web app behind HTTPS so the secure cookies work."
      },
      {
        "type": "code",
        "lang": "bash",
        "code": "# in .env\nELLIPTIC_KEK=$(python3 -c \"import base64,os;print(base64.urlsafe_b64encode(os.urandom(32)).decode())\")\nJWT_SECRET_KEY=$(openssl rand -hex 32)\nENV=production            # secure cookies, serve the web app over HTTPS\nCORS_ORIGINS=https://app.example.com\nAPP_BASE_URL=https://app.example.com"
      },
      {
        "type": "h3",
        "text": "MCP token signing"
      },
      {
        "type": "p",
        "text": "The built-in MCP server, the surface your agents authenticate against, mints short-lived access tokens signed with **RS256** (asymmetric signing) rather than the symmetric secret used for user sessions. On first use the instance generates an RSA signing key pair, encrypts the private key with your `ELLIPTIC_KEK`, and stores it. The matching public key is published as a **JWKS** document, so any client (and the API itself) can verify a token's signature without ever seeing the private key. Each MCP access token is bound to a specific audience (a single org, or an org-agnostic audience for multi-org tokens), is short-lived, and org membership is re-verified live on every call. This is all automatic; the only thing you provide is the KEK that protects the signing key at rest."
      },
      {
        "type": "h2",
        "text": "AI runs on your own keys (BYOK)"
      },
      {
        "type": "p",
        "text": "Self-hosting changes nothing about how AI is powered: it is always **bring-your-own-key (BYOK)**, per organization. There is no shared, pooled model account anywhere in Elliptic, not on the hosted instance and not in your own deployment. Every AI feature, meeting summaries, asking the meeting, the company brain, and AI agents acting as first-class members over the MCP server, runs on a provider key (OpenAI or Anthropic, with OpenAI-compatible endpoints also supported) that an owner or admin stores at the organization level. That key is encrypted at rest under your `ELLIPTIC_KEK` and decrypted only at call time."
      },
      {
        "type": "p",
        "text": "Because there is no fallback to any shared key, an organization with no provider key configured simply has its AI surfaces inert until a key is added. The API returns a clear \"No AI provider key configured for this organization\" rather than quietly billing some central account. The cost lands on your provider bill and your prompts and data stay under your control. The same holds for agents: an AI member operating tasks, boards, and meetings over the company-brain MCP does so on its org's key, exactly like a person's actions do."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Set the org key in Settings, not in env",
        "text": "BYOK keys are not environment variables. They are added per organization, in the workspace under Settings, and managed there (you can hold several, mark a default, and rotate with no downtime). The `ELLIPTIC_KEK` you set in `.env` is what encrypts those keys, it is not itself a model key."
      },
      {
        "type": "h2",
        "text": "Releases and upgrades"
      },
      {
        "type": "p",
        "text": "Tagged releases publish prebuilt container images to the GitHub Container Registry (GHCR), so you do not have to build from source for a real deployment. The two images are:"
      },
      {
        "type": "ul",
        "items": [
          "`ghcr.io/woosal1337/elliptic-api`, the backend, MCP server, and realtime relay.",
          "`ghcr.io/woosal1337/elliptic-web`, the Next.js web app."
        ]
      },
      {
        "type": "p",
        "text": "To upgrade, pull the newer image tags and recreate the api and web services. Because the API runs its Alembic migrations automatically on start, restarting onto a newer api image upgrades the database schema in place, there is no separate migration step. Postgres data persists across upgrades on the `elliptic_pgdata` named volume, so recreating containers does not lose anything."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Pin the new version",
            "text": "Point your compose file (or deployment manifests) at the GHCR images for the release tag you want, instead of building locally."
          },
          {
            "title": "Pull and recreate",
            "text": "Run `docker compose pull` then `docker compose up -d`. The API starts on the new image, applies any pending migrations, and reports healthy before the web app comes back."
          },
          {
            "title": "Confirm it is live",
            "text": "Check the API health endpoint at `/api/v1/health` and load the web app. Your data on the Postgres volume carries over untouched."
          }
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Flip to production when you go live",
        "text": "The single most important switch when moving from evaluation to a real deployment is `ENV=production` together with fresh `ELLIPTIC_KEK` and `JWT_SECRET_KEY` and a non-wildcard `CORS_ORIGINS`. Production mode is what enforces secure cookies and rejects weak or default secrets, so making the switch is what turns an evaluation stack into a hardened one."
      },
      {
        "type": "h2",
        "text": "Beyond Compose"
      },
      {
        "type": "p",
        "text": "Docker Compose is the fastest way to run Elliptic, but it is not the only one. For Kubernetes (a Helm chart or raw manifests), Docker Swarm, and a complete configuration reference, see `apps/api/SELF-HOSTING.md` and the `apps/api/deploy/` directory in the repository (`deploy/helm`, `deploy/k8s`, and `deploy/swarm`). The same two images and the same environment contract described above apply across all of them."
      },
      {
        "type": "h2",
        "text": "Air-gapped operation and offline licensing"
      },
      {
        "type": "p",
        "text": "Elliptic can run with zero outbound network egress. In **air-gapped mode**, the instance disables the features that would reach the public internet: web search in the company brain is turned off, and outbound link unfurls and embeds (the previews Elliptic would otherwise fetch when you paste a URL) are suppressed. This lets you run the platform fully inside a closed network. Air-gapped deployments also use **offline licenses**, signed license keys that an instance can verify locally without any phone-home."
      },
      {
        "type": "p",
        "text": "Both air-gapped mode and offline licensing are configured by an instance administrator on the **Instance administration** page, not through the Compose environment. Its General tab holds the air-gapped toggle, the Users tab manages instance-wide users, and the License tab is where you paste and activate an offline license key."
      }
    ]
  },
  {
    "title": "Instance administration & licensing",
    "slug": "instance-administration",
    "description": "Adversarial verification complete. The page was already highly accurate against the code. Corrections made below.",
    "blocks": [
      {
        "type": "h2",
        "text": "What instance administration is"
      },
      {
        "type": "p",
        "text": "Most of Elliptic is scoped to a single organization. Owners and admins manage their own workspace and never touch anyone else's. Instance administration sits one level above that. It is the control plane for the whole deployment, the Elliptic instance itself, across every organization it hosts. This is where you set the instance name, decide who can create workspaces, turn the deployment fully offline, manage user accounts no matter which orgs they belong to, and activate a license."
      },
      {
        "type": "p",
        "text": "This page is for whoever runs the instance. On the hosted instance at elliptic.sh that is the Elliptic team. On a self-hosted deployment it is you. Either way the surfaces and rules are identical, and they all live behind a single role."
      },
      {
        "type": "h2",
        "text": "The instance admin role"
      },
      {
        "type": "p",
        "text": "An **instance admin** is a cross-org administrator. Unlike an org owner or admin, whose authority stops at the boundary of their organization, an instance admin acts on the deployment as a whole. The flag lives on your user account (`is_instance_admin`), not on any org membership, so it follows you regardless of which workspaces you are a member of, and you do not need to belong to an org to exercise it."
      },
      {
        "type": "p",
        "text": "Every instance endpoint is gated by `require_instance_admin`. If your account does not carry the instance-admin flag, the request is rejected with an Instance-administrator-access-required error, and the admin page in the web app quietly redirects you back into the app. There is no partial access. You either hold the role or you do not."
      },
      {
        "type": "p",
        "text": "You reach the instance admin surface in the web app at the `/admin` route. It opens onto three tabs, General, Users, and License, which map to the three areas covered below."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Agents and the instance role",
        "text": "Instance administration is intentionally human-scoped. Agents in Elliptic are first-class members of an organization and operate org surfaces over the company-brain MCP on the org's own key, but the instance-admin flag is an account-level grant. Reserve it for the people who actually run the deployment."
      },
      {
        "type": "h3",
        "text": "Self-protection guards"
      },
      {
        "type": "p",
        "text": "Because instance admins are powerful, two actions are blocked even for them, to stop you from locking yourself out or stranding the instance:"
      },
      {
        "type": "ul",
        "items": [
          "**You cannot suspend your own account.** Attempting to suspend yourself returns a You-cannot-suspend-your-own-account error. You can suspend any other user.",
          "**You cannot revoke your own instance-admin access.** Attempting to revoke your own admin rights returns a You-cannot-revoke-your-own-instance-admin-access error. Another instance admin can revoke yours, but you cannot remove the last hold you have on the instance by accident."
        ]
      },
      {
        "type": "p",
        "text": "Both guards are checked by identity, the actor compared against the target user. They do not stop you from acting on anyone else, so you can still suspend or demote a second admin if you have to."
      },
      {
        "type": "h2",
        "text": "Instance settings"
      },
      {
        "type": "p",
        "text": "Instance settings are a single shared record for the whole deployment, edited from the General tab. The first time an instance admin opens settings the record is created with sensible defaults, so there is nothing to seed by hand. Five fields are configurable:"
      },
      {
        "type": "table",
        "headers": [
          "Setting",
          "What it controls",
          "Default"
        ],
        "rows": [
          [
            "Instance name",
            "The display name for this deployment. Useful for distinguishing a staging instance from production, or for putting your company's name on a self-hosted install.",
            "Elliptic"
          ],
          [
            "Allow workspace creation",
            "Whether ordinary users may create new organizations. When off, only instance admins can create workspaces. Enforced at org-create time, not just hidden in the UI.",
            "On"
          ],
          [
            "Usage telemetry",
            "Whether the instance shares anonymous usage metrics to help improve Elliptic. Off by default, so a fresh install reports nothing until you opt in.",
            "Off"
          ],
          [
            "Air-gapped mode",
            "Zero-egress mode that blocks all outbound network calls. Covered in detail below.",
            "Off"
          ],
          [
            "Email from-address",
            "The from-address Elliptic uses when it sends email, for example no-reply@example.com. Optional, and left empty by default.",
            "Empty"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Changes save as you make them. Toggles apply on switch, and text fields like the instance name and the email from-address commit when you move focus away. A blank instance name is ignored so you cannot accidentally clear it, and clearing the email field stores an empty value so the from-address is simply unset."
      },
      {
        "type": "h3",
        "text": "Workspace creation, enforced where it matters"
      },
      {
        "type": "p",
        "text": "Turning off allow-workspace-creation is a real gate, not a cosmetic one. When a user tries to create an organization, Elliptic checks the instance setting first. If creation is disabled and the user is not an instance admin, the request is refused with a Workspace-creation-is-disabled-on-this-instance error before any org is written. Instance admins are always exempt, so you can still spin up workspaces even when everyone else is locked out. This is the right control for a single-tenant deployment, or for an instance where you want to provision every org centrally."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Locking down a private deployment",
        "text": "On a self-hosted instance meant for one company, turn off allow-workspace-creation after you have created the orgs you need. From then on, only instance admins can add workspaces, and ordinary members work entirely inside the orgs you provisioned for them."
      },
      {
        "type": "h2",
        "text": "Managing users across orgs"
      },
      {
        "type": "p",
        "text": "The Users tab lists every account on the instance, not just members of one org. For each user you see their name and email, the number of workspaces they belong to (`org_count`), whether they are an instance admin, and whether they are currently suspended. Accounts are ordered by when they were created, so the earliest users sit at the top. The list returns up to two hundred users."
      },
      {
        "type": "p",
        "text": "From this one place you can suspend and reinstate accounts and grant or revoke instance-admin rights. These are the four user actions available to an instance admin."
      },
      {
        "type": "h3",
        "text": "Suspending and reinstating accounts"
      },
      {
        "type": "p",
        "text": "Suspending a user is the instance-wide off switch. It does not delete anything. It stamps the account with a suspension timestamp, and from that moment authentication rejects it everywhere. A suspended user trying to sign in, whether with a normal session token or a personal access token, is turned away with a This-account-has-been-suspended error. The block is enforced at the authentication layer, so it applies to every org and every surface at once, including the API and the company-brain MCP, with no per-org cleanup needed."
      },
      {
        "type": "p",
        "text": "Reinstating is the exact reverse. It clears the suspension timestamp and the account can sign in again immediately, with all of its org memberships and data intact, exactly as before."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the Users tab",
            "text": "Go to the /admin route and select Users. Each row shows the account with badges for instance admin and suspended state."
          },
          {
            "title": "Suspend the account",
            "text": "Select Suspend on the user's row. The account is marked suspended right away and is rejected the next time it tries to authenticate. You cannot suspend your own account."
          },
          {
            "title": "Reinstate when ready",
            "text": "To restore access, select Reinstate on the same row. The suspension is cleared and the user can sign in again with everything intact."
          }
        ]
      },
      {
        "type": "h3",
        "text": "Granting and revoking instance-admin rights"
      },
      {
        "type": "p",
        "text": "Make admin sets the instance-admin flag on a user, giving them the full cross-org control plane described on this page. Revoke admin clears it. The change takes effect on the account immediately, and from then on that user passes or fails the `require_instance_admin` gate accordingly."
      },
      {
        "type": "p",
        "text": "Keep the circle small. Instance admins can see and act on every account and every workspace, configure the deployment, and manage licensing. Grant the role only to people who actually run the instance. Remember the self-protection guard: you can promote anyone and demote anyone else, but you can never revoke your own admin access, so an instance always keeps at least the admin who is acting."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Suspension blocks sign-in, it does not delete anything",
        "text": "Suspension is enforced at authentication, so it stops new and continued access cleanly without touching the user's memberships or content. When you reinstate, nothing has to be rebuilt. If you need to remove someone from a single workspace rather than the whole instance, do that from the organization's member settings instead."
      },
      {
        "type": "h2",
        "text": "Air-gapped mode"
      },
      {
        "type": "p",
        "text": "Air-gapped mode turns the instance into a zero-egress deployment. When it is on, Elliptic makes no outbound network calls of its own, which is what you want for a fully offline or network-isolated install where data is never allowed to leave the perimeter. You enable it with a single toggle in the General tab, and the setting is read live by every feature that would otherwise reach out."
      },
      {
        "type": "p",
        "text": "Concretely, air-gapped mode disables the following:"
      },
      {
        "type": "ul",
        "items": [
          "**Web search.** The AI web-search feature, which normally fetches results and has your org's model synthesize a grounded answer, is refused with a Web-search-is-disabled-in-air-gapped-mode error before any outbound request is made.",
          "**Outbound link unfurls.** When you paste a URL, Elliptic would normally fetch the page to pull a title, description, and preview image. In air-gapped mode it skips that fetch entirely and returns only the metadata it can derive from the URL itself, so no request leaves the instance. Embeds that render as an iframe are unaffected because they never required a server-side fetch.",
          "**Telemetry.** With zero egress there is no anonymous-usage reporting. Keeping telemetry off is the consistent posture for an air-gapped install."
        ]
      },
      {
        "type": "p",
        "text": "Air-gapped mode does not break AI. Your organization still runs every AI feature on its own model key, the BYOK rule that holds everywhere in Elliptic. To stay fully offline you point that key at a local model through a custom base URL, so summaries, answers, agents, and runs all execute inside your network. Web search is the one AI capability that genuinely needs the open internet, which is why it is the feature that gets switched off."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Offline by construction",
        "text": "Air-gapped mode is read fresh on every gated call, so flipping the toggle takes effect instantly with no restart. Combined with a local model behind a custom base URL and offline licensing below, it lets a Elliptic instance run with no dependency on the outside network at all."
      },
      {
        "type": "h2",
        "text": "Offline licensing"
      },
      {
        "type": "p",
        "text": "Elliptic licenses are offline by design. There is no phone-home, no license server to reach, and no callback at activation. A license is a signed key that an instance admin pastes in once, and the instance verifies it locally. That is what makes licensing work inside an air-gapped deployment that can never reach a vendor endpoint."
      },
      {
        "type": "p",
        "text": "A license records four things: the **plan**, the number of **seats**, the **licensee** (who the license is issued to), and an optional **expiry**. The instance keeps one active license at a time, and you manage it from the License tab."
      },
      {
        "type": "h3",
        "text": "How a license key works"
      },
      {
        "type": "p",
        "text": "A license key is a signed token. The plan, seats, licensee, and expiry are encoded into it and the whole thing is signed, so the key carries its own claims and cannot be altered without breaking the signature. Activation verifies that signature offline against the instance secret. If the key has been tampered with in any way, or is otherwise invalid, verification fails and activation is refused with an Invalid-or-tampered-license-key error. Nothing is recorded. A valid, untampered key activates with no network access whatsoever."
      },
      {
        "type": "h3",
        "text": "Activating a license"
      },
      {
        "type": "p",
        "text": "On the License tab the instance shows a status badge, either the active plan and seat count, or Unlicensed. To activate, paste your offline license key into the field and select Activate."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Open the License tab",
            "text": "Go to the /admin route and select License. If no license is active yet the badge reads Unlicensed."
          },
          {
            "title": "Paste the key",
            "text": "Paste the signed offline license key into the Activate a license key field. Keys are long signed tokens, so paste the whole thing exactly as issued."
          },
          {
            "title": "Activate",
            "text": "Select Activate. The instance verifies the signature offline. On success it records the plan, seats, licensee, and expiry, marks the new license active, and deactivates any license that was active before. A tampered or invalid key is rejected and nothing changes."
          }
        ]
      },
      {
        "type": "p",
        "text": "Activating a new key always supersedes the old one. The instance flips any previously active license to inactive before recording the new one, so there is exactly one active license at any moment and re-licensing is just a fresh activation."
      },
      {
        "type": "h3",
        "text": "Viewing and delinking the active license"
      },
      {
        "type": "p",
        "text": "The License tab shows the current license whenever one is active: the licensee, the plan, the seat count, and the expiry date if the key carries one. If nothing is active it shows Unlicensed instead."
      },
      {
        "type": "p",
        "text": "**Delinking** deactivates the current license. Select Delink license and the active license is flipped to inactive and the instance returns to the Unlicensed state. Delinking does not destroy the key. You can re-activate the same key later, or activate a different one. It is the clean way to move a license between instances or to wind one down."
      },
      {
        "type": "h3",
        "text": "Issuing signed keys"
      },
      {
        "type": "p",
        "text": "Instance admins can also mint new license keys. Issuing takes a plan, a seat count, an optional licensee, and an optional number of days until expiry, and returns a freshly signed token. If you pass a day count the key carries a matching expiry, and at activation that expiry is read back from the token and stored on the license. If you omit the day count the key does not expire."
      },
      {
        "type": "p",
        "text": "Because keys are verified offline against the instance secret, a key issued by one instance activates on any instance that shares that secret, which is exactly how you provision an air-gapped install: mint the key where it is convenient, then carry it to the isolated deployment and activate it there with no connectivity between the two."
      },
      {
        "type": "table",
        "headers": [
          "Field",
          "Meaning",
          "Notes"
        ],
        "rows": [
          [
            "plan",
            "The license plan name, for example enterprise.",
            "Defaults to enterprise when issuing."
          ],
          [
            "seats",
            "The number of seats the license grants.",
            "A whole number, zero or more. Defaults to zero."
          ],
          [
            "licensee",
            "Who the license is issued to.",
            "Optional. Shown on the License tab when set."
          ],
          [
            "days / expiry",
            "How long the key is valid for.",
            "Optional, at least one day. Omit for a key that never expires, otherwise the expiry is baked into the signed key."
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "No phone-home, ever",
        "text": "Issue, activate, view, and delink all happen with zero outbound calls. Licensing never reaches a vendor server, which means it behaves identically on the hosted instance and on a self-hosted air-gapped deployment that has no internet access at all."
      },
      {
        "type": "h2",
        "text": "Putting it together"
      },
      {
        "type": "p",
        "text": "Instance administration is the small set of levers that govern the deployment as a whole. Grant the instance-admin role to the people who run the instance, and trust the self-protection guards to keep at least one of them in control. Use instance settings to name the deployment, to decide who may create workspaces, and to set the email from-address. Suspend and reinstate accounts to control sign-in everywhere at once, knowing the block is enforced at authentication. And for fully offline operation, pair air-gapped mode with a local model behind a custom base URL and an offline license key, so a Elliptic instance can run end to end without ever leaving your network."
      }
    ]
  },
  {
    "title": "References & mentions",
    "slug": "references-and-mentions",
    "description": "How @-mentions and cross-entity references connect people, tasks, and notes inside note bodies, comments, and task descriptions, including the exact wire format so agents can read and write them through the Company-Brain MCP.",
    "blocks": [
      {
        "type": "h2",
        "text": "What references are"
      },
      {
        "type": "p",
        "text": "A reference is a single, unified way to point at something from inside a body of text. You **@-mention** a person, or you **reference** a task or a note, and Elliptic turns it into a compact chip right where you typed it. The same mechanism works across rich-text surfaces: a **note** page, a **project description**, a **task description**, and a **comment** on a task, meeting, or note. One reference can pull the runbook note a task depends on into its description, name a teammate in a comment, or cite a related task from a page. Work stays connected instead of scattered."
      },
      {
        "type": "p",
        "text": "There are four kinds of reference. A `user` reference is a mention of a person. A `task` reference points at a work item. A `note` reference points at a page. A `file` reference points at a document in the organization's **Drive**. People are mentioned so they can be notified; tasks, pages and documents are referenced so the chip becomes a link you can follow."
      },
      {
        "type": "table",
        "headers": [
          "Kind",
          "Trigger",
          "Renders as",
          "Links to"
        ],
        "rows": [
          [
            "user",
            "@ then a name",
            "an @ chip in accent color",
            "a person. This is a mention, not a navigation target"
          ],
          [
            "task",
            "@ then a task title or identifier",
            "a # chip in monospace",
            "the task, opened in the browse view"
          ],
          [
            "note",
            "@ then a page title",
            "a chip with a page icon",
            "the note, opened in the notes view"
          ],
          [
            "file",
            "@ then a document name",
            "a chip with a paperclip icon and a Drive tag",
            "the Drive, with that document selected"
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Why this matters for agents",
        "text": "Elliptic is Jira for your agents. Because every reference is plain Markdown, an agent operating over the **Company-Brain MCP** reads and writes the same chips your teammates do. When an agent embeds a reference in a task description or a comment, it renders as a chip for everyone, and when it reads a description back, the reference is right there in the text as a link it can resolve. References are how humans and agents point at the same things in the same words."
      },
      {
        "type": "h2",
        "text": "Mentioning in the app"
      },
      {
        "type": "p",
        "text": "Type `@` where you want the reference. A picker opens and filters as you type. Pick one with the mouse, or move with the arrow keys and press Enter. Elliptic inserts the chip and drops a trailing space so you can keep typing."
      },
      {
        "type": "p",
        "text": "What the picker offers depends on the surface. On a note page and in a project description it lists people, tasks (each shown with its `#` identifier), and notes (each shown with a Note tag and a page icon). In a task description and a task comment the picker offers tasks, notes and Drive documents (each shown with a Drive tag and its folder), so you reference work items, pages and documents there rather than people. Drive documents are workspace-wide, so the same signed contract can be linked from tasks in any project."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Type @",
            "text": "In a note, a project description, a task description, or a comment composer, type `@` followed by a few letters of a name, a task title or identifier, or a page title."
          },
          {
            "title": "Pick from the picker",
            "text": "The list shows the targets available on that surface. Filter by typing, then select with the mouse or with the arrow keys and Enter."
          },
          {
            "title": "It becomes a chip",
            "text": "Elliptic inserts the chip. A task or note chip is clickable right away and opens the referenced item. A person chip names them."
          }
        ]
      },
      {
        "type": "p",
        "text": "On a note page the editor placeholder says it all: type `@` to mention, type `/` for a block menu, and Markdown shortcuts like `## ` for a heading, `- ` for a list, and `> ` for a quote all work. Mentioning is just one of the editor's inline behaviors."
      },
      {
        "type": "h3",
        "text": "How a chip behaves"
      },
      {
        "type": "ul",
        "items": [
          "**Task, note and document chips are interactive.** Clicking a chip (or focusing it and pressing Enter or Space) opens the referenced item. A note chip routes to the page, a task chip resolves to the task in the browse view, and a document chip opens the Drive with that document selected.",
          "**Person chips are labels, not links.** An `@` person chip shows who is mentioned. It does not navigate anywhere, its job is to identify the person.",
          "**Chips are atomic.** A chip is a single unit in the editor, not editable character by character. The label is what you see, the kind and id underneath are what make it resolve."
        ]
      },
      {
        "type": "h2",
        "text": "The /__mention/ link format"
      },
      {
        "type": "p",
        "text": "Notes, descriptions, and comments are all stored as Markdown. A reference is encoded as an ordinary Markdown link whose href is a relative sentinel path carrying the kind and the id of the target:"
      },
      {
        "type": "code",
        "lang": "markdown",
        "code": "[Visible label](/__mention/<kind>/<id>)"
      },
      {
        "type": "p",
        "text": "The `<kind>` is one of `user`, `task`, `note`, or `file`. The `<id>` is the target's identifier, URL-encoded. The visible label is the link text. For example, a note reference, a task reference, a document reference, and a person reference look like this:"
      },
      {
        "type": "code",
        "lang": "markdown",
        "code": "Mirror the steps in [Runbook — Deploy a backend change](/__mention/note/019ed7a1-2b3c-7d4e-9f01-aabbccddeeff).\nThis work is blocked by [HML-42](/__mention/task/019ed802-4f5a-7b6c-8d9e-001122334455).\nCountersign [Acme MSA 2026](/__mention/file/019eda44-8c2d-7e3f-9a01-223344556677).\nHanding this to [Ada](/__mention/user/019ed9c3-7a1b-4c2d-8e3f-556677889900)."
      },
      {
        "type": "p",
        "text": "The editor's **Mention extension** writes this href when you pick from the `@` picker, and serializes the chip back to the same link when the content is saved as Markdown. The **Markdown renderer** does the reverse: it recognizes any link whose href begins with `/__mention/`, parses out the kind and id, and re-hydrates it into a chip. A note resolves to its notes route, a task resolves to the browse route built from its identifier, and a person renders as a styled, non-navigating glyph chip. Ordinary Markdown links are left untouched and render as normal links."
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Why a relative sentinel path",
        "text": "`/__mention/...` is a relative path, not an absolute URL, so it stays stable across environments and across the hosted instance at elliptic.sh and any self-hosted deployment. The editor and renderer intercept it before it would ever be followed as a normal link, so the id is the source of truth and the label is display only. Editing the label does not change the target."
      },
      {
        "type": "p",
        "text": "Each kind has a glyph the renderer prepends so the chip reads naturally even as plain text: `#` for a task, `@` for a person, `※` for a note, and `▤` for a Drive document. When the same Markdown is flattened to plain text (for a search index or a snippet), the link collapses to that glyph plus the label, so `[Ada](/__mention/user/...)` becomes simply `@Ada`."
      },
      {
        "type": "h2",
        "text": "Drag to cite"
      },
      {
        "type": "p",
        "text": "When you are editing a note page, you can drag an entity from elsewhere in the app and drop it into the page to drop a citation link. The editor accepts the drag payload, works out where you dropped it, and inserts a link to that entity at that exact spot followed by a non-breaking space. Drag to cite is wired in the full note editor, the same surface that supports the `@` picker, slash menu, and AI tools."
      },
      {
        "type": "p",
        "text": "The drag carries a small structured payload over a Elliptic-specific clipboard type, with a `kind`, an `id`, a `title`, and an `href`. On drop, the editor builds an anchor from it: the link text is the entity's title, the href is the entity's own route, and the anchor also carries `data-entity-kind` and `data-entity-id` attributes so the citation stays identifiable. If the dragged entity has no route, the citation is inserted as the plain title instead of a link."
      },
      {
        "type": "table",
        "headers": [
          "Carried over from the drag",
          "Used for"
        ],
        "rows": [
          [
            "title",
            "the visible link text of the citation"
          ],
          [
            "href",
            "the destination the citation links to, when the entity has a route"
          ],
          [
            "kind",
            "stamped onto the anchor as data-entity-kind"
          ],
          [
            "id",
            "stamped onto the anchor as data-entity-id"
          ]
        ]
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Drag-cite vs typing @",
        "text": "Reach for **drag to cite** when the entity is already on screen and you want to pull it into a page without leaving your place. Reach for **@** when you are mid-sentence and want to name a person or item by title. Both end up as links inside the same Markdown body. Note that a dragged citation links to the entity's own route, while an `@` mention writes the `/__mention/` sentinel that re-hydrates into a chip."
      },
      {
        "type": "h2",
        "text": "Notifications from mentions"
      },
      {
        "type": "p",
        "text": "Mentioning a person is how you get their attention. The notification path is driven by an explicit `mention_user_ids` field on the create and update payload, not by scanning the body for `/__mention/user/` links. When that field carries member ids, Elliptic emits a `MENTIONED` notification to each of them. It only notifies ids that are genuine members of the same organization, and it never notifies you about your own mention."
      },
      {
        "type": "ul",
        "items": [
          "**On a note**, creating or updating the page with `mention_user_ids` notifies each named member with a `MENTIONED` notification titled \"You were mentioned in <note title>\", pointing at the note.",
          "**On a comment**, each named member gets a `MENTIONED` notification pointing at the entity the comment is on (the task, meeting, or note), with a snippet of the comment text.",
          "**On a task**, each named member gets a `MENTIONED` notification pointing at the task and titled with the task's identifier, and is **auto-subscribed** to that task.",
          "**In a task comment specifically**, each named member is likewise **auto-subscribed to the task**, idempotently, so they keep getting that task's updates. Auto-subscribe on mention happens for task targets, not for note or meeting targets."
        ]
      },
      {
        "type": "callout",
        "variant": "info",
        "title": "Mention notifications are separate from comment notifications",
        "text": "A new comment already notifies the owner of the thing it is on (the task's assignee, the note's creator, the meeting's owner) with a `COMMENTED` notification. A `MENTIONED` notification is in addition to that, sent to the people named in `mention_user_ids`. The in-app inbox is always on, while per-trigger email delivery (including a mentions toggle) follows each member's notification preferences."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "The chip and the ping are separate steps",
        "text": "Writing a `/__mention/user/<id>` link renders a person chip, but the chip alone does not notify anyone. The recipient list comes from the explicit `mention_user_ids` field, which is carried on the task create and update payloads (and accepted by the note and comment APIs). Referencing a task or a note never notifies a person, those kinds are about linking, not pinging."
      },
      {
        "type": "h2",
        "text": "Writing references as an agent (via the MCP)"
      },
      {
        "type": "p",
        "text": "Because a reference is just a Markdown link, an agent on the **Company-Brain MCP** can embed one anywhere a body of text is written. Resolve the target's id first, then write the `/__mention/<kind>/<id>` link inline and it renders as a chip for everyone who opens the item."
      },
      {
        "type": "steps",
        "steps": [
          {
            "title": "Resolve the id",
            "text": "Look up the target id. Use `list_project_tasks` or `get_task` for a task, `list_notes` or `get_note` for a note, `list_drive_files` for a document, and `list_org_members` for a person. Take the returned id. A Drive document is easier still: every item `list_drive_files` returns carries a ready-made `mention` string you can paste straight into the body."
          },
          {
            "title": "Embed the link",
            "text": "Write the reference link with that id in the Markdown body, in the `[label](/__mention/<kind>/<id>)` form."
          },
          {
            "title": "Write the body",
            "text": "Pass the Markdown as `description` on `create_task` or `update_task`, as `content` on `create_note` or `update_note`, or as `body` on `create_comment`. The link renders as a chip when anyone opens the item."
          }
        ]
      },
      {
        "type": "code",
        "lang": "markdown",
        "code": "## Plan\nMirror the steps in [Runbook — Deploy a backend change](/__mention/note/019ed7a1-2b3c-7d4e-9f01-aabbccddeeff).\nThis work is blocked by [HML-42](/__mention/task/019ed802-4f5a-7b6c-8d9e-001122334455)."
      },
      {
        "type": "callout",
        "variant": "warning",
        "title": "Notifying people through the MCP",
        "text": "To actually notify a person an agent mentions, pass their id in **`mention_user_ids`**. Among the MCP tools, that argument is exposed on `create_task` and `update_task`, where named members get a `MENTIONED` notification (and are auto-subscribed to the task). The `create_note`, `update_note`, and `create_comment` MCP tools accept the body text and render the chips inside it, but do not expose a `mention_user_ids` argument, so a person chip written there links and labels but does not by itself emit a mention notification. Keep the inline link for the chip, and use the task tools' `mention_user_ids` when a ping is the point."
      },
      {
        "type": "callout",
        "variant": "tip",
        "title": "Keep the label human, keep the id exact",
        "text": "The label is what readers see, so make it a short, readable title. The kind and id are what make the chip resolve, so they must be accurate and belong to an entity in the same organization. If the id does not match something the reader can access, the chip will not open anything. Avoid unescaped square brackets in the label so the link form stays valid."
      },
      {
        "type": "h2",
        "text": "Where references show up"
      },
      {
        "type": "p",
        "text": "References are not their own surface, they live inside the surfaces you already use:"
      },
      {
        "type": "ul",
        "items": [
          "**Notes.** Pages are the richest place for references and the only surface that supports drag to cite. See [Notes, Activity & Calendar](/docs/notes-activity-calendar-inbox).",
          "**Comments.** Task, meeting, and note comments are composed with `@` and store the same link form in the comment text. A task comment's `@` picker offers tasks and notes.",
          "**Task descriptions.** A description can reference related tasks and notes with `@`, and the same Markdown link form is stored. See [Projects & Tasks](/docs/projects-and-tasks).",
          "**Project descriptions.** A project brief is a rich-text body where you can `@` people, tasks, and notes.",
          "**Activity.** Creating or editing a note, or commenting, records an entry in the activity feed, so a referenced item's history shows when it was touched. See [Notes, Activity & Calendar](/docs/notes-activity-calendar-inbox).",
          "**The assistant.** The org assistant has its own `@` context picker for attaching a project or a work item to a message, so you can ground an answer in a specific task or project."
        ]
      },
      {
        "type": "h2",
        "text": "Rules and behavior"
      },
      {
        "type": "ul",
        "items": [
          "References round trip. They are saved in the Markdown and re-hydrate into chips on reload, not only during the current edit session.",
          "Only links whose href starts with `/__mention/` become reference chips. Normal Markdown links stay normal links.",
          "The kind is one of `user`, `task`, or `note`. An unrecognized kind falls back to `user`.",
          "The label is display text and the id is authoritative. Editing the label does not change the target.",
          "Task and note chips are clickable and navigate, person chips are labels.",
          "Notifying a mentioned person uses the explicit `mention_user_ids` field, only members of the same org are notified, and you are never notified about your own mention.",
          "Mentioning a member on a task or in a task comment auto-subscribes them to that task, idempotently."
        ]
      }
    ]
  }
];
