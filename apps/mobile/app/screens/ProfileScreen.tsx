import { FC, useEffect, useMemo, useState } from "react"
import { Alert, View, ViewStyle } from "react-native"
import { useMMKVBoolean } from "react-native-mmkv"

import {
  Button,
  Form,
  Host,
  Picker,
  Section,
  Text as NativeText,
  TextField,
  Toggle,
} from "@/components/form"
import {
  background,
  listRowBackground,
  pickerStyle,
  scrollContentBackground,
  tag,
  tint,
} from "@/components/form/modifiers"
import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import type { ProfileStackScreenProps } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { NotificationPrefs } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"

type NotifyPrefs = Omit<NotificationPrefs, "project_id">

/**
 * Which kinds of push a person wants.
 *
 * These governed email until email delivery was switched off; they gate push
 * now, which is instant and costs nothing. Turning one off silences the buzz —
 * the notification is still recorded and still shows in the inbox.
 */
const PREF_ROWS: { key: keyof NotifyPrefs; label: string }[] = [
  { key: "notify_mentions", label: "Mentions" },
  { key: "notify_comments", label: "Comments" },
  { key: "notify_state_change", label: "Status changes" },
  { key: "notify_property_change", label: "Property changes" },
  { key: "notify_completed", label: "Completed" },
]

const ALL_ON: NotifyPrefs = {
  notify_property_change: true,
  notify_state_change: true,
  notify_completed: true,
  notify_comments: true,
  notify_mentions: true,
}

const THEMES = ["system", "light", "dark"] as const
const THEME_LABEL: Record<(typeof THEMES)[number], string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
}

/**
 * Profile and settings on one screen.
 *
 * These were two screens, and the first was a title, an email and a single row
 * that pushed you to the second. That is a navigation step to reach four
 * sections that fit on one page — the settings here are few enough that a
 * grouped form holds all of them without scrolling far, so the split cost a tap
 * and bought nothing.
 *
 * Still a SwiftUI `Form`, so the rows, toggles and pickers are UIKit's,
 * including whatever iOS does to them on 26 and later. What changed is the
 * backdrop: the form's own grouped background is hidden and the app's canvas
 * drawn behind it, with rows on the surface token. Left alone it renders
 * systemGroupedBackground, which is close to the app's dark canvas but not the
 * same, and the seam showed as a panel that did not belong to the app.
 */
export const ProfileScreen: FC<ProfileStackScreenProps<"ProfileMain">> = () => {
  const { user, logout } = useAuth()
  const { activeOrg } = useOrg()
  const { themeOverride, setThemeContextOverride, themeContext, theme } = useAppTheme()
  const [name, setName] = useState(user?.full_name ?? "")
  const [pushEnabled, setPushEnabled] = useMMKVBoolean("push.enabled")
  const [prefs, setPrefs] = useState<NotifyPrefs | null>(null)

  useEffect(() => {
    if (!activeOrg) return
    void api.getNotificationPrefs(activeOrg.id).then((p) =>
      setPrefs(
        p
          ? {
              notify_property_change: p.notify_property_change,
              notify_state_change: p.notify_state_change,
              notify_completed: p.notify_completed,
              notify_comments: p.notify_comments,
              notify_mentions: p.notify_mentions,
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

  // A UIKit switch always draws a white thumb, and the theme's tint is
  // near-white, so an "on" switch was white on white — a blank capsule with no
  // readable state. The track takes the dim step instead: still clearly lit
  // against the off state, but dark enough for the thumb to show against it.
  const switchTint = useMemo(() => [tint(theme.colors.textDim)], [theme.colors.textDim])

  const togglePref = (key: keyof NotifyPrefs, value: boolean) => {
    if (!activeOrg || !prefs) return
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    void api.updateNotificationPrefs(activeOrg.id, next)
  }

  const confirmSignOut = () => {
    Alert.alert("Sign out", "You'll need to sign in again to use Elliptic.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ])
  }

  const row = [listRowBackground(theme.colors.surface)]

  return (
    <View style={[$fill, { backgroundColor: theme.colors.background }]}>
      <Host style={$fill} colorScheme={themeContext}>
        <Form modifiers={[scrollContentBackground("hidden"), background(theme.colors.background)]}>
          <Section title="Account" modifiers={row}>
            <TextField defaultValue={name} placeholder="Full name" onValueChange={saveName} />
            <NativeText>{user?.email ?? ""}</NativeText>
            {activeOrg ? <NativeText>{activeOrg.name}</NativeText> : null}
          </Section>

          <Section title="Appearance" modifiers={row}>
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
          </Section>

          {/* One section: the master switch and the categories it governs read
              as one decision, which is what they are. They used to be split
              because the categories were about email and the switch about push. */}
          <Section title="Notifications" modifiers={row}>
            <Toggle
              label="Push notifications"
              isOn={pushEnabled ?? true}
              onIsOnChange={setPushEnabled}
              modifiers={switchTint}
            />
          </Section>

          {prefs ? (
            <Section title="Notify me about" modifiers={row}>
              {PREF_ROWS.map((r) => (
                <Toggle
                  key={r.key}
                  label={r.label}
                  isOn={prefs[r.key]}
                  onIsOnChange={(value) => togglePref(r.key, value)}
                  modifiers={switchTint}
                />
              ))}
            </Section>
          ) : null}

          <Section modifiers={row}>
            <Button role="destructive" label="Sign out" onPress={confirmSignOut} />
          </Section>
        </Form>
      </Host>
    </View>
  )
}

const $fill: ViewStyle = { flex: 1 }
