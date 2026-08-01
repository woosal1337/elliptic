"use client";

import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@elliptic/ui";
import type { Event, EventScope } from "@/lib/types";
import {
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
} from "@/hooks/use-event-queries";
import {
  combineDateTime,
  toDateInputValue,
  toTimeInputValue,
} from "./calendar-utils";
import { isFutureEvent } from "@/lib/brief";
import { PreMeetingBrief } from "./pre-meeting-brief";

const eventSchema = z
  .object({
    title: z.string().min(1, "Add a title"),
    date: z.string().min(1, "Pick a date"),
    start_time: z.string(),
    end_time: z.string(),
    all_day: z.boolean(),
    visibility: z.enum(["team", "personal"]),
    description: z.string().optional(),
    location: z.string().optional(),
  })
  .refine((value) => value.all_day || value.start_time.length > 0, {
    message: "Pick a start time",
    path: ["start_time"],
  })
  .refine((value) => value.all_day || value.end_time.length > 0, {
    message: "Pick an end time",
    path: ["end_time"],
  })
  .refine(
    (value) =>
      value.all_day ||
      combineDateTime(value.date, value.end_time).getTime() >
        combineDateTime(value.date, value.start_time).getTime(),
    { message: "End must be after start", path: ["end_time"] }
  );

type EventValues = z.infer<typeof eventSchema>;

function defaultsFor(event: Event | null, seedDate: Date | null): EventValues {
  if (event) {
    const starts = new Date(event.starts_at);
    const ends = new Date(event.ends_at);
    return {
      title: event.title,
      date: toDateInputValue(starts),
      start_time: toTimeInputValue(starts),
      end_time: toTimeInputValue(ends),
      all_day: event.all_day,
      visibility: event.scope,
      description: event.description ?? "",
      location: event.location ?? "",
    };
  }
  const base = seedDate ?? new Date();
  return {
    title: "",
    date: toDateInputValue(base),
    start_time: "09:00",
    end_time: "10:00",
    all_day: false,
    visibility: "team",
    description: "",
    location: "",
  };
}

export function EventDialog({
  orgId,
  open,
  onOpenChange,
  event,
  seedDate,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  seedDate: Date | null;
}) {
  const isEdit = event !== null;
  const createEvent = useCreateEvent(orgId);
  const updateEvent = useUpdateEvent(orgId);
  const deleteEvent = useDeleteEvent(orgId);

  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: defaultsFor(event, seedDate),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultsFor(event, seedDate));
    }
  }, [open, event, seedDate, form]);

  const allDay = form.watch("all_day");
  const visibility = form.watch("visibility");
  const pending = createEvent.isPending || updateEvent.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const starts = values.all_day
      ? combineDateTime(values.date, "00:00")
      : combineDateTime(values.date, values.start_time);
    const ends = values.all_day
      ? combineDateTime(values.date, "23:59")
      : combineDateTime(values.date, values.end_time);

    const payload = {
      title: values.title,
      description: values.description?.trim() ? values.description : null,
      location: values.location?.trim() ? values.location : null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      all_day: values.all_day,
      visibility: values.visibility,
    };

    if (isEdit && event) {
      updateEvent.mutate(
        { eventId: event.id, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
      return;
    }
    createEvent.mutate(payload, { onSuccess: () => onOpenChange(false) });
  });

  const onDelete = () => {
    if (!event) return;
    deleteEvent.mutate(event.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details, or delete this event."
              : "Team events are shared with the org. Personal events stay private to you."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && event && isFutureEvent(event.starts_at) ? (
          <PreMeetingBrief orgId={orgId} eventId={event.id} />
        ) : null}

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="Sprint review"
              aria-invalid={form.formState.errors.title ? true : undefined}
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <p className="text-caption text-danger">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Visibility</Label>
            <Tabs
              value={visibility}
              onValueChange={(value) =>
                form.setValue("visibility", value as EventScope, { shouldDirty: true })
              }
            >
              <TabsList>
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-date">Date</Label>
            <DatePicker
              id="event-date"
              value={form.watch("date")}
              onChange={(value) =>
                form.setValue("date", value ?? "", {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
            {form.formState.errors.date ? (
              <p className="text-caption text-danger">{form.formState.errors.date.message}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <Label htmlFor="event-all-day">All day</Label>
            <Switch
              id="event-all-day"
              checked={allDay}
              onCheckedChange={(checked) =>
                form.setValue("all_day", checked, { shouldDirty: true })
              }
            />
          </div>

          {!allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-start">Starts</Label>
                <Input
                  id="event-start"
                  type="time"
                  className="font-mono"
                  aria-invalid={form.formState.errors.start_time ? true : undefined}
                  {...form.register("start_time")}
                />
                {form.formState.errors.start_time ? (
                  <p className="text-caption text-danger">
                    {form.formState.errors.start_time.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-end">Ends</Label>
                <Input
                  id="event-end"
                  type="time"
                  className="font-mono"
                  aria-invalid={form.formState.errors.end_time ? true : undefined}
                  {...form.register("end_time")}
                />
                {form.formState.errors.end_time ? (
                  <p className="text-caption text-danger">
                    {form.formState.errors.end_time.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              placeholder="Meeting room, or a link"
              {...form.register("location")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              placeholder="What is this event about?"
              {...form.register("description")}
            />
          </div>

          <DialogFooter className="items-center justify-between">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                loading={deleteEvent.isPending}
                className="text-muted-foreground hover:text-danger"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" loading={pending}>
              {isEdit ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
