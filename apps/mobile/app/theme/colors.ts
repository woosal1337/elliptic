// Elliptic mobile — LIGHT theme.
// Ported from the web design system (apps/web/packages/ui/src/styles.css),
// oklch source values resolved to sRGB hex. Dark is the brand default (see colorsDark.ts).

const palette = {
  // Cool-gray neutrals (light → dark)
  neutral100: "#FFFFFF",
  neutral200: "#F5F4F3",
  neutral300: "#E4E3E1",
  neutral400: "#C8C7C4",
  neutral500: "#9A9897",
  neutral600: "#6A6868",
  neutral700: "#46454A",
  neutral800: "#171719",
  neutral900: "#000000",

  // Brand indigo
  primary100: "#F5F5F5",
  primary200: "#E5E5E5",
  primary300: "#C4C4C4",
  primary400: "#787878",
  primary500: "#404040",
  primary600: "#262626",

  secondary100: "#E5E5E5",
  secondary200: "#C4C4C4",
  secondary300: "#A0A0A0",
  secondary400: "#787878",
  secondary500: "#5A5A5A",

  accent100: "#F5F5F5",
  accent200: "#E5E5E5",
  accent300: "#C4C4C4",
  accent400: "#A0A0A0",
  accent500: "#5A5A5A",

  angry100: "#FDECEA",
  angry500: "#C8503F",

  overlay20: "rgba(23, 23, 25, 0.2)",
  // Translucent fill over the blurred tab bar so icons keep contrast.
  tabBarFill: "rgba(255, 255, 255, 0.55)",
  overlay50: "rgba(23, 23, 25, 0.45)",
} as const

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // ---- Text ----
  text: "#171719", // --foreground
  textDim: "#6A6868", // --muted-foreground
  navText: "#545253", // --nav-foreground (inactive tab)

  // ---- Layers ----
  background: "#FDFCFB", // --background
  canvas: "#FAFAF9", // page shell behind scroll views / tab bar
  surface: "#FFFFFF", // cards, inputs
  elevated: "#FFFFFF", // sheets, menus, popovers
  muted: "#F5F4F3", // hover / pressed fills
  subtle: "#EDEDEB", // badge fills, secondary buttons

  // ---- Lines ----
  border: "#E4E3E1",
  borderStrong: "#D9D8D6",
  inputBorder: "#DCDBDA",
  separator: "#E4E3E1",

  // ---- Brand ----
  tint: "#101010", // --accent, ring/focus
  tintInactive: "#E5E5E5", // --accent-subtle
  accentMuted: "#F0F0F0", // chip fill behind tint text
  onTint: "#F9FAFF", // text/icon on tint
  primary: "#171719", // primary button bg (dark-on-light)
  onPrimary: "#FFFFFF",

  // ---- Feedback ----
  error: "#C8503F",
  errorBackground: "#FDECEA",
  onError: "#FFFCFC",
  success: "#101010",
  successBackground: "#F0F0F0",
  warning: "#5A5A5A",
  warningBackground: "#F0F0F0",
  info: "#5A5A5A",
  infoBackground: "#F0F0F0",

  // ---- Task board semantics ----
  statusBacklog: "rgba(120, 120, 120, 0.4)",
  statusTodo: "#787878",
  statusInProgress: "#5A5A5A",
  statusInReview: "#101010",
  statusDone: "#101010",
  statusCancelled: "rgba(200, 80, 63, 0.6)",
  // Matches web, where duplicate carries muted-foreground like todo — a closed
  // state, but not a failure, so it stays neutral rather than borrowing red.
  statusDuplicate: "#787878",

  priorityNone: "rgba(120, 120, 120, 0.5)",
  priorityLow: "#787878",
  priorityMedium: "#5A5A5A",
  priorityHigh: "#404040",
  priorityUrgent: "#C8503F",
} as const
