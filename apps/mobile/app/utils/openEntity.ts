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
  if (entityType === "task") {
    parent.navigate("Tasks", { screen: "TaskDetail", params: { taskId: id, title } })
  } else if (entityType === "note") {
    parent.navigate("Notes", { screen: "NoteDetail", params: { noteId: id, title } })
  }
}
