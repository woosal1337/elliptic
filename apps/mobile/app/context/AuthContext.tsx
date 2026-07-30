import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useMMKVString } from "react-native-mmkv"

import { api } from "@/services/api"
import type { User } from "@/services/api/types"
import { currentTokens, hydrateTokens, setTokens } from "@/services/secureTokens"
import { signInWithProvider, type SocialProvider } from "@/services/socialAuth"
import { loadString } from "@/utils/storage"

export type AuthContextType = {
  isAuthenticated: boolean
  user?: User
  signingIn: boolean
  error?: string
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, fullName: string) => Promise<boolean>
  /** Google/GitHub sign-in through the in-app browser (COS-209). */
  loginWithProvider: (provider: SocialProvider) => Promise<boolean>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

/** Read the persisted profile outside React (MMKV is synchronous). */
const storedUser = () => loadString("auth.user")

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  // Tokens live in the Keychain (E3); the profile is not secret and stays in MMKV.
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined)
  const [hydrated, setHydrated] = useState(false)
  const [userJson, setUserJson] = useMMKVString("auth.user")
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  // Read the Keychain once, before anything renders, so a signed-in user never
  // sees a flash of the login screen on cold start.
  useEffect(() => {
    void hydrateTokens().then((tokens) => {
      // The profile is written synchronously (MMKV) and the tokens are not, so
      // tokens without a profile mean a sign-out that was killed mid-write —
      // finish it rather than resurrecting the session.
      if (tokens.access && !storedUser()) {
        void setTokens({})
        setAccessToken(undefined)
      } else {
        setAccessToken(tokens.access)
      }
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    api.setToken(accessToken)
  }, [accessToken])

  const clearSession = useCallback(() => {
    api.setToken(undefined)
    // Drop the profile first: it is the synchronous marker that says signed out.
    setUserJson(undefined)
    setAccessToken(undefined)
    void setTokens({})
  }, [setUserJson])

  // Let the API client self-refresh on 401. It calls these synchronously, which
  // is why secureTokens keeps an in-memory mirror.
  useEffect(() => {
    api.setAuthHandlers({
      getRefreshToken: () => currentTokens().refresh,
      onRefreshed: (tokens) => {
        setTokens({
          access: tokens.access_token,
          refresh: tokens.refresh_token ?? currentTokens().refresh,
        })
        setAccessToken(tokens.access_token)
      },
      onAuthFailure: clearSession,
    })
  }, [clearSession])

  const startSession = useCallback(
    (user: User, tokens: { access_token: string; refresh_token: string }) => {
      api.setToken(tokens.access_token)
      void setTokens({ access: tokens.access_token, refresh: tokens.refresh_token })
      setAccessToken(tokens.access_token)
      setUserJson(JSON.stringify(user))
    },
    [setUserJson],
  )

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setSigningIn(true)
      setError(undefined)
      const res = await api.login(email.trim(), password)
      setSigningIn(false)
      if ("error" in res) {
        setError(res.error)
        return false
      }
      startSession(res.user, res.tokens)
      return true
    },
    [startSession],
  )

  const register = useCallback(
    async (email: string, password: string, fullName: string): Promise<boolean> => {
      setSigningIn(true)
      setError(undefined)
      const res = await api.register(email.trim(), password, fullName.trim())
      if ("error" in res) {
        setSigningIn(false)
        setError(res.error)
        return false
      }
      // Account created — sign in to obtain tokens.
      const ok = await login(email, password)
      setSigningIn(false)
      return ok
    },
    [login],
  )

  const loginWithProvider = useCallback(
    async (provider: SocialProvider): Promise<boolean> => {
      setSigningIn(true)
      setError(undefined)
      const res = await signInWithProvider(provider)
      setSigningIn(false)
      if ("cancelled" in res) return false
      if ("error" in res) {
        setError(res.error)
        return false
      }
      startSession(res.user, res.tokens)
      return true
    },
    [startSession],
  )

  const logout = useCallback(() => clearSession(), [clearSession])

  const user = useMemo<User | undefined>(
    () => (userJson ? (JSON.parse(userJson) as User) : undefined),
    [userJson],
  )

  const value: AuthContextType = {
    isAuthenticated: !!accessToken,
    user,
    signingIn,
    error,
    login,
    register,
    loginWithProvider,
    logout,
  }

  // Hydration is a Keychain read (single-digit ms); the app's own splash covers it.
  if (!hydrated) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
