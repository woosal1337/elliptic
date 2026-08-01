import { cn } from "@elliptic/ui";
import {
  ACTIVITY_TAXONOMY,
  TONE_CHIP_CLASSES,
  type ActivityKind,
} from "./activity-taxonomy";

export function ActivityTag({
  kind,
  className,
  showIcon = true,
}: {
  kind: ActivityKind;
  className?: string;
  showIcon?: boolean;
}) {
  const meta = ACTIVITY_TAXONOMY[kind] ?? ACTIVITY_TAXONOMY.system;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-caption font-medium leading-none [&_svg]:size-3",
        TONE_CHIP_CLASSES[meta.tone],
        className
      )}
    >
      {showIcon ? <Icon aria-hidden="true" /> : null}
      {meta.label}
    </span>
  );
}
