import { FC, useState } from "react"
import { View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

export const RegisterScreen: FC<AppStackScreenProps<"Register">> = ({ navigation }) => {
  const { register, signingIn, error } = useAuth()
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const onSubmit = () => {
    if (!fullName.trim() || !email.trim() || password.length < 8) return
    void register(email, password, fullName)
  }

  return (
    <Screen preset="auto" contentContainerStyle={{ padding: spacing.lg }} safeAreaEdges={["top"]}>
      <Text preset="heading" text="Create your account" style={$gap} />
      <Text preset="subheading" text="Join your team on CompanyOS" style={$gap} />

      <TextField
        value={fullName}
        onChangeText={setFullName}
        label="Full name"
        placeholder="Ada Lovelace"
        autoCapitalize="words"
        containerStyle={$gap}
      />
      <TextField
        value={email}
        onChangeText={setEmail}
        label="Email"
        placeholder="you@company.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        containerStyle={$gap}
      />
      <TextField
        value={password}
        onChangeText={setPassword}
        label="Password"
        placeholder="At least 8 characters"
        secureTextEntry
        onSubmitEditing={onSubmit}
        helper={password.length > 0 && password.length < 8 ? "Must be at least 8 characters" : ""}
        status={password.length > 0 && password.length < 8 ? "error" : undefined}
        containerStyle={$gap}
      />

      {error ? (
        <View style={[$errorPill, { backgroundColor: colors.errorBackground, borderRadius: radius.md }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text text={error} size="xs" style={{ color: colors.error, flexShrink: 1 }} />
        </View>
      ) : null}

      <Button
        preset="filled"
        text={signingIn ? "Creating…" : "Create account"}
        disabled={signingIn}
        onPress={onSubmit}
        style={{ marginTop: spacing.md }}
      />
      <Button
        preset="default"
        text="I already have an account"
        onPress={() => navigation.navigate("Login")}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  )
}

const $gap: ViewStyle = { marginBottom: 16 }
const $errorPill: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  marginBottom: 8,
}
