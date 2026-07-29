// CompanyOS mobile typography.
// Matches the web brand: Inter (UI/body), Inter Tight (display/titles),
// JetBrains Mono (task identifiers, code).

import { Platform } from "react-native"
import {
  Inter_300Light as interLight,
  Inter_400Regular as interRegular,
  Inter_500Medium as interMedium,
  Inter_600SemiBold as interSemiBold,
  Inter_700Bold as interBold,
} from "@expo-google-fonts/inter"
import {
  InterTight_500Medium as interTightMedium,
  InterTight_600SemiBold as interTightSemiBold,
  InterTight_700Bold as interTightBold,
} from "@expo-google-fonts/inter-tight"
import {
  JetBrainsMono_400Regular as jetBrainsMonoRegular,
  JetBrainsMono_500Medium as jetBrainsMonoMedium,
  JetBrainsMono_600SemiBold as jetBrainsMonoSemiBold,
} from "@expo-google-fonts/jetbrains-mono"

export const customFontsToLoad = {
  interLight,
  interRegular,
  interMedium,
  interSemiBold,
  interBold,
  interTightMedium,
  interTightSemiBold,
  interTightBold,
  jetBrainsMonoRegular,
  jetBrainsMonoMedium,
  jetBrainsMonoSemiBold,
}

const fonts = {
  inter: {
    light: "interLight",
    normal: "interRegular",
    medium: "interMedium",
    semiBold: "interSemiBold",
    bold: "interBold",
  },
  interTight: {
    medium: "interTightMedium",
    semiBold: "interTightSemiBold",
    bold: "interTightBold",
  },
  jetBrainsMono: {
    normal: "jetBrainsMonoRegular",
    medium: "jetBrainsMonoMedium",
    semiBold: "jetBrainsMonoSemiBold",
  },
  helveticaNeue: {
    thin: "HelveticaNeue-Thin",
    light: "HelveticaNeue-Light",
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  sansSerif: {
    thin: "sans-serif-thin",
    light: "sans-serif-light",
    normal: "sans-serif",
    medium: "sans-serif-medium",
  },
}

export const typography = {
  /**
   * The fonts are available to use, but prefer using the semantic name.
   */
  fonts,
  /**
   * The primary font. Inter — used for all UI and body text.
   */
  primary: fonts.inter,
  /**
   * Display font. Inter Tight — screen titles, headings, hero.
   */
  display: fonts.interTight,
  /**
   * Kept for backwards-compat with any secondary-font references.
   */
  secondary: Platform.select({ ios: fonts.helveticaNeue, android: fonts.sansSerif }),
  /**
   * Monospace. JetBrains Mono — task identifiers (COS-42), figure labels, code.
   */
  code: fonts.jetBrainsMono,
}
