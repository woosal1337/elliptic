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
import { loadString, saveString } from "@/utils/storage"

export type AuthContextType = {
  isAuthenticated: boolean
  user?: User
  signingIn: boolean
  error?: string
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, fullName: string) => Promise<boolean>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [accessToken, setAccessToken] = useMMKVString("auth.accessToken")
  const [, setRefreshToken] = useMMKVString("auth.refreshToken")
  const [userJson, setUserJson] = useMMKVString("auth.user")
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    api.setToken(accessToken)
  }, [accessToken])

  // Let the API client self-refresh on 401 (read live from storage to avoid stale closures).
  useEffect(() => {
    api.setAuthHandlers({
      getRefreshToken: () => loadString("auth.refreshToken") ?? undefined,
      onRefreshed: (tokens) => {
        saveString("auth.accessToken", tokens.access_token)
        if (tokens.refresh_token) saveString("auth.refreshToken", tokens.refresh_token)
      },
      onAuthFailure: () => {
        api.setToken(undefined)
        setAccessToken(undefined)
        setRefreshToken(undefined)
        setUserJson(undefined)
      },
    })
  }, [setAccessToken, setRefreshToken, setUserJson])

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
      api.setToken(res.tokens.access_token)
      setAccessToken(res.tokens.access_token)
      setRefreshToken(res.tokens.refresh_token)
      setUserJson(JSON.stringify(res.user))
      return true
    },
    [setAccessToken, setRefreshToken, setUserJson],
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

  const logout = useCallback(() => {
    api.setToken(undefined)
    setAccessToken(undefined)
    setRefreshToken(undefined)
    setUserJson(undefined)
  }, [setAccessToken, setRefreshToken, setUserJson])

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
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
