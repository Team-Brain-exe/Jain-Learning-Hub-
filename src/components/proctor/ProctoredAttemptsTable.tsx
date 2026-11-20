import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";

import { card, fmtDateTime } from "@/components/studio/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { findCourse, type AppUser, type QuizAttempt } from "@/data/platform";
import type { AttemptMeta } from "@/data/proctoring";

import { ViolationTimeline } from "./ViolationTimeline";

const AUTO_LABEL = { timeout: "Time ran out", violations: "Too many violations" } as const;

function autoLabel(meta: AttemptMeta): string {
  if (!meta.autoSubmitted) return "—";
  return meta.autoSubmitReason ? AUTO_LABEL[meta.autoSubmitReason] : "—";
}

export function ProctoredAttemptsTable({
  attempts,
  users,
}: {
  attempts: QuizAttempt[];
  users: AppUser[];
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const rows = attempts
    .filter((a): a is QuizAttempt & { meta: AttemptMeta } => !!a.meta)
    .sort((a, b) => b.at.localeCompare(a.at));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <section className={card} aria-labelledby="proctored-attempts-heading">
      <h2 id="proctored-attempts-heading" className="text-lg font-bold">
        Proctored attempts{" "}
        <span className="text-sm font-normal text-muted-foreground">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No proctored attempts yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Auto-submitted</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const name = users.find((u) => u.id === a.userId)?.name ?? "Unknown student";
                const warnings = a.meta.violations.filter((v) => v.counted).length;
                const expanded = open.has(a.id);
                const panelId = `timeline-${a.id}`;
                // The attempt stores its submission time; exam start = submission − time taken.
                const startedAt = new Date(
                  new Date(a.at).getTime() - a.meta.timeTakenSec * 1000,
                ).toISOString();
                return (
                  <Fragment key={a.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          aria-label={`${expanded ? "Hide" : "Show"} violation timeline for ${name}`}
                          onClick={() => toggle(a.id)}
                          className="inline-flex items-center gap-1 text-left"
                        >
                          {expanded ? (
                            <ChevronDown className="size-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="size-4" aria-hidden="true" />
                          )}
                          {name}
                        </button>
                      </TableCell>
                      <TableCell>{findCourse(a.slug)?.title ?? a.slug}</TableCell>
                      <TableCell>{a.score}%</TableCell>
                      <TableCell className={warnings > 0 ? "text-warning" : undefined}>
                        {warnings}
                      </TableCell>
                      <TableCell>{autoLabel(a.meta)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDateTime(a.at)}</TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={6} id={panelId}>
                          <ViolationTimeline violations={a.meta.violations} startedAt={startedAt} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
