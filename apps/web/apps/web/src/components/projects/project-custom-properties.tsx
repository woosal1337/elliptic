"use client";

import { useState } from "react";
import { BookmarkPlus, Download, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import type { PropertyType } from "@/lib/types";
import {
  useCreateProperty,
  useCreatePropertyTemplate,
  useCustomProperties,
  useDeleteProperty,
  useImportPropertyTemplate,
  usePropertyTemplates,
} from "@/hooks/use-property-queries";
import { ErrorState } from "@/components/error-state";

const TYPES: { value: PropertyType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
];

export function ProjectCustomProperties({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const properties = useCustomProperties(orgId, projectId);
  const createProperty = useCreateProperty(orgId, projectId);
  const deleteProperty = useDeleteProperty(orgId, projectId);
  const templates = usePropertyTemplates(orgId);
  const importTemplate = useImportPropertyTemplate(orgId, projectId);
  const saveTemplate = useCreatePropertyTemplate(orgId);
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("text");
  const [options, setOptions] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    const parsedOptions =
      type === "select"
        ? options
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean)
        : [];
    createProperty.mutate(
      { name: name.trim(), type, options: parsedOptions },
      {
        onSuccess: () => {
          setName("");
          setType("text");
          setOptions("");
        },
      }
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Custom properties</h2>
        <p className="text-caption text-muted-foreground">
          Typed fields shown on every work item in this project.
        </p>
      </div>

      {properties.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : properties.isError ? (
        <ErrorState error={properties.error} onRetry={() => void properties.refetch()} />
      ) : (properties.data ?? []).length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {properties.data.map((property) => (
            <li
              key={property.id}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-small text-foreground">
                {property.name}
              </span>
              <Badge variant="outline">{property.type}</Badge>
              {property.options.length > 0 ? (
                <span className="hidden truncate text-caption text-muted-foreground sm:inline">
                  {property.options.join(", ")}
                </span>
              ) : null}
              {canManage ? (
                <>
                  <IconButton
                    aria-label={`Save ${property.name} to workspace library`}
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      saveTemplate.mutate({
                        name: property.name,
                        type: property.type,
                        options: property.options,
                      })
                    }
                  >
                    <BookmarkPlus className="size-4" />
                  </IconButton>
                  <IconButton
                    aria-label={`Delete ${property.name}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProperty.mutate(property.id)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canManage && (templates.data ?? []).length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted-foreground">Import from workspace:</span>
          {(templates.data ?? []).map((template) => (
            <Button
              key={template.id}
              size="sm"
              variant="outline"
              onClick={() => importTemplate.mutate(template.id)}
            >
              <Download className="size-3.5" />
              {template.name}
            </Button>
          ))}
        </div>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Property name"
            aria-label="Property name"
            className="min-w-40 flex-1"
          />
          <Select value={type} onValueChange={(value) => setType(value as PropertyType)}>
            <SelectTrigger className="w-32" aria-label="Property type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {type === "select" ? (
            <Input
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              placeholder="Options (comma-separated)"
              aria-label="Options"
              className="min-w-40 flex-1"
            />
          ) : null}
          <Button
            size="sm"
            onClick={submit}
            loading={createProperty.isPending}
            disabled={name.trim().length === 0}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      ) : null}
    </section>
  );
}
