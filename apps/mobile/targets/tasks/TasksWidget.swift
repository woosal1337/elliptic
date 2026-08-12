import SwiftUI
import WidgetKit

/// One rendered widget: the tasks that matched, and what was asked for.
struct TasksEntry: TimelineEntry {
  let date: Date
  let configuration: TaskFilterIntent
  let tasks: [WidgetTask]
  /// Total matches before truncating, so the widget can say "+7 more".
  let matchCount: Int
  /// False when the app has never written a snapshot — a different empty state
  /// from "your filter matched nothing".
  let hasData: Bool
}

struct TasksProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> TasksEntry {
    TasksEntry(date: Date(), configuration: TaskFilterIntent(),
               tasks: WidgetTask.samples, matchCount: WidgetTask.samples.count, hasData: true)
  }

  func snapshot(for configuration: TaskFilterIntent, in context: Context) async -> TasksEntry {
    entry(for: configuration)
  }

  /// A single entry with no refresh date.
  ///
  /// The app drives updates: it reloads timelines when tasks change and when it
  /// backgrounds, and a silent push does the same while it is closed. Asking
  /// WidgetKit to refresh on a clock as well would spend the system's budget
  /// re-reading a file that only changes when we already know it changed.
  func timeline(for configuration: TaskFilterIntent, in context: Context) async -> Timeline<TasksEntry> {
    Timeline(entries: [entry(for: configuration)], policy: .never)
  }

  private func entry(for configuration: TaskFilterIntent) -> TasksEntry {
    let snapshot = SnapshotStore.read()
    let matches = TaskSelection.matching(configuration, in: snapshot)
    return TasksEntry(
      date: Date(),
      configuration: configuration,
      tasks: Array(matches.prefix(TaskSelection.displayLimit)),
      matchCount: matches.count,
      hasData: !snapshot.updatedAt.isEmpty)
  }
}

/// Filtering and ordering live here so every widget family shows the same five.
enum TaskSelection {
  static let displayLimit = 5

  static func matching(_ configuration: TaskFilterIntent, in snapshot: WidgetSnapshot) -> [WidgetTask] {
    let wanted = Set(configuration.statuses.map(\.rawValue))
    return snapshot.tasks
      .filter { task in
        if let org = configuration.organization, task.orgId != org.id { return false }
        if let project = configuration.project, task.projectId != project.id { return false }
        // An empty status selection is the user clearing every checkbox. Showing
        // everything would be a surprise, so it matches nothing and the widget
        // says so.
        return wanted.contains(task.status)
      }
      .sorted(by: rank)
  }

  /// Overdue first, then by due date, then by priority, then by identifier.
  ///
  /// Identifier last is what makes the order stable: without a total order the
  /// list can reshuffle between two refreshes that contain the same tasks, and
  /// a widget that rearranges itself for no reason reads as broken.
  private static func rank(_ a: WidgetTask, _ b: WidgetTask) -> Bool {
    if a.isOverdue != b.isOverdue { return a.isOverdue }
    switch (a.dueDate, b.dueDate) {
    case let (x?, y?) where x != y: return x < y
    case (nil, _?): return false
    case (_?, nil): return true
    default: break
    }
    let ap = priorityRank(a.priority), bp = priorityRank(b.priority)
    if ap != bp { return ap < bp }
    return a.identifier < b.identifier
  }

  private static func priorityRank(_ priority: String) -> Int {
    switch priority {
    case "urgent": return 0
    case "high": return 1
    case "medium": return 2
    case "low": return 3
    default: return 4
    }
  }
}

@main
struct TasksWidgetBundle: WidgetBundle {
  var body: some Widget { TasksWidget() }
}

struct TasksWidget: Widget {
  static let kind = "TasksWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: Self.kind, intent: TaskFilterIntent.self, provider: TasksProvider()) {
      TasksWidgetView(entry: $0)
    }
    .configurationDisplayName("Tasks")
    .description("Your next five tasks from any workspace.")
    .supportedFamilies([
      .systemSmall, .systemMedium, .systemLarge,
      // Lock Screen. These render while the device is locked, which is exactly
      // why the widget reads a snapshot instead of authenticating.
      .accessoryRectangular, .accessoryCircular, .accessoryInline,
    ])
  }
}

extension WidgetTask {
  /// Only ever drawn in the gallery preview and in Xcode previews.
  static let samples: [WidgetTask] = [
    WidgetTask(id: "1", orgId: "o", projectId: "p", identifier: "ATLAS-217",
               title: "Re-verify the NetBox change rate", status: "in_progress",
               priority: "high", dueDate: nil),
    WidgetTask(id: "2", orgId: "o", projectId: "p", identifier: "ATLAS-219",
               title: "Ship a read-only NetBox query tool", status: "todo",
               priority: "medium", dueDate: nil),
    WidgetTask(id: "3", orgId: "o", projectId: "p", identifier: "TD-9",
               title: "Meeting with Nate and team", status: "todo",
               priority: "urgent", dueDate: nil),
  ]
}
