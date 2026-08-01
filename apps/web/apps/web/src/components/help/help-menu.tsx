"use client";

import {
  BookOpen,
  Bug,
  Code2,
  HelpCircle,
  Keyboard,
  LifeBuoy,
  MessageCircleQuestion,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@elliptic/ui";
import { useCommandMenu } from "@/components/command/command-menu-provider";

const DOCS_URL = "https://docs.elliptic.dev";
const API_DOCS_PATH = "/api/v1/docs";
const SUPPORT_EMAIL = "support@elliptic.dev";
const ISSUES_URL = "https://github.com/woosal1337/elliptic/issues/new";

export function HelpMenu() {
  const command = useCommandMenu();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Help and support"
          className="flex size-8 items-center justify-center rounded-md text-nav-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <HelpCircle className="size-4.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Help &amp; support</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={DOCS_URL} target="_blank" rel="noreferrer">
            <BookOpen className="size-4" />
            Documentation
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={API_DOCS_PATH} target="_blank" rel="noreferrer">
            <Code2 className="size-4" />
            API reference
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            command.open();
          }}
        >
          <Keyboard className="size-4" />
          Command palette
          <span className="ml-auto text-caption text-muted-foreground">⌘K</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <LifeBuoy className="size-4" />
            Contact support
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={ISSUES_URL} target="_blank" rel="noreferrer">
            <Bug className="size-4" />
            Report a bug
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Product%20feedback`}>
            <MessageCircleQuestion className="size-4" />
            Send feedback
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
