import { ComponentProps } from "react"
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import {
  CompositeScreenProps,
  NavigationContainer,
  NavigatorScreenParams,
} from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

export type HomeStackParamList = {
  HomeMain: undefined
  Chat: undefined
  Search: undefined
  Projects: undefined
  ProjectDetail: { projectId: string; title: string }
}

export type TasksStackParamList = {
  TasksList: undefined
  TaskDetail: { taskId: string; title: string }
}

export type NotesStackParamList = {
  NotesList: undefined
  NoteDetail: { noteId: string; title: string }
}

export type InboxStackParamList = {
  Notifications: undefined
  Triage: undefined
}

export type ProfileStackParamList = {
  ProfileMain: undefined
  Stickies: undefined
  Settings: undefined
}

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>
  Tasks: NavigatorScreenParams<TasksStackParamList>
  Notes: NavigatorScreenParams<NotesStackParamList>
  Inbox: NavigatorScreenParams<InboxStackParamList>
  Profile: NavigatorScreenParams<ProfileStackParamList>
}

export type AppStackParamList = {
  Login: undefined
  Register: undefined
  Main: NavigatorScreenParams<MainTabParamList>
  SwitchWorkspace: undefined
}

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

export type HomeStackScreenProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>

export type TasksStackScreenProps<T extends keyof TasksStackParamList> = NativeStackScreenProps<
  TasksStackParamList,
  T
>

export type NotesStackScreenProps<T extends keyof NotesStackParamList> = NativeStackScreenProps<
  NotesStackParamList,
  T
>

export type InboxStackScreenProps<T extends keyof InboxStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<InboxStackParamList, T>,
  MainTabScreenProps<keyof MainTabParamList>
>

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, T>,
  MainTabScreenProps<keyof MainTabParamList>
>

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
