import { FC, useCallback, useEffect, useState } from "react"
import { View, ViewStyle } from "react-native"
import Svg, { Path } from "react-native-svg"

import { Button } from "@/components/Button"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/services/api"
import type { SocialProvider } from "@/services/socialAuth"
import { useAppTheme } from "@/theme/context"

/** Google's four-colour "G", same paths the web sign-in button uses. */
const GoogleMark: FC = () => (
  <Svg viewBox="0 0 48 48" width={17} height={17}>
    <Path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <Path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <Path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <Path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </Svg>
)

/** GitHub's mark, inheriting the button's text colour. */
const GitHubMark: FC<{ color: string }> = ({ color }) => (
  <Svg viewBox="0 0 24 24" width={17} height={17}>
    <Path
      fill={color}
      d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"
    />
  </Svg>
)

const LABELS: Record<SocialProvider, string> = { google: "Google", github: "GitHub" }

/**
 * "Continue with …" buttons for whichever social providers the instance has
 * configured — the mobile counterpart of the web's OAuthSignIn. Renders nothing
 * until `GET /auth/providers` says at least one is available, so a self-hosted
 * instance without credentials sees only the email form.
 */
export const SocialSignIn: FC = () => {
  const { loginWithProvider, signingIn } = useAuth()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const [providers, setProviders] = useState<SocialProvider[]>([])
  const [pending, setPending] = useState<SocialProvider | null>(null)

  useEffect(() => {
    let live = true
    void api.authProviders().then((p) => {
      if (!live) return
      setProviders(
        ([p.google && "google", p.github && "github"] as const).filter(Boolean) as SocialProvider[],
      )
    })
    return () => {
      live = false
    }
  }, [])

  const start = useCallback(
    async (provider: SocialProvider) => {
      setPending(provider)
      await loginWithProvider(provider)
      setPending(null)
    },
    [loginWithProvider],
  )

  if (providers.length === 0) return null

  return (
    <View style={[$wrap, { marginTop: spacing.md, gap: spacing.sm }]}>
      {providers.map((provider) => (
        <Button
          key={provider}
          preset="default"
          text={`Continue with ${LABELS[provider]}`}
          testID={`social-${provider}`}
          loading={pending === provider}
          disabled={signingIn && pending !== provider}
          onPress={() => void start(provider)}
          // The accessory style carries the Button's icon/label spacing.
          LeftAccessory={(props) => (
            <View style={[props.style, $mark]}>
              {provider === "google" ? <GoogleMark /> : <GitHubMark color={colors.text} />}
            </View>
          )}
        />
      ))}
    </View>
  )
}

const $wrap: ViewStyle = { width: "100%" }
const $mark: ViewStyle = { marginEnd: 10 }
