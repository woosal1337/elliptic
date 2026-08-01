"use client";

import { useEffect, useState } from "react";
import { Home } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@elliptic/ui";
import {
  DEFAULT_HOME_OPTIONS,
  FALLBACK_DEFAULT_HOME,
  getDefaultHome,
  setDefaultHome,
  type DefaultHome,
} from "./home-preference";

export function HomePreferenceControl() {
  const [home, setHome] = useState<DefaultHome>(FALLBACK_DEFAULT_HOME);

  useEffect(() => {
    setHome(getDefaultHome());
  }, []);

  const onChange = (value: string) => {
    const next = value as DefaultHome;
    setHome(next);
    setDefaultHome(next);
    toast.success("Default home updated", { duration: 1500 });
  };

  return (
    <label className="flex items-center gap-2.5">
      <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Home className="size-3.5" />
        Open on
      </span>
      <Select value={home} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[8.5rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEFAULT_HOME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
