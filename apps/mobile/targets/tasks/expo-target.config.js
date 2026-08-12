/**
 * The Tasks widget target.
 *
 * `@bacons/apple-targets` turns this directory into a real WidgetKit extension
 * during `expo prebuild`. Nothing here is checked into `ios/` — that directory
 * is generated and gitignored, so this file and the Swift beside it are the
 * source of truth. Editing the target inside Xcode instead will be erased by
 * the next `prebuild --clean`.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = (config) => ({
  type: "widget",
  name: "Tasks",
  // Shown in the widget gallery when you long-press the home screen.
  displayName: "Tasks",
  // 17 is the floor for AppIntentConfiguration, which is what lets each widget
  // instance carry its own organisation/project/status rather than every copy
  // showing the same list.
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit", "AppIntents"],
  // The one channel between the app and the widget. The widget process cannot
  // read the app's Keychain — and a Lock Screen widget renders while the device
  // is locked, when `WHEN_UNLOCKED_THIS_DEVICE_ONLY` tokens are unreadable by
  // anyone — so the app writes a snapshot here and the widget only ever reads.
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
})
