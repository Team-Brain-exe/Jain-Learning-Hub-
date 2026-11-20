import { ADMIN_TYPE_LABEL, type Violation } from "@/data/proctoring";
import { formatOffset } from "@/lib/format-time";

interface Props {
  violations: Violation[];
  /** ISO time the exam started; offsets are measured from here. */
  startedAt: string;
}

export function ViolationTimeline({ violations, startedAt }: Props) {
  if (violations.length === 0) {
    return <p className="text-sm text-muted-foreground">No violations recorded.</p>;
  }
  return (
    <ol className="space-y-1 text-sm">
      {violations.map((v, i) => (
        <li key={`${v.at}-${i}`} className="flex flex-wrap gap-x-2">
          <span className="font-mono tabular-nums">{formatOffset(startedAt, v.at)}</span>
          <span aria-hidden="true">·</span>
          <span>{ADMIN_TYPE_LABEL[v.type]}</span>
          <span aria-hidden="true">·</span>
          <span className={v.counted ? "text-warning" : "text-muted-foreground"}>
            {v.counted ? "counted" : "not counted"}
          </span>
        </li>
      ))}
    </ol>
  );
}
