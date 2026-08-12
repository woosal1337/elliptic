import SwiftUI
import WidgetKit

/// Routes to a layout per family.
///
/// The accessory families are not small home-screen widgets: they are drawn
/// with a vibrancy material over the wallpaper, get no background of their own,
/// and have room for a line or two. Trying to reuse the system layouts there
/// produces something legible only against a plain wallpaper.
struct TasksWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: TasksEntry

  var body: some View {
    switch family {
    case .accessoryInline: InlineView(entry: entry)
    case .accessoryCircular: CircularView(entry: entry)
    case .accessoryRectangular: RectangularView(entry: entry)
    default: HomeView(entry: entry, rows: family == .systemSmall ? 3 : 5)
    }
  }
}

// MARK: - Home Screen

private struct HomeView: View {
  let entry: TasksEntry
  let rows: Int

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text(entry.configuration.organization?.name ?? "Tasks")
          .font(.caption).fontWeight(.semibold)
          .foregroundStyle(Palette.textDim)
          .lineLimit(1)
        Spacer()
        if entry.matchCount > rows {
          Text("+\(entry.matchCount - rows)")
            .font(.caption2).foregroundStyle(Palette.textDim)
        }
      }

      if entry.tasks.isEmpty {
        EmptyView(hasData: entry.hasData)
      } else {
        ForEach(entry.tasks.prefix(rows)) { task in
          // Every row opens its own task. `widgetURL` would make the whole
          // widget open one thing, which is the wrong affordance for a list.
          Link(destination: DeepLink.task(task)) { TaskRow(task: task) }
        }
        Spacer(minLength: 0)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    // The app's own canvas rather than `.fill.tertiary`, which is a system
    // material and reads as a panel borrowed from Settings.
    .containerBackground(Palette.background, for: .widget)
  }
}

private struct TaskRow: View {
  let task: WidgetTask

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      Circle()
        .fill(task.isOverdue ? Palette.error : Palette.statusDot)
        .frame(width: 5, height: 5)
      Text(task.title)
        .font(.caption)
        .foregroundStyle(Palette.text)
        .lineLimit(1)
      Spacer(minLength: 0)
    }
  }
}

private struct EmptyView: View {
  let hasData: Bool

  var body: some View {
    // Two different failures that look identical if you only say "No tasks":
    // one is fixed by opening the app, the other by editing the widget.
    Text(hasData ? "Nothing matches this filter" : "Open Elliptic to sync")
      .font(.caption)
      .foregroundStyle(Palette.textDim)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

// MARK: - Lock Screen

// These deliberately use no colour from `Palette`.
//
// The Lock Screen renders accessory widgets through a vibrancy material: the
// system desaturates whatever is drawn and tints it to match the wallpaper and
// the user's clock colour. Feeding it the app's foreground would not produce the
// app's foreground — it would produce a washed-out approximation, and on a light
// wallpaper the app's near-black text disappears entirely. Leaving them
// unstyled is what makes them legible on every wallpaper.

private struct InlineView: View {
  let entry: TasksEntry

  var body: some View {
    // One line, no styling of its own — the system tints and truncates it.
    Text(entry.tasks.first?.title ?? "No tasks")
  }
}

private struct CircularView: View {
  let entry: TasksEntry

  var body: some View {
    Gauge(value: 0) { EmptyViewShim() }
      currentValueLabel: { Text("\(entry.matchCount)") }
      .gaugeStyle(.accessoryCircularCapacity)
      .containerBackground(.clear, for: .widget)
  }
}

/// `SwiftUI.EmptyView` is shadowed by the private `EmptyView` above.
private struct EmptyViewShim: View {
  var body: some View { SwiftUI.EmptyView() }
}

private struct RectangularView: View {
  let entry: TasksEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      ForEach(entry.tasks.prefix(2)) { task in
        Text(task.title).font(.caption2).lineLimit(1)
      }
      if entry.tasks.isEmpty {
        Text("No tasks").font(.caption2).foregroundStyle(.secondary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .containerBackground(.clear, for: .widget)
  }
}

// MARK: - Deep links

enum DeepLink {
  /// The same four fields a push notification carries, in the same names.
  ///
  /// `org_id` is the one that is easy to leave out and expensive to omit: a
  /// widget can be configured for a workspace the app is not currently in, and
  /// opening a task without switching first fetches it under the wrong
  /// organisation and reports it deleted. Push hit exactly that bug. Carrying
  /// the same payload lets both go through one routing path in the app.
  ///
  /// `identifier` is passed so the detail header reads "ATLAS-217" on the first
  /// frame instead of flashing a placeholder until the fetch lands.
  static func task(_ task: WidgetTask) -> URL {
    var components = URLComponents()
    components.scheme = "elliptic"
    components.host = "open"
    components.queryItems = [
      URLQueryItem(name: "entity_type", value: "task"),
      URLQueryItem(name: "entity_id", value: task.id),
      URLQueryItem(name: "identifier", value: task.identifier),
      URLQueryItem(name: "org_id", value: task.orgId),
    ]
    return components.url ?? URL(string: "elliptic://open")!
  }
}
