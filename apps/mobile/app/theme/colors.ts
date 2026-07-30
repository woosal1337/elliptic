// CompanyOS mobile — LIGHT theme.
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
  primary100: "#EBEFFE",
  primary200: "#E1E7FE",
  primary300: "#A9B4F5",
  primary400: "#7079EC",
  primary500: "#515BE4",
  primary600: "#3E48C8",

  secondary100: "#E2E8F0",
  secondary200: "#CBD5E1",
  secondary300: "#94A3B8",
  secondary400: "#64748B",
  secondary500: "#475569",

  accent100: "#CFFAFE",
  accent200: "#A5F3FC",
  accent300: "#67E8F9",
  accent400: "#22D3EE",
  accent500: "#0F9293",

  angry100: "#FFEAE7",
  angry500: "#D41920",

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
  tint: "#515BE4", // --accent, ring/focus
  tintInactive: "#E1E7FE", // --accent-subtle
  accentMuted: "#EBEFFE", // chip fill behind tint text
  onTint: "#F9FAFF", // text/icon on tint
  primary: "#171719", // primary button bg (dark-on-light)
  onPrimary: "#FFFFFF",

  // ---- Feedback ----
  error: "#D41920",
  errorBackground: "#FFEAE7",
  onError: "#FFFCFC",
  success: "#25975B",
  successBackground: "#DFF8E6",
  warning: "#D7941A",
  warningBackground: "#FCF1D4",
  info: "#007ACB",
  infoBackground: "#E0F3FF",

  // ---- Task board semantics ----
  statusBacklog: "rgba(106, 104, 104, 0.4)",
  statusTodo: "#6A6868",
  statusInProgress: "#D7941A",
  statusInReview: "#515BE4",
  statusDone: "#25975B",
  statusCancelled: "rgba(212, 25, 32, 0.6)",

  priorityNone: "rgba(106, 104, 104, 0.5)",
  priorityLow: "#6A6868",
  priorityMedium: "#515BE4",
  priorityHigh: "#D7941A",
  priorityUrgent: "#D41920",
} as const
