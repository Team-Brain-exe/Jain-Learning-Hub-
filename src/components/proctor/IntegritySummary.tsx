import { card } from "@/components/studio/ui";
import { TYPE_LABEL, type AttemptMeta } from "@/data/proctoring";
import { formatClock, formatDuration } from "@/lib/format-time";
import { cn } from "@/lib/utils";

const submittedLabel = (meta: AttemptMeta): string => {
  if (!meta.autoSubmitted) return "By student";
  return meta.autoSubmitReason === "violations"
    ? "Auto-submitted (too many violations)"
    : "Auto-submitted (time ran out)";
};

export function IntegritySummary({ meta }: { meta: AttemptMeta }) {
  const counted = meta.violations.filter((v) => v.counted).length;
  return (
    <section className={cn(card, "space-y-3 p-5")}>
      <h2 className="text-base font-semibold">Integrity summary</h2>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Time taken</dt>
          <dd className="font-medium">{formatDuration(meta.timeTakenSec)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Warnings</dt>
          <dd className={cn("font-medium", counted > 0 && "text-warning")}>{counted}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Submitted</dt>
          <dd className="text-right font-medium">{submittedLabel(meta)}</dd>
        </div>
      </dl>
      {meta.violations.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-3 text-sm">
          {meta.violations.map((v, i) => (
            <li key={`${v.at}-${i}`}>
              <span className="tabular-nums">{formatClock(v.at)}</span> · {TYPE_LABEL[v.type]}
              {!v.counted && <span className="ml-1 text-muted-foreground">(not counted)</span>}
            </li>
          ))}
        </ul>
      )}
      {counted === 0 && (
        <p className="text-sm font-medium text-success">No integrity issues recorded.</p>
      )}
    </section>
  );
}
