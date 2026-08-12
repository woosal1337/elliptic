import SwiftUI
import UIKit

/// The app's colours, for the widget.
///
/// A hand-kept mirror of the tokens in `app/theme/colors.ts` (light) and
/// `app/theme/colorsDark.ts` (dark) — only the handful the widget draws with,
/// not the whole palette. The widget is a separate target with no access to the
/// app's TypeScript, and there is no build step between them, so these are
/// copies. **Change them with the theme files.** Same discipline as
/// `Snapshot.swift`, minus the version guard: a stale colour is ugly, not
/// broken, so it does not warrant one.
///
/// Every colour resolves per trait collection rather than reading
/// `@Environment(\.colorScheme)`, because a widget is also rendered for
/// snapshots and previews where that environment is not what the Home Screen
/// will actually use.
enum Palette {
  /// `--background`. The widget's own surface, so it reads as part of the app
  /// rather than as a system panel.
  static let background = dynamic(light: 0xFD_FC_FB, dark: 0x10_10_10)
  /// `--foreground`. Task titles.
  static let text = dynamic(light: 0x17_17_19, dark: 0xF5_F5_F5)
  /// `--muted-foreground`. The header, the overflow count, empty states.
  static let textDim = dynamic(light: 0x6A_68_68, dark: 0xA0_A0_A0)
  /// The status dot on a row that is not overdue.
  static let statusDot = dynamic(light: 0x78_78_78, dark: 0xA0_A0_A0)
  /// `--error`. The overdue dot, and the only colour in the widget.
  static let error = dynamic(light: 0xC8_50_3F, dark: 0xF0_82_78)

  private static func dynamic(light: UInt32, dark: UInt32) -> Color {
    Color(UIColor { traits in
      UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light)
    })
  }
}

private extension UIColor {
  /// 0xRRGGBB, matching how the theme files write them.
  convenience init(rgb: UInt32) {
    self.init(
      red: CGFloat((rgb >> 16) & 0xFF) / 255,
      green: CGFloat((rgb >> 8) & 0xFF) / 255,
      blue: CGFloat(rgb & 0xFF) / 255,
      alpha: 1)
  }
}
