"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  Button,
  cn,
  EmptyState,
  IconButton,
  IsoFan,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@elliptic/ui";
import type { Event, EventScope } from "@/lib/types";
import { useEvents } from "@/hooks/use-event-queries";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/error-state";
import { EventDialog } from "@/components/calendar/event-dialog";
import { CalendarEventChip } from "@/components/calendar/calendar-event-chip";
import { ComingUp } from "@/components/calendar/coming-up";
import { DayEventsPopover } from "@/components/calendar/day-events-popover";
import {
  addMonths,
  buildMonthGrid,
  eventsForDay,
  monthLabel,
  monthRange,
  startOfDay,
  WEEKDAY_LABELS,
} from "@/components/calendar/calendar-utils";

type ScopeFilter = EventScope | "all";

const MAX_CHIPS = 3;

interface DialogState {
  open: boolean;
  event: Event | null;
  seedDate: Date | null;
}

export default function CalendarPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [dialog, setDialog] = useState<DialogState>({ open: false, event: null, seedDate: null });

  const today = useMemo(() => startOfDay(new Date()), []);
  const grid = useMemo(() => buildMonthGrid(month, today), [month, today]);
  const range = useMemo(() => monthRange(month), [month]);

  const events = useEvents(orgId, range.fromISO, range.toISO, scope);

  const openCreate = (seedDate: Date | null) =>
    setDialog({ open: true, event: null, seedDate });
  const openEdit = (event: Event) => setDialog({ open: true, event, seedDate: null });
  const onDialogOpenChange = (open: boolean) =>
    setDialog((prev) => ({ ...prev, open }));

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialog({ open: true, event: null, seedDate: null });
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Calendar"
        actions={
          <Button size="sm" onClick={() => openCreate(null)}>
            <Plus className="size-4" />
            New event
          </Button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <IconButton
              aria-label="Previous month"
              variant="outline"
              size="sm"
              onClick={() => setMonth((prev) => addMonths(prev, -1))}
            >
              <ChevronLeft />
            </IconButton>
            <span className="min-w-40 text-center text-body font-display font-semibold text-foreground">
              {monthLabel(month)}
            </span>
            <IconButton
              aria-label="Next month"
              variant="outline"
              size="sm"
              onClick={() => setMonth((prev) => addMonths(prev, 1))}
            >
              <ChevronRight />
            </IconButton>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
            >
              Today
            </Button>
          </div>
          <Tabs value={scope} onValueChange={(value) => setScope(value as ScopeFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="team">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                Team
              </TabsTrigger>
              <TabsTrigger value="personal">
                <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                Personal
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </PageHeader>

      {!events.isPending && !events.isError && events.data.length > 0 ? (
        <ComingUp events={events.data} onOpen={openEdit} />
      ) : null}

      {events.isError ? (
        <ErrorState error={events.error} onRetry={() => void events.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-2 py-2 text-center text-mono-label font-mono uppercase text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {events.isPending ? (
            <div className="grid grid-cols-7">
              {Array.from({ length: 42 }, (_, i) => (
                <div
                  key={i}
                  className="min-h-28 border-b border-r border-border p-1.5 last:border-r-0"
                >
                  <Skeleton className="h-4 w-6" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {grid.map((day) => {
                const dayEvents = eventsForDay(events.data, day.date);
                const visible = dayEvents.slice(0, MAX_CHIPS);
                const overflow = dayEvents.length - visible.length;
                return (
                  <div
                    key={day.date.toISOString()}
                    className={cn(
                      "flex min-h-28 flex-col gap-1 border-b border-r border-border p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
                      day.isWeekend && day.inMonth && "bg-muted/15",
                      !day.inMonth && "bg-muted/20",
                      day.isToday && "bg-accent-subtle/40 ring-1 ring-inset ring-accent/30"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openCreate(day.date)}
                      aria-label={`Add event on ${day.date.toDateString()}`}
                      className="flex items-center justify-end rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-caption font-mono tabular-nums transition-colors",
                          day.isToday
                            ? "bg-accent text-accent-foreground"
                            : day.inMonth
                              ? "text-foreground hover:bg-muted"
                              : "text-muted-foreground/50 hover:bg-muted"
                        )}
                      >
                        {day.date.getDate()}
                      </span>
                    </button>

                    <div className="flex flex-col gap-1">
                      {visible.map((event) => (
                        <CalendarEventChip
                          key={event.id}
                          orgId={orgId}
                          event={event}
                          onOpen={openEdit}
                        />
                      ))}
                      {overflow > 0 ? (
                        <DayEventsPopover
                          date={day.date}
                          events={dayEvents}
                          overflow={overflow}
                          onSelect={openEdit}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!events.isPending && !events.isError && events.data.length === 0 ? (
        <EmptyState
          illustration={<IsoFan />}
          title="Plan the week before it plans you"
          description="Add a team event to keep everyone aligned, or a personal one just for you. Both show up here so the whole month stays in view."
          action={
            <Button size="sm" onClick={() => openCreate(null)}>
              <Plus className="size-4" />
              New event
            </Button>
          }
          secondaryAction={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
            >
              Jump to this month
            </Button>
          }
        />
      ) : null}

      <EventDialog
        orgId={orgId}
        open={dialog.open}
        onOpenChange={onDialogOpenChange}
        event={dialog.event}
        seedDate={dialog.seedDate}
      />
    </div>
  );
}
