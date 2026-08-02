"use client";

import { useEffect, useState } from "react";
import {
  Checkbox,
  DatePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elliptic/ui";
import type { CustomProperty, Task } from "@/lib/types";
import { useCustomProperties } from "@/hooks/use-property-queries";
import { useUpdateTask } from "@/hooks/use-task-queries";

function CustomFieldInput({
  property,
  value,
  onSave,
}: {
  property: CustomProperty;
  value: string;
  onSave: (next: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  if (property.type === "checkbox") {
    return (
      <Checkbox
        checked={local === "true"}
        onCheckedChange={(checked) => {
          const next = checked === true ? "true" : "false";
          setLocal(next);
          onSave(next);
        }}
        aria-label={property.name}
      />
    );
  }

  if (property.type === "select") {
    return (
      <Select
        value={local || undefined}
        onValueChange={(next) => {
          setLocal(next);
          onSave(next);
        }}
      >
        <SelectTrigger aria-label={property.name}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {property.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (property.type === "date") {
    return (
      <DatePicker
        value={local}
        onChange={(value) => {
          const next = value ?? "";
          setLocal(next);
          onSave(next);
        }}
        aria-label={property.name}
      />
    );
  }

  const inputType = property.type === "number" ? "number" : property.type === "url" ? "url" : "text";
  return (
    <Input
      type={inputType}
      value={local}
      onChange={(event) => setLocal(event.target.value)}
      onBlur={() => {
        if (local !== value) onSave(local);
      }}
      placeholder="—"
      aria-label={property.name}
    />
  );
}

export function TaskCustomFields({
  orgId,
  projectId,
  task,
}: {
  orgId: string;
  projectId: string;
  task: Task;
}) {
  const properties = useCustomProperties(orgId, projectId);
  const updateTask = useUpdateTask(orgId, projectId);
  const props = properties.data ?? [];

  if (props.length === 0) return null;

  const save = (propertyId: string, next: string) => {
    updateTask.mutate({
      taskId: task.id,
      custom_fields: { ...task.custom_fields, [propertyId]: next },
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-mono-label font-mono text-muted-foreground/70">
        Custom fields
      </h3>
      {props.map((property) => (
        <div key={property.id} className="flex flex-col gap-1">
          <span className="text-caption text-muted-foreground">{property.name}</span>
          <CustomFieldInput
            property={property}
            value={task.custom_fields[property.id] ?? ""}
            onSave={(next) => save(property.id, next)}
          />
        </div>
      ))}
    </section>
  );
}
