import { Check } from "lucide-react";

import { consentSteps, type Actor } from "@/data/consent-steps";
import { cn } from "@/lib/utils";

const actorBadgeClass: Record<Actor, string> = {
  "Peer (Student)": "bg-secondary text-primary",
  System: "bg-muted text-muted-foreground",
  Faculty: "bg-warning/15 text-warning",
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
          Step {Math.min(Math.max(currentStep, 1), 10)} of {consentSteps.length}
        </span>
      </div>

      <ol className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-3 lg:overflow-x-auto lg:pb-3">
        {consentSteps.map((step, idx) => {
          const isDone = step.n < currentStep;
          const isCurrent = step.n === currentStep;
          const isUpcoming = step.n > currentStep;

          return (
            <li
              key={step.n}
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
                    step.n < currentStep ? "bg-success" : "bg-border",
                  )}
                />
              )}

              {/* Step indicator circle */}
              <div className="relative z-10 flex shrink-0 items-center justify-center">
                {isDone ? (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success border border-success/30 font-semibold"
                    title={`Step ${step.n}: Completed`}
                  >
                    <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                    <span className="sr-only">Step {step.n} completed:</span>
                  </span>
                ) : isCurrent ? (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-md ring-4 ring-primary/20"
                    title={`Step ${step.n}: Current`}
                  >
                    {step.n}
                    <span className="sr-only">Step {step.n} current:</span>
                  </span>
                ) : (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground"
                    title={`Step ${step.n}: Upcoming`}
                  >
                    {step.n}
                    <span className="sr-only">Step {step.n} upcoming:</span>
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
                    {step.title}
                  </p>
                </div>

                <div className="mt-1">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                      actorBadgeClass[step.actor],
                    )}
                  >
                    {step.actor}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
