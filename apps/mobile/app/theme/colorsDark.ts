// Elliptic mobile — DARK theme (brand default).
// Ported from the web design system (apps/web/packages/ui/src/styles.css),
// oklch source values resolved to sRGB hex. This is a designed dark palette,
// not a mechanical inversion of the light ramp.

const palette = {
  // Cool-gray neutrals. Keys keep the Ignite "inverted" convention
  // (neutral900 = lightest, neutral100 = darkest) so existing palette
  // references resolve to sensible values in dark mode.
  neutral900: "#F7F7F7",
  neutral800: "#C9C9CB",
  neutral700: "#909091",
  neutral600: "#5A5A5E",
  neutral500: "#3A3A3E",
  neutral400: "#2D2D30",
  neutral300: "#242427",
  neutral200: "#151518",
  neutral100: "#0E0E11",

  // Brand indigo (dark)
  primary600: "#F5F5F5",
  primary500: "#D4D4D4",
  primary400: "#A0A0A0",
  primary300: "#787878",
  primary200: "#5A5A5A",
  primary100: "#404040",

  secondary500: "#E5E5E5",
  secondary400: "#C4C4C4",
  secondary300: "#A0A0A0",
  secondary200: "#787878",
  secondary100: "#5A5A5A",

  accent500: "#F5F5F5",
  accent400: "#D4D4D4",
  accent300: "#A0A0A0",
  accent200: "#787878",
  accent100: "#5A5A5A",

  angry100: "#3A211E",
  angry500: "#F08278",

  overlay20: "rgba(2, 2, 2, 0.4)",
  // Translucent fill over the blurred tab bar so icons keep contrast.
  tabBarFill: "rgba(20, 20, 22, 0.55)",
  overlay50: "rgba(2, 2, 2, 0.7)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // ---- Text ----
  text: "#F5F5F5", // --foreground
  textDim: "#A0A0A0", // --muted-foreground
  navText: "#7C7C7E", // --nav-foreground (inactive tab)

  // ---- Layers ----
  background: "#101010", // --background (theme-base)
  canvas: "#0A0A0A", // --canvas
  surface: "#161616", // --surface
  elevated: "#1C1C1C", // --elevated
  muted: "#1B1B1E", // --muted
  subtle: "#242427", // --subtle

  // ---- Lines ----
  border: "#212124",
  borderStrong: "#323234",
  inputBorder: "#2D2D30",
  separator: "#212124",

  // ---- Brand ----
  tint: "#F5F5F5", // --accent
  tintInactive: "#404040", // --accent-subtle
  accentMuted: "#262626", // chip fill behind tint text
  onTint: "#F7F8FF", // text/icon on tint
  primary: "#F7F7F7", // primary button bg (light-on-dark)
  onPrimary: "#101013",

  // ---- Feedback ----
  error: "#F08278",
  errorBackground: "#3A211E",
  onError: "#101010",
  success: "#F5F5F5",
  successBackground: "#1C1C1C",
  warning: "#A0A0A0",
  warningBackground: "#1C1C1C",
  info: "#A0A0A0",
  infoBackground: "#1C1C1C",

  // ---- Task board semantics ----
  statusBacklog: "rgba(160, 160, 160, 0.4)",
  statusTodo: "#A0A0A0",
  statusInProgress: "#A0A0A0",
  statusInReview: "#F5F5F5",
  statusDone: "#F5F5F5",
  statusCancelled: "rgba(240, 130, 120, 0.6)",
  // Matches web, where duplicate carries muted-foreground like todo — a closed
  // state, but not a failure, so it stays neutral rather than borrowing red.
  statusDuplicate: "#787878",

  priorityNone: "rgba(160, 160, 160, 0.5)",
  priorityLow: "#A0A0A0",
  priorityMedium: "#A0A0A0",
  priorityHigh: "#D4D4D4",
  priorityUrgent: "#F08278",
} as const
