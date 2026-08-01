"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@elliptic/ui";
import type { TableDensity } from "./task-view-prefs";
import {
  DISPLAY_PROPERTY_LABELS,
  DISPLAY_PROPERTY_ORDER,
  ORDER_BY_LABELS,
  ORDER_BY_ORDER,
  type DisplayProperty,
  type UseDisplayConfig,
} from "./display-config";

export function DisplayOptionsMenu({
  config,
  surface,
  density,
  onDensityChange,
  hiddenProperties,
}: {
  config: UseDisplayConfig;
  surface: "board" | "table";
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
  hiddenProperties?: readonly DisplayProperty[];
}) {
  const hidden = new Set(hiddenProperties ?? []);
  const properties = DISPLAY_PROPERTY_ORDER.filter((property) => !hidden.has(property));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Display options">
          <SlidersHorizontal className="size-3.5" />
          Display
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Show properties</DropdownMenuLabel>
        {properties.map((property) => (
          <DropdownMenuCheckboxItem
            key={property}
            checked={config.properties[property]}
            onCheckedChange={() => config.toggleProperty(property)}
            onSelect={(event) => event.preventDefault()}
          >
            {DISPLAY_PROPERTY_LABELS[property]}
          </DropdownMenuCheckboxItem>
        ))}
        {density && onDensityChange ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Density</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={density === "comfortable"}
              onCheckedChange={() => onDensityChange("comfortable")}
              onSelect={(event) => event.preventDefault()}
            >
              Comfortable
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={density === "compact"}
              onCheckedChange={() => onDensityChange("compact")}
              onSelect={(event) => event.preventDefault()}
            >
              Compact
            </DropdownMenuCheckboxItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Ordering</DropdownMenuLabel>
        {ORDER_BY_ORDER.map((orderBy) => (
          <DropdownMenuCheckboxItem
            key={orderBy}
            checked={config.orderBy === orderBy}
            onCheckedChange={() => config.setOrderBy(orderBy)}
            onSelect={(event) => event.preventDefault()}
          >
            {ORDER_BY_LABELS[orderBy]}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Indicators</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={config.showSubtasks}
          onCheckedChange={(value) => config.setShowSubtasks(Boolean(value))}
          onSelect={(event) => event.preventDefault()}
        >
          Sub-task progress
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={config.showBlocked}
          onCheckedChange={(value) => config.setShowBlocked(Boolean(value))}
          onSelect={(event) => event.preventDefault()}
        >
          Bug & blocked status
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{surface === "board" ? "Columns" : "Groups"}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={config.showEmptyGroups}
          onCheckedChange={(value) => config.setShowEmptyGroups(Boolean(value))}
          onSelect={(event) => event.preventDefault()}
        >
          Show empty {surface === "board" ? "columns" : "groups"}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
