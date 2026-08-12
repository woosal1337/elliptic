import ExpoModulesCore
import WidgetKit

/// Writes into the shared App Group and asks WidgetKit to redraw.
///
/// `@bacons/apple-targets` ships an equivalent module, but it declares
/// `"platforms": ["ios"]` in its `expo-module.config.json`, and Expo renamed
/// that key to `"apple"` in SDK 51. On SDK 55 autolinking rejects it outright —
/// `pod install` prints "@bacons/apple-targets doesn't support iOS platform" —
/// so the pod is never installed and the JS class throws at call time. The
/// config plugin half of that package is unaffected and still generates the
/// widget target; this replaces only the runtime bridge.
///
/// Writing it here rather than patching `node_modules` keeps the fix visible,
/// survives a reinstall, and lets the reload be scoped to one widget kind.
public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    /// Returns false rather than throwing when the suite cannot be opened,
    /// which is what happens if the App Group entitlement is missing. The
    /// caller logs it; a widget write must never break the app.
    Function("setItem") { (group: String, key: String, value: String) -> Bool in
      guard let defaults = UserDefaults(suiteName: group) else { return false }
      defaults.set(value, forKey: key)
      return true
    }

    Function("getItem") { (group: String, key: String) -> String? in
      UserDefaults(suiteName: group)?.string(forKey: key)
    }

    /// Reload one widget kind, or every kind when `kind` is nil.
    ///
    /// Scoped by default: reloading all timelines spends the system's refresh
    /// budget on widgets whose data did not change, and that budget is what
    /// decides whether a widget updates promptly later in the day.
    Function("reload") { (kind: String?) in
      guard #available(iOS 14.0, *) else { return }
      if let kind, !kind.isEmpty {
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
      } else {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
