import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

import { consentSteps, type Actor } from "@/data/consent-steps";
import { cn } from "@/lib/utils";

const actorBadgeClass: Record<Actor, string> = {
  "Peer (Student)": "bg-secondary text-primary",
  System: "bg-muted text-muted-foreground",
  Faculty: "bg-warning/15 text-foreground",
  "AI System": "bg-accent text-accent-foreground",
};

export function ConsentStepper({
  currentStep,
  className,
}: {
  /** The 1-based index of the student's current step (1 to 10) */
  currentStep: number;
  className?: string;
}) {
  const step = Math.min(Math.max(Math.round(currentStep) || 1, 1), consentSteps.length);
  const listRef = useRef<HTMLOListElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  // On the horizontal (lg) layout the row scrolls; keep the current step in view.
  useEffect(() => {
    // Scroll only the list horizontally (never the page), and only when it actually overflows.
    const list = listRef.current;
    const item = currentRef.current;
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    const left = item.offsetLeft - (list.clientWidth - item.clientWidth) / 2;
    list.scrollTo?.({ left: Math.max(0, left) });
  }, [step]);

  return (
    <nav
      aria-label="Consent workflow steps"
      className={cn("w-full rounded-2xl border border-border bg-card p-5 shadow-card", className)}
    >
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-base font-bold text-foreground">Consent & Review Workflow</h2>
          <p className="text-xs text-muted-foreground">
            10-step institutional review and publishing process
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Step {step} of {consentSteps.length}
        </span>
      </div>

      <div className="relative">
        <ol
          ref={listRef}
          className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-3 lg:overflow-x-auto lg:pb-3"
        >
          {consentSteps.map((item, idx) => {
            const isDone = item.n < step;
            const isCurrent = item.n === step;

            return (
              <li
                key={item.n}
                ref={isCurrent ? currentRef : undefined}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group relative flex flex-1 flex-row items-start gap-3 lg:min-w-[170px] lg:flex-col lg:gap-2.5",
                )}
              >
                {/* Connector line for desktop */}
                {idx < consentSteps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "hidden lg:block absolute left-8 top-4 -z-0 h-0.5 w-[calc(100%-1rem)]",
                      item.n < step ? "bg-success" : "bg-border",
                    )}
                  />
                )}

                {/* Step indicator circle */}
                <div className="relative z-10 flex shrink-0 items-center justify-center">
                  {isDone ? (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success border border-success/30 font-semibold"
                      title={`Step ${item.n}: Completed`}
                    >
                      <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                      <span className="sr-only">Step {item.n} completed:</span>
                    </span>
                  ) : isCurrent ? (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-md ring-4 ring-primary/20"
                      title={`Step ${item.n}: Current`}
                    >
                      {item.n}
                      <span className="sr-only">Step {item.n} current:</span>
                    </span>
                  ) : (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground"
                      title={`Step ${item.n}: Upcoming`}
                    >
                      {item.n}
                      <span className="sr-only">Step {item.n} upcoming:</span>
                    </span>
                  )}
                </div>

                {/* Step Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className={cn(
                        "text-sm font-semibold leading-tight",
                        isCurrent
                          ? "text-primary font-bold"
                          : isDone
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {item.title}
                    </p>
                  </div>

                  <div className="mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                        actorBadgeClass[item.actor],
                      )}
                    >
                      {item.actor}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        {/* Fade on the right edge hints that more steps scroll into view on the horizontal layout. */}
        <div
          aria-hidden="true"
          data-testid="stepper-scroll-cue"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 bg-gradient-to-l from-card to-transparent lg:block"
        />
      </div>
    </nav>
  );
}
