import { FC, useEffect, useState } from "react"
import { View, ViewStyle } from "react-native"
import {
  Button,
  Form,
  Host,
  Picker,
  Section,
  Text as NativeText,
  TextField,
  Toggle,
} from "@expo/ui/swift-ui"
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers"
import { useMMKVBoolean } from "react-native-mmkv"

import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import type { ProfileStackScreenProps } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { NotificationPrefs } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"

type EmailPrefs = Omit<NotificationPrefs, "project_id">

const PREF_ROWS: { key: keyof EmailPrefs; label: string }[] = [
  { key: "email_mentions", label: "Mentions" },
  { key: "email_comments", label: "Comments" },
  { key: "email_state_change", label: "Status changes" },
  { key: "email_property_change", label: "Property changes" },
  { key: "email_completed", label: "Completed" },
]

const ALL_ON: EmailPrefs = {
  email_property_change: true,
  email_state_change: true,
  email_completed: true,
  email_comments: true,
  email_mentions: true,
}

const THEMES = ["system", "light", "dark"] as const
const THEME_LABEL: Record<(typeof THEMES)[number], string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
}

/**
 * Settings is a SwiftUI `Form` — the same construct the system Settings app
 * uses — so the grouped rows, the inset styling, the toggles and the pickers
 * are UIKit's, including whatever iOS does to them on 26 and later.
 */
export const SettingsScreen: FC<ProfileStackScreenProps<"Settings">> = () => {
  const { user, logout } = useAuth()
  const { themeOverride, setThemeContextOverride, themeContext } = useAppTheme()
  const { activeOrg } = useOrg()
  const [name, setName] = useState(user?.full_name ?? "")
  const [pushEnabled, setPushEnabled] = useMMKVBoolean("push.enabled")
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null)

  useEffect(() => {
    if (!activeOrg) return
    void api.getNotificationPrefs(activeOrg.id).then((p) =>
      setPrefs(
        p
          ? {
              email_property_change: p.email_property_change,
              email_state_change: p.email_state_change,
              email_completed: p.email_completed,
              email_comments: p.email_comments,
              email_mentions: p.email_mentions,
            }
          : ALL_ON,
      ),
    )
  }, [activeOrg])

  // The field commits on change with a trailing save, so there is no button.
  const saveName = (value: string) => {
    setName(value)
    if (value.trim()) void api.updateProfile(value.trim())
  }

  const togglePref = (key: keyof EmailPrefs, value: boolean) => {
    if (!activeOrg || !prefs) return
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    void api.updateNotificationPrefs(activeOrg.id, next)
  }

  return (
    <View style={$fill}>
      <Host style={$fill} colorScheme={themeContext}>
        <Form>
          <Section title="Profile">
            <TextField defaultValue={name} placeholder="Full name" onValueChange={saveName} />
            <NativeText>{user?.email ?? ""}</NativeText>
          </Section>

          <Section title="Appearance">
            <Picker
              label="Theme"
              selection={themeOverride ?? "system"}
              onSelectionChange={(value) =>
                setThemeContextOverride(
                  value === "system" ? undefined : (value as "light" | "dark"),
                )
              }
              modifiers={[pickerStyle("segmented")]}
            >
              {THEMES.map((t) => (
                <NativeText key={t} modifiers={[tag(t)]}>
                  {THEME_LABEL[t]}
                </NativeText>
              ))}
            </Picker>
            <Toggle
              label="Push notifications"
              isOn={pushEnabled ?? true}
              onIsOnChange={setPushEnabled}
            />
          </Section>

          {prefs ? (
            <Section title="Email notifications">
              {PREF_ROWS.map((row) => (
                <Toggle
                  key={row.key}
                  label={row.label}
                  isOn={prefs[row.key]}
                  onIsOnChange={(value) => togglePref(row.key, value)}
                />
              ))}
            </Section>
          ) : null}

          <Section>
            <Button role="destructive" label="Sign out" onPress={logout} />
          </Section>
        </Form>
      </Host>
    </View>
  )
}

const $fill: ViewStyle = { flex: 1 }
