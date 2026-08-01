import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { errorMessage } from "@/lib/api";

export const OPTIMISTIC_FLAG = "__optimistic" as const;

export type Optimistic<T> = T & { readonly [OPTIMISTIC_FLAG]?: true };

export function markOptimistic<T>(value: T): Optimistic<T> {
  return { ...value, [OPTIMISTIC_FLAG]: true };
}

export function isOptimistic(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>)[OPTIMISTIC_FLAG] === true
  );
}

export function tempId(): string {
  return `temp_${crypto.randomUUID()}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith("temp_");
}

export interface OptimisticTarget<TData> {
  queryKey: QueryKey;
  updater: (current: TData | undefined) => TData | undefined;
}

export interface OptimisticContext {
  snapshots: Array<{ queryKey: QueryKey; previous: unknown }>;
}

export interface OptimisticMutationConfig<TVariables> {
  queryClient: QueryClient;
  targets: (variables: TVariables) => OptimisticTarget<unknown>[];
  invalidateKeys?: (variables: TVariables) => QueryKey[];
  errorMessage?: (variables: TVariables) => string;
}

export interface OptimisticHandlers<TVariables> {
  onMutate: (variables: TVariables) => Promise<OptimisticContext>;
  onError: (
    error: unknown,
    variables: TVariables,
    context: OptimisticContext | undefined
  ) => void;
  onSettled: (
    data: unknown,
    error: unknown,
    variables: TVariables,
    context: OptimisticContext | undefined
  ) => void;
}

export function optimisticMutation<TVariables>(
  config: OptimisticMutationConfig<TVariables>
): OptimisticHandlers<TVariables> {
  const { queryClient, targets, invalidateKeys, errorMessage: toMessage } = config;

  return {
    onMutate: async (variables) => {
      const resolved = targets(variables);
      const keys = uniqueKeys(resolved.map((target) => target.queryKey));

      await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));

      const snapshots = keys.map((queryKey) => ({
        queryKey,
        previous: queryClient.getQueryData(queryKey),
      }));

      for (const target of resolved) {
        queryClient.setQueryData(target.queryKey, target.updater);
      }

      return { snapshots };
    },
    onError: (error, variables, context) => {
      if (context) {
        for (const snapshot of context.snapshots) {
          queryClient.setQueryData(snapshot.queryKey, snapshot.previous);
        }
      }
      toast.error(toMessage ? toMessage(variables) : errorMessage(error));
    },
    onSettled: (_data, _error, variables) => {
      const keys = invalidateKeys ? invalidateKeys(variables) : [];
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  };
}

function uniqueKeys(keys: QueryKey[]): QueryKey[] {
  const seen = new Set<string>();
  const result: QueryKey[] = [];
  for (const key of keys) {
    const hash = JSON.stringify(key);
    if (!seen.has(hash)) {
      seen.add(hash);
      result.push(key);
    }
  }
  return result;
}
