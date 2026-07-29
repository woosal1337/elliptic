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

import { useAuth } from "@/context/AuthContext"
import { api } from "@/services/api"
import type { Org } from "@/services/api/types"

type OrgContextType = {
  orgs: Org[]
  activeOrg?: Org
  loading: boolean
  setActiveOrgId: (id: string) => void
  refresh: () => Promise<void>
}

export const OrgContext = createContext<OrgContextType | null>(null)

export const OrgProvider: FC<PropsWithChildren> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(false)
  const [activeOrgId, setActiveOrgId] = useMMKVString("org.activeId")

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await api.listOrgs()
    setOrgs(result)
    setLoading(false)
    const first = result[0]
    if (first && (!activeOrgId || !result.some((o) => o.id === activeOrgId))) {
      setActiveOrgId(first.id)
    }
  }, [activeOrgId, setActiveOrgId])

  useEffect(() => {
    if (isAuthenticated) void refresh()
    else setOrgs([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const activeOrg = useMemo(() => orgs.find((o) => o.id === activeOrgId), [orgs, activeOrgId])

  const value: OrgContextType = {
    orgs,
    activeOrg,
    loading,
    setActiveOrgId: (id: string) => setActiveOrgId(id),
    refresh,
  }
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export const useOrg = () => {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider")
  return ctx
}
