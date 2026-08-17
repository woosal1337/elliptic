import AppIntents
import WidgetKit

/// What one widget instance shows.
///
/// This is the "Edit Widget" sheet: long-press the widget, tap Edit, and these
/// parameters appear. Because the configuration lives on the instance rather
/// than in the app, two widgets on the same screen can watch different
/// organisations — which is the whole reason this is an `AppIntentConfiguration`
/// widget instead of a `StaticConfiguration` one.
///
/// The pickers are populated from the snapshot in the App Group, so they work
/// with no network and while the device is locked.
struct TaskFilterIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Choose tasks"
  static var description = IntentDescription(
    "Pick the organisation, project and statuses this widget shows.")

  @Parameter(title: "Organization")
  var organization: OrgEntity?

  /// Unset means every project in the organisation.
  @Parameter(title: "Project")
  var project: ProjectEntity?

  @Parameter(title: "Status", default: [.todo, .backlog])
  var statuses: [StatusFilter]
}

/// The statuses a widget may show.
///
/// Open work only. "The five you most recently finished" is a report, not a
/// glance, and closed states would crowd out the ones you can still act on.
enum StatusFilter: String, AppEnum, CaseIterable {
  case backlog
  case todo
  case inProgress = "in_progress"
  case inReview = "in_review"

  static var typeDisplayRepresentation: TypeDisplayRepresentation { "Status" }

  /// The Edit Widget sheet is drawn by the system, not by us — we hand it an
  /// enum and iOS renders the picker. A title-only case gets a bare row, which
  /// is why the symbols are here: they are the only part of that list we
  /// control.
  ///
  /// Each one mirrors the glyph `app/components/StatusIcon.tsx` draws for the
  /// same status — a dashed ring for backlog, an empty ring for todo, then an
  /// increasingly filled centre. Change them together.
  static var caseDisplayRepresentations: [StatusFilter: DisplayRepresentation] {
    [
      .backlog: DisplayRepresentation(title: "Backlog", image: .init(systemName: "circle.dashed")),
      .todo: DisplayRepresentation(title: "Todo", image: .init(systemName: "circle")),
      .inProgress: DisplayRepresentation(
        title: "In progress", image: .init(systemName: "smallcircle.filled.circle")),
      .inReview: DisplayRepresentation(
        title: "In review", image: .init(systemName: "largecircle.fill.circle")),
    ]
  }
}

// MARK: - Organisation

struct OrgEntity: AppEntity, Identifiable {
  let id: String
  let name: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation { "Organization" }
  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)", image: .init(systemName: "building.2"))
  }
  static var defaultQuery = OrgQuery()
}

struct OrgQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [OrgEntity] {
    let all = SnapshotStore.read().orgs
    return identifiers.compactMap { id in
      all.first { $0.id == id }.map { OrgEntity(id: $0.id, name: $0.name) }
    }
  }

  func suggestedEntities() async throws -> [OrgEntity] {
    SnapshotStore.read().orgs.map { OrgEntity(id: $0.id, name: $0.name) }
  }

  /// Preselects the first organisation so a freshly dropped widget shows
  /// something rather than an empty frame the user has to go and configure.
  func defaultResult() async -> OrgEntity? {
    try? await suggestedEntities().first
  }
}

// MARK: - Project

struct ProjectEntity: AppEntity, Identifiable {
  let id: String
  let orgId: String
  let name: String
  let key: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation { "Project" }

  /// Labelled with the key because the list is not scoped to the chosen
  /// organisation — see `ProjectQuery`. Two workspaces can both have a
  /// "Platform" project, and only the key tells them apart.
  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)", subtitle: "\(key)", image: .init(systemName: "folder"))
  }

  static var defaultQuery = ProjectQuery()
}

/// Every project, not just the selected organisation's.
///
/// Narrowing one parameter by another needs `@IntentParameterDependency`, which
/// is iOS 18, and this target deploys to 17. Showing all of them is the honest
/// fallback: picking a project from the wrong organisation simply matches no
/// tasks, because the provider filters on both.
struct ProjectQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [ProjectEntity] {
    let all = SnapshotStore.read().projects
    return identifiers.compactMap { id in
      all.first { $0.id == id }
        .map { ProjectEntity(id: $0.id, orgId: $0.orgId, name: $0.name, key: $0.key) }
    }
  }

  func suggestedEntities() async throws -> [ProjectEntity] {
    SnapshotStore.read().projects.map {
      ProjectEntity(id: $0.id, orgId: $0.orgId, name: $0.name, key: $0.key)
    }
  }
}
