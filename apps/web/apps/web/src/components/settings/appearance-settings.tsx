"use client";

import { useEffect, useState } from "react";
import { Languages, Monitor, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elliptic/ui";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n/i18n-provider";
import { LOCALES, type LocaleCode } from "@/lib/i18n/messages";
import { useMe, useUpdateProfile } from "@/hooks/use-auth-queries";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceSettings() {
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => setThemeState(getStoredTheme()), []);
  const { t, locale, setLocale } = useTranslation();
  const me = useMe();
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    const serverLocale = me.data?.locale;
    if (serverLocale && serverLocale !== locale && LOCALES.some((l) => l.code === serverLocale)) {
      setLocale(serverLocale as LocaleCode);
    }
  }, [me.data?.locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (next: Theme) => {
    setTheme(next);
    setThemeState(next);
  };

  const chooseLanguage = (next: string) => {
    setLocale(next as LocaleCode);
    updateProfile.mutate({ locale: next });
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold text-foreground">
            {t("settings.appearance.theme")}
          </h2>
          <p className="text-caption text-muted-foreground">
            Choose how Elliptic looks. System follows your device setting.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option.value)}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-small transition-colors ${
                  active
                    ? "bg-surface font-medium text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
            <Languages className="size-4 text-muted-foreground" />
            {t("settings.appearance.language")}
          </h2>
          <p className="text-caption text-muted-foreground">
            {t("settings.appearance.languageHint")}
          </p>
        </div>
        <Select value={locale} onValueChange={chooseLanguage}>
          <SelectTrigger className="w-56" aria-label={t("settings.appearance.language")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
    </div>
  );
}
