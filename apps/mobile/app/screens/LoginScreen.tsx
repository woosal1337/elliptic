import { ComponentType, FC, useState } from "react"
import { Pressable, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, TextFieldAccessoryProps } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = ({ navigation }) => {
  const { login, signingIn, error } = useAuth()
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)

  const onSubmit = () => {
    if (!email.trim() || !password) return
    void login(email, password)
  }

  const PwToggle: ComponentType<TextFieldAccessoryProps> = (props) => (
    <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={8} style={props.style}>
      <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textDim} />
    </Pressable>
  )

  return (
    <Screen preset="auto" contentContainerStyle={{ padding: spacing.lg }} safeAreaEdges={["top"]}>
      <Text preset="heading" text="CompanyOS" style={{ marginTop: spacing.xl }} />
      <Text
        preset="subheading"
        text="Sign in to your workspace"
        style={{ marginTop: spacing.xs, marginBottom: spacing.xl, color: colors.textDim }}
      />

      <TextField
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        label="Email"
        placeholder="you@company.com"
        containerStyle={$gap}
      />
      <TextField
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPw}
        label="Password"
        placeholder="••••••••"
        onSubmitEditing={onSubmit}
        RightAccessory={PwToggle}
        containerStyle={$gap}
      />

      {error ? (
        <View
          style={[
            $errorPill,
            { backgroundColor: colors.errorBackground, borderRadius: radius.md },
          ]}
        >
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text text={error} size="xs" style={{ color: colors.error, flexShrink: 1 }} />
        </View>
      ) : null}

      <Button
        preset="filled"
        text={signingIn ? "Signing in…" : "Sign in"}
        disabled={signingIn}
        onPress={onSubmit}
        style={{ marginTop: spacing.md }}
      />
      <Button
        preset="default"
        text="Create an account"
        onPress={() => navigation.navigate("Register")}
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
