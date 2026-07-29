import { FC, useState } from "react"
import { Modal, Pressable, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Avatar } from "@/components/Avatar"
import { ListRow } from "@/components/ListRow"
import { Text } from "@/components/Text"
import { useOrg } from "@/context/OrgContext"
import { useAppTheme } from "@/theme/context"

export const OrgSwitcher: FC = () => {
  const { orgs, activeOrg, setActiveOrgId } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const [open, setOpen] = useState(false)

  const $trigger: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
  }
  const $backdrop: ViewStyle = {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.palette.overlay50,
  }
  const $sheet: ViewStyle = {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={$trigger}>
        <Avatar name={activeOrg?.name ?? "?"} size={24} />
        <Text text={activeOrg?.name ?? "Select workspace"} weight="medium" />
        <Ionicons name="chevron-down" size={16} color={colors.textDim} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={$backdrop} onPress={() => setOpen(false)}>
          <View style={$sheet}>
            <Text
              text="Switch workspace"
              preset="subheading"
              style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}
            />
            {orgs.map((org) => (
              <ListRow
                key={org.id}
                title={org.name}
                left={<Avatar name={org.name} size={32} />}
                right={
                  activeOrg?.id === org.id ? (
                    <Ionicons name="checkmark" size={18} color={colors.tint} />
                  ) : undefined
                }
                onPress={() => {
                  setActiveOrgId(org.id)
                  setOpen(false)
                }}
              />
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}
