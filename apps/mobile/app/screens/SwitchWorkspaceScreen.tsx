import { FC } from "react"
import { TextStyle, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppIcon } from "@/components/AppIcon"
import { Avatar } from "@/components/Avatar"
import { ListRow } from "@/components/ListRow"
import { Text } from "@/components/Text"
import { useOrg } from "@/context/OrgContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { hapticSelection } from "@/utils/haptics"

/**
 * Workspace picker. The root stack presents it as a native form sheet, so the
 * slide-up, grabber and rubber-band dismissal are UIKit's — the old hand-rolled
 * Modal dragged its dimmed backdrop up with it.
 *
 * The body is plain RN on purpose: a SwiftUI host renders empty inside a sheet.
 */
export const SwitchWorkspaceScreen: FC<AppStackScreenProps<"SwitchWorkspace">> = ({
  navigation,
}) => {
  const { orgs, activeOrg, setActiveOrgId } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg }}>
      <Text
        preset="subheading"
        text="Switch workspace"
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}
      />
      {orgs.map((org) => (
        <ListRow
          key={org.id}
          title={org.name}
          left={<Avatar name={org.name} size={32} />}
          right={
            activeOrg?.id === org.id ? (
              <AppIcon name="check" size={18} color={colors.tint} />
            ) : undefined
          }
          onPress={() => {
            hapticSelection()
            setActiveOrgId(org.id)
            navigation.goBack()
          }}
        />
      ))}
      {orgs.length === 0 ? (
        <Text
          text="No workspaces yet."
          style={[$empty, { color: colors.textDim, padding: spacing.lg }]}
        />
      ) : null}
    </View>
  )
}

const $empty: TextStyle = { textAlign: "center" }
