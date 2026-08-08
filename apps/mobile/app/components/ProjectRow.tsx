import { FC } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import type { Project } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"
import { hapticPress } from "@/utils/haptics"

// The tiles are a fixed dark ramp rather than the theme's tint, chosen so white
// initials clear 4.5:1 on every step — so the letter is white in both themes and
// does not follow onTint.
const TILE_FG = "#FFFFFF"

const TILE_COLORS = [
  "#333333",
  "#3D3D3D",
  "#474747",
  "#515151",
  "#5B5B5B",
  "#656565",
  "#6B6B6B",
  "#707070",
  "#737373",
  "#767676",
]

/** Stable per-project colour, so a project looks the same everywhere. */
export function tileColor(seed: string): string {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TILE_COLORS[h % TILE_COLORS.length]
}

/** A project row — the lettered tile, name and key. Shared by Home and Projects. */
export const ProjectRow: FC<{ project: Project; onPress: () => void; divider?: boolean }> = ({
  project,
  onPress,
  divider = true,
}) => {
  const {
    theme: { colors, radius },
  } = useAppTheme()

  return (
    <Pressable
      onPress={hapticPress(onPress)}
      // Without an explicit label the row reads out as "R, Dataland, RAS" —
      // the tile letter and key merged in with the name.
      accessible
      accessibilityRole="button"
      accessibilityLabel={project.name}
      style={({ pressed }) => [
        $row,
        {
          backgroundColor: pressed ? colors.muted : colors.background,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View
        style={[
          $tile,
          { backgroundColor: tileColor(project.key || project.name), borderRadius: radius.md },
        ]}
      >
        <Text
          text={(project.key || project.name).charAt(0).toUpperCase()}
          style={[$tileLetter, { color: TILE_FG }]}
        />
      </View>
      <View style={$content}>
        <Text text={project.name} size="sm" weight="medium" numberOfLines={1} />
        <Text text={project.key} style={[$projectKey, { color: colors.textDim }]} />
      </View>
    </Pressable>
  )
}

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
}
const $tile: ViewStyle = { width: 36, height: 36, alignItems: "center", justifyContent: "center" }
// flex, not flexGrow: a long name has to shrink to the row or it runs off-screen.
const $content: ViewStyle = { flex: 1, gap: 2 }
const $tileLetter: TextStyle = { fontFamily: typography.display.bold, fontSize: 16 }
const $projectKey: TextStyle = { fontFamily: typography.code.normal, fontSize: 11 }
