import { FC, useEffect, useState } from "react"
import { Switch, View, ViewStyle } from "react-native"
import { useMMKVBoolean } from "react-native-mmkv"

import { Button } from "@/components/Button"
import { FieldRow } from "@/components/FieldRow"
import { OptionSheet } from "@/components/OptionSheet"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { useOrg } from "@/context/OrgContext"
import type { ProfileStackScreenProps } from "@/navigators/navigationTypes"
import { api } from "@/services/api"
import type { NotificationPrefs } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"

const THEME_LABEL: Record<string, string> = { system: "System", light: "Light", dark: "Dark" }

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

export const SettingsScreen: FC<ProfileStackScreenProps<"Settings">> = () => {
  const { user, logout } = useAuth()
  const {
    theme: { colors, spacing },
    themeContext,
    setThemeContextOverride,
  } = useAppTheme()
  const { activeOrg } = useOrg()
  const [name, setName] = useState(user?.full_name ?? "")
  const [savingName, setSavingName] = useState(false)
  const [pushEnabled, setPushEnabled] = useMMKVBoolean("push.enabled")
  const [themePicker, setThemePicker] = useState(false)
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

  const saveName = async () => {
    if (!name.trim() || savingName) return
    setSavingName(true)
    await api.updateProfile(name.trim())
    setSavingName(false)
  }

  const togglePref = (key: keyof EmailPrefs) => {
    if (!activeOrg || !prefs) return
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    void api.updateNotificationPrefs(activeOrg.id, next)
  }

  return (
    <Screen preset="scroll" contentContainerStyle={{ padding: spacing.lg }}>
      <Text preset="formLabel" text="Your name" style={{ color: colors.textDim }} />
      <TextField value={name} onChangeText={setName} placeholder="Full name" />
      <Button
        text={savingName ? "Saving…" : "Save name"}
        preset="filled"
        disabled={!name.trim() || savingName}
        onPress={() => void saveName()}
        style={$save}
      />

      <View style={$section}>
        <Text text={user?.email ?? ""} style={{ color: colors.textDim }} />
      </View>

      <View style={$section}>
        <FieldRow
          label="Theme"
          value={THEME_LABEL[themeContext] ?? "System"}
          onPress={() => setThemePicker(true)}
        />
        <View style={[$toggleRow, { borderBottomColor: colors.separator }]}>
          <Text text="Push notifications" />
          <Switch
            value={pushEnabled ?? true}
            onValueChange={setPushEnabled}
            trackColor={{ true: colors.tint, false: colors.palette.neutral300 }}
          />
        </View>
      </View>

      {prefs ? (
        <View style={$section}>
          <Text preset="formLabel" text="Email notifications" style={{ color: colors.textDim }} />
          {PREF_ROWS.map((row) => (
            <View key={row.key} style={[$toggleRow, { borderBottomColor: colors.separator }]}>
              <Text text={row.label} />
              <Switch
                value={prefs[row.key]}
                onValueChange={() => togglePref(row.key)}
                trackColor={{ true: colors.tint, false: colors.palette.neutral300 }}
              />
            </View>
          ))}
        </View>
      ) : null}

      <Button text="Sign out" onPress={logout} style={$signout} />

      <OptionSheet
        visible={themePicker}
        onClose={() => setThemePicker(false)}
        title="Theme"
        options={[
          { label: "System", value: "system" },
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ]}
        selected={themeContext}
        onSelect={(v) =>
          setThemeContextOverride(v === "system" ? undefined : (v as "light" | "dark"))
        }
      />
    </Screen>
  )
}

const $save: ViewStyle = { marginTop: 12 }
const $section: ViewStyle = { marginTop: 28 }
const $toggleRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 12,
  borderBottomWidth: 1,
}
const $signout: ViewStyle = { marginTop: 32 }
