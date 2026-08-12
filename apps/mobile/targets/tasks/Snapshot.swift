import Foundation

/// The app → widget data contract.
///
/// The Swift half of `app/services/widget/contract.ts`. The two describe the
/// same JSON and must change together; nothing at build time checks that, so
/// `version` is the guard — a snapshot written by an older app is ignored
/// rather than decoded into something misleading.
enum SnapshotContract {
  static let version = 1
  static let appGroup = "group.sh.elliptic"
  static let key = "widget.snapshot.v1"
}

struct WidgetOrg: Codable, Hashable {
  let id: String
  let name: String
}

struct WidgetProject: Codable, Hashable {
  let id: String
  let orgId: String
  let name: String
  let key: String
}

struct WidgetTask: Codable, Hashable, Identifiable {
  let id: String
  let orgId: String
  /// Absent for a task filed under no project. Such a task matches only the
  /// "All projects" configuration, never a specific one.
  let projectId: String?
  let identifier: String
  let title: String
  let status: String
  let priority: String
  let dueDate: String?

  /// Due strictly before today, in the device's own calendar.
  ///
  /// `dueDate` is a plain calendar day, so it is compared as one. Parsing it as
  /// an instant would put anyone west of UTC a day out for half of every day.
  var isOverdue: Bool {
    guard let dueDate else { return false }
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .iso8601)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone.current
    formatter.dateFormat = "yyyy-MM-dd"
    guard let due = formatter.date(from: dueDate) else { return false }
    return due < Calendar.current.startOfDay(for: Date())
  }
}

struct WidgetSnapshot: Codable {
  let v: Int
  let updatedAt: String
  let orgs: [WidgetOrg]
  let projects: [WidgetProject]
  let tasks: [WidgetTask]

  static let empty = WidgetSnapshot(v: SnapshotContract.version, updatedAt: "",
                                    orgs: [], projects: [], tasks: [])
}

/// Reads the snapshot the app wrote into the shared App Group.
///
/// Every failure returns `.empty` rather than throwing: a widget that renders
/// an empty state is recoverable, and one that crashes shows the system's
/// "Unable to Load" placeholder with no way for the user to tell why.
enum SnapshotStore {
  static func read() -> WidgetSnapshot {
    guard
      let defaults = UserDefaults(suiteName: SnapshotContract.appGroup),
      let raw = defaults.string(forKey: SnapshotContract.key),
      let data = raw.data(using: .utf8),
      let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data),
      snapshot.v == SnapshotContract.version
    else { return .empty }
    return snapshot
  }
}
