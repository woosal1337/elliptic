import { FC } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"

// Saturated tints (shared with the web collab-cursor palette). Initials are
// always rendered white for contrast — never a theme neutral (which flips to
// black in dark mode).
const AVATAR_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
]

/**
 * Initials and the overflow chip are fixed values, not theme tokens, and the
 * lint rule that objects to colour literals is right to ask why: a theme neutral
 * would flip to black in dark mode and vanish against these saturated circles.
 * Named here so the intent survives the next person who tries to "fix" them.
 */
const AVATAR_FG = "#FFFFFF"
const OVERFLOW_BG = "#6B7280"

function colorForName(seed: string): string {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p.charAt(0))
  return letters.join("").toUpperCase() || "?"
}

export interface AvatarProps {
  name: string
  /** Optional avatar image URI; falls back to colored initials. */
  uri?: string | null
  size?: number
}

/** A colored initials avatar (or image), seeded deterministically from the name. */
export const Avatar: FC<AvatarProps> = ({ name, uri, size = 32 }) => {
  const $circle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colorForName(name),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  }

  if (uri) {
    const $img: ImageStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
    }
    return <Image source={{ uri }} style={$img} />
  }

  const $initials: TextStyle = {
    color: AVATAR_FG,
    fontSize: size * 0.4,
    lineHeight: size * 0.5,
  }
  return (
    <View style={$circle}>
      <Text text={initials(name)} weight="semiBold" style={$initials} />
    </View>
  )
}

export interface AvatarStackProps {
  people: { name: string; uri?: string | null }[]
  size?: number
  max?: number
}

/** Overlapping avatars with a "+N" overflow chip. */
export const AvatarStack: FC<AvatarStackProps> = ({ people, size = 24, max = 3 }) => {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  const overlap = size * 0.32
  const $overflow: ViewStyle = {
    marginLeft: -overlap,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: OVERFLOW_BG,
    alignItems: "center",
    justifyContent: "center",
  }
  const $overflowText: TextStyle = { color: AVATAR_FG, fontSize: size * 0.34 }
  return (
    <View style={$stack}>
      {shown.map((p, i) => (
        <View key={i} style={i === 0 ? undefined : { marginLeft: -overlap }}>
          <Avatar name={p.name} uri={p.uri} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={$overflow}>
          <Text text={`+${extra}`} style={$overflowText} />
        </View>
      ) : null}
    </View>
  )
}

const $stack: ViewStyle = { flexDirection: "row" }
