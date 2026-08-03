import { FC } from "react"
import {
  Archive,
  ArrowUp,
  AtSign,
  Box,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleUser,
  CircleX,
  Clock,
  CloudOff,
  Eye,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  GitCommitHorizontal,
  Image as ImageIcon,
  Inbox,
  Layers,
  MailOpen,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Repeat,
  Search,
  Square,
  SquareCheck,
  Tag,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react-native"

import { useAppTheme } from "@/theme/context"

/**
 * The app's icon set, drawn from lucide — the same family the web dashboard
 * uses, so a task row looks like itself on both platforms.
 *
 * Names are lucide's own, not ours: a glyph renamed here would drift from the
 * web import it is meant to mirror, and lucide's names are already stable.
 * The tab bar is the deliberate exception — it stays on SF Symbols, because
 * `react-native-bottom-tabs` renders a real `UITabBarController` and iOS wants
 * its own icons there.
 */
const ICONS = {
  "archive": Archive,
  "arrow-up": ArrowUp,
  "at-sign": AtSign,
  "box": Box,
  "calendar": Calendar,
  "check": Check,
  "check-check": CheckCheck,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "circle": Circle,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  "circle-user": CircleUser,
  "circle-x": CircleX,
  "clock": Clock,
  "cloud-off": CloudOff,
  "eye": Eye,
  "eye-off": EyeOff,
  "file-text": FileText,
  "folder": Folder,
  "folder-open": FolderOpen,
  "git-branch": GitBranch,
  "git-commit-horizontal": GitCommitHorizontal,
  "image": ImageIcon,
  "inbox": Inbox,
  "layers": Layers,
  "mail-open": MailOpen,
  "paperclip": Paperclip,
  "pencil": Pencil,
  "play": Play,
  "plus": Plus,
  "repeat": Repeat,
  "search": Search,
  "square": Square,
  "square-check": SquareCheck,
  "tag": Tag,
  "trash-2": Trash2,
  "triangle-alert": TriangleAlert,
  "x": X,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export interface AppIconProps {
  name: IconName
  size?: number
  color?: string
  /** Lucide's default of 2 is heavy under 16pt; the set thins out below that. */
  strokeWidth?: number
}

export const AppIcon: FC<AppIconProps> = ({ name, size = 20, color, strokeWidth }) => {
  const {
    theme: { colors },
  } = useAppTheme()
  const Glyph = ICONS[name]
  return (
    <Glyph
      size={size}
      color={color ?? colors.text}
      strokeWidth={strokeWidth ?? (size <= 16 ? 1.75 : 2)}
    />
  )
}
