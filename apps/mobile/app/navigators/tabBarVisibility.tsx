import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

/**
 * The tab bar is a real UITabBar now, so it can't be hidden by styling a view.
 * Screens that own the bottom of the window (a pinned composer, a chat input)
 * flip this flag and the navigator passes it down to UIKit.
 */
const TabBarVisibility = createContext<{ hidden: boolean; setHidden: (v: boolean) => void }>({
  hidden: false,
  setHidden: () => {},
})

export const TabBarVisibilityProvider: FC<PropsWithChildren> = ({ children }) => {
  const [hidden, setHidden] = useState(false)
  const value = useMemo(() => ({ hidden, setHidden }), [hidden])
  return <TabBarVisibility.Provider value={value}>{children}</TabBarVisibility.Provider>
}

export const useTabBarHidden = () => useContext(TabBarVisibility).hidden

/** Hide the tab bar while this screen is mounted; restore it on the way out. */
export function useHideTabBar() {
  const { setHidden } = useContext(TabBarVisibility)
  useEffect(() => {
    setHidden(true)
    return () => setHidden(false)
  }, [setHidden])
}
