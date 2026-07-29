import { Easing } from "react-native-reanimated"

export const timing = {
  /**
   * The duration (ms) for quick animations.
   */
  quick: 100,
  /**
   * Standard transition duration.
   */
  regular: 250,
  /**
   * Slower, more deliberate transitions.
   */
  slow: 350,
}

/** The brand easing curve (ease-out), matching the web `--ease` token. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1)
