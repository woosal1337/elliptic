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
  primary600: "#EBEFFE",
  primary500: "#A9B4F5",
  primary400: "#7079EC",
  primary300: "#515BE4",
  primary200: "#3E48C8",
  primary100: "#2A317F",

  secondary500: "#DCDDE9",
  secondary400: "#BCC0D6",
  secondary300: "#9196B9",
  secondary200: "#626894",
  secondary100: "#41476E",

  accent500: "#A5F3FC",
  accent400: "#67E8F9",
  accent300: "#22D3EE",
  accent200: "#3FC0C0",
  accent100: "#0891B2",

  angry100: "#481B19",
  angry500: "#DB2B33",

  overlay20: "rgba(2, 2, 2, 0.4)",
  // Translucent fill over the blurred tab bar so icons keep contrast.
  tabBarFill: "rgba(20, 20, 22, 0.55)",
  overlay50: "rgba(2, 2, 2, 0.7)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // ---- Text ----
  text: "#F7F7F7", // --foreground
  textDim: "#909091", // --muted-foreground
  navText: "#7C7C7E", // --nav-foreground (inactive tab)

  // ---- Layers ----
  background: "#0E0E11", // --background (theme-base)
  canvas: "#08080A", // --canvas
  surface: "#151518", // --surface
  elevated: "#1D1D20", // --elevated
  muted: "#1B1B1E", // --muted
  subtle: "#242427", // --subtle

  // ---- Lines ----
  border: "#212124",
  borderStrong: "#323234",
  inputBorder: "#2D2D30",
  separator: "#212124",

  // ---- Brand ----
  tint: "#7079EC", // --accent
  tintInactive: "#373B6A", // --accent-subtle
  accentMuted: "#282B48", // chip fill behind tint text
  onTint: "#F7F8FF", // text/icon on tint
  primary: "#F7F7F7", // primary button bg (light-on-dark)
  onPrimary: "#101013",

  // ---- Feedback ----
  error: "#DB2B33",
  errorBackground: "#481B19",
  onError: "#FFF7F6",
  success: "#52BE76",
  successBackground: "#0D3119",
  warning: "#E7B643",
  warningBackground: "#3C2B02",
  info: "#4FA6E9",
  infoBackground: "#032E4B",

  // ---- Task board semantics ----
  statusBacklog: "rgba(144, 144, 145, 0.4)",
  statusTodo: "#909091",
  statusInProgress: "#E7B643",
  statusInReview: "#7079EC",
  statusDone: "#52BE76",
  statusCancelled: "rgba(219, 43, 51, 0.6)",

  priorityNone: "rgba(144, 144, 145, 0.5)",
  priorityLow: "#909091",
  priorityMedium: "#7079EC",
  priorityHigh: "#E7B643",
  priorityUrgent: "#DB2B33",
} as const
