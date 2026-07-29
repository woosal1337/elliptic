export interface ConfigBaseProps {
  persistNavigation: "always" | "dev" | "prod" | "never"
  catchErrors: "always" | "dev" | "prod" | "never"
  exitRoutes: string[]
}

export type PersistNavigationConfig = ConfigBaseProps["persistNavigation"]

const BaseConfig: ConfigBaseProps = {
  // Restore navigation state only in production. In dev we start fresh at the
  // tab roots each launch — restoring a persisted deep stack (e.g. a task
  // detail) across reloads is confusing and can strand you on a childless
  // screen with no back affordance.
  persistNavigation: "prod",

  /**
   * Only enable if we're catching errors in the right environment
   */
  catchErrors: "always",

  /**
   * This is a list of all the route names that will exit the app if the back button
   * is pressed while in that screen. Only affects Android.
   */
  exitRoutes: ["Welcome"],
}

export default BaseConfig
