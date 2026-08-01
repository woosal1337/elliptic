import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import type { MainTabParamList } from "@/navigators/navigationTypes"

/** Navigate to a task/note detail from any tab via the parent tab navigator. */
export function openEntity(
  parent: BottomTabNavigationProp<MainTabParamList> | undefined,
  entityType: string,
  id: string,
  title: string,
): void {
  if (!parent) return
  // `initial: false` keeps the tab's list screen underneath, so the detail gets
  // a back button. Without it, navigate() replaces the nested stack's state and
  // the detail becomes its root — a dead end, since detail screens hide the tab bar.
  if (entityType === "task") {
    parent.navigate("Tasks", {
      screen: "TaskDetail",
      params: { taskId: id, title },
      initial: false,
    })
  } else if (entityType === "note") {
    parent.navigate("Notes", {
      screen: "NoteDetail",
      params: { noteId: id, title },
      initial: false,
    })
  }
}
