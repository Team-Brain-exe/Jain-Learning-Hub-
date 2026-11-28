
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, CheckCircle2, Send, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  canEdit,
  setAiReport,
  statusLabel,
  toCourse,
  usePlatform,
  validateForSubmit,
} from "@/data/platform";

import { runAiCheck } from "@/lib/ai-check";
import { useAuth } from "@/hooks/use-auth";
import { AiReportView } from "@/components/studio/AiReportView";

import {
  CurriculumTab,
  DetailsTab,
  QuizTab,
} from "@/components/studio/Builder";

import {
  btn,
  btnOutline,
  card,
  Empty,
  fmtDateTime,
  RequireRole,
  StatusBadge,
} from "@/components/studio/ui";

export const Route = createFileRoute("/creator/$id")({
  head: () => ({
    meta: [
      { title: "Course builder — JAIN FET Learning Hub" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole roles={["creator"]}>
      <Builder />
    </RequireRole>
  ),
});

const tabs = [
  "Details",
  "Curriculum",
  "Assessment",
  "Preview",
  "AI check & review",
] as const;

function Builder() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const state = usePlatform();

  const sub = state.submissions.find(
    (s) => s.id === id && s.ownerId === user?.id
  );

  const [tab, setTab] =
    useState<(typeof tabs)[number]>("Details");

  const [errors, setErrors] = useState<string[]>([]);

  // Faculty reviewer details
  const [facultyName, setFacultyName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [facultyMessage, setFacultyMessage] = useState("");

  if (!sub) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Empty title="Course not found">
          <Link to="/creator" className={btn}>
            Back to Studio
          </Link>
        </Empty>
      </div>
    );
  }

  const editable = canEdit(sub);
  const issues = validateForSubmit(sub, state.policy);
  const course = toCourse(sub);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const facultyDetailsValid =
    facultyName.trim().length > 0 &&
    emailPattern.test(facultyEmail.trim());

  // Submit course for faculty review
  const submit = () => {
    if (!editable) return;

    const validationErrors = validateForSubmit(
      sub,
      state.policy
    );

    const name = facultyName.trim();
    const email = facultyEmail.trim().toLowerCase();

    if (!name) {
      validationErrors.push(
        "Enter the faculty reviewer's name."
      );
    }

    if (!email) {
      validationErrors.push(
        "Enter the faculty reviewer's email address."
      );
    } else if (!emailPattern.test(email)) {
      validationErrors.push(
        "Enter a valid faculty email address."
      );
    }

    if (
      user?.email &&
      email === user.email.trim().toLowerCase()
    ) {
      validationErrors.push(
        "You cannot select yourself as the reviewer."
      );
    }

    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      toast.error("Please complete the required fields.");
      return;
    }

    // Backend reviewer assignment and email integration
    // will be connected in the next step.

    toast.info("Faculty details validated", {
      description:
        "The reviewer submission service is not connected yet.",
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      {/* Navigation */}

      <Link
        to="/creator"
        className="inline-flex min-h-10 items-center text-sm font-semibold text-primary"
      >
        ← Creator Studio
      </Link>

      {/* Course header */}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {sub.title || "Untitled course"}
        </h1>

        <StatusBadge status={sub.status} />

        <span className="text-xs text-muted-foreground">
          {editable
            ? `Autosaved ${fmtDateTime(sub.updatedAt)}`
            : "Read-only while in review"}
        </span>
      </div>

      {/* Reviewer feedback */}

      {sub.status === "changes_requested" && (
        <div className="mt-4 rounded-lg border border-warning bg-warning/10 p-4 text-sm">
          <p className="font-semibold">
            Reviewer asked for changes
          </p>

          <p className="mt-1">
            {
              [...sub.feedback]
                .reverse()
                .find((f) => f.kind === "changes")?.text
            }
          </p>
        </div>
      )}

      {sub.status === "rejected" && (
        <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm">
          <p className="font-semibold">
            Course rejected
          </p>

          <p className="mt-1">
            {
              [...sub.feedback]
                .reverse()
                .find((f) => f.kind === "reject")?.text
            }
          </p>
        </div>
      )}

      {/* Course builder tabs */}

      <div
        role="tablist"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Details, curriculum and assessment */}

      <fieldset
        disabled={!editable}
        className="mt-6 min-w-0"
      >
        {tab === "Details" && (
          <DetailsTab sub={sub} />
        )}

        {tab === "Curriculum" && (
          <CurriculumTab sub={sub} />
        )}

        {tab === "Assessment" && (
          <QuizTab
            sub={sub}
            defaultPass={state.policy.defaultPassMark}
          />
        )}
      </fieldset>

      {/* Course preview */}

      {tab === "Preview" && (
        <div className="space-y-4">

          <p className="text-sm text-muted-foreground">
            This is how learners will see your course
            once it is approved and published.
          </p>

          <div className={card}>

            <h2 className="text-2xl font-bold">
              {course.title}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {course.category} · {course.level} ·{" "}
              {course.weeks} weeks · by{" "}
              {course.instructor.name}
            </p>

            <p className="mt-4">
              {course.overview || "No description yet."}
            </p>

            <h3 className="mt-6 font-semibold">
              What you'll learn
            </h3>

            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li
                  key={o}
                  className="flex gap-2 text-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {o}
                </li>
              ))}
            </ul>

            <h3 className="mt-6 font-semibold">
              Curriculum
            </h3>

            {course.modules.map((m, i) => (
              <div
                key={i}
                className="mt-3 rounded-lg border border-border"
              >
                <p className="bg-secondary px-4 py-2 text-sm font-semibold">
                  {m.title}
                </p>

                <ul className="divide-y divide-border text-sm">
                  {m.lessons.map((l, j) => (
                    <li
                      key={j}
                      className="flex justify-between px-4 py-2"
                    >
                      <span>{l.title}</span>

                      <span className="text-muted-foreground">
                        {l.minutes} min
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI check and faculty review */}

      {tab === "AI check & review" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* AI verification */}

          <div className="space-y-4">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <h2 className="text-lg font-bold">
                AI-assisted check
              </h2>

              <button
                type="button"
                className={btnOutline}
                disabled={!editable}
                onClick={() => {
                  setAiReport(sub.id, runAiCheck(sub));
                  toast.success("Check complete");
                }}
              >
                <Bot className="h-4 w-4" />

                {sub.aiReport
                  ? "Re-run check"
                  : "Run check"}
              </button>

            </div>

            <AiReportView sub={sub} />

          </div>

          {/* Faculty reviewer and submission */}

          <aside className="space-y-4">

            {/* Faculty reviewer selection */}

            <div className={card}>

              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />

                <h3 className="font-bold">
                  Select Faculty Reviewer
                </h3>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Choose the faculty member you would like
                to review and approve your course.
              </p>

              <fieldset
                disabled={!editable}
                className="mt-4 space-y-4"
              >

                {/* Faculty name */}

                <div>
                  <label
                    htmlFor="faculty-name"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Faculty Name *
                  </label>

                  <input
                    id="faculty-name"
                    type="text"
                    value={facultyName}
                    onChange={(e) =>
                      setFacultyName(e.target.value)
                    }
                    placeholder="Enter faculty name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                {/* Faculty email */}

                <div>
                  <label
                    htmlFor="faculty-email"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Faculty Email Address *
                  </label>

                  <div className="relative">

                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                    <input
                      id="faculty-email"
                      type="email"
                      value={facultyEmail}
                      onChange={(e) =>
                        setFacultyEmail(e.target.value)
                      }
                      placeholder="Enter official faculty email"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />

                  </div>

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Enter the faculty member's official
                    university email address.
                  </p>

                  {facultyEmail.trim() &&
                    !emailPattern.test(
                      facultyEmail.trim()
                    ) && (
                      <p className="mt-1 text-xs text-destructive">
                        Please enter a valid email address.
                      </p>
                    )}

                </div>

                {/* Optional message */}

                <div>

                  <label
                    htmlFor="faculty-message"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Message to Faculty
                    <span className="ml-1 font-normal text-muted-foreground">
                      (Optional)
                    </span>
                  </label>

                  <textarea
                    id="faculty-message"
                    value={facultyMessage}
                    onChange={(e) =>
                      setFacultyMessage(e.target.value)
                    }
                    placeholder="Add a message for your reviewer..."
                    rows={4}
                    className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />

                </div>

              </fieldset>

              {/* Reviewer details status */}

              {facultyDetailsValid && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-success/20 bg-success/5 p-3">

                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />

                  <div>
                    <p className="text-sm font-semibold text-success">
                      Reviewer details entered
                    </p>

                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {facultyName.trim()}
                      <br />
                      {facultyEmail.trim()}
                    </p>
                  </div>

                </div>
              )}

              {/* Email notification information */}

              <div className="mt-4 rounded-lg bg-primary/5 p-3">

                <div className="flex items-start gap-2">

                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Once the review service is connected,
                    the selected faculty member will
                    receive an email containing a secure
                    link to review your course.
                  </p>

                </div>

              </div>

            </div>

            {/* Submission checklist */}

            <div className={card}>

              <h3 className="font-bold">
                Submission checklist
              </h3>

              {issues.length > 0 ? (

                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>

              ) : (

                <p className="mt-3 flex items-center gap-2 text-sm text-success">

                  <CheckCircle2 className="h-4 w-4" />

                  Required course details are complete.

                </p>

              )}

              {facultyDetailsValid ? (

                <p className="mt-3 flex items-center gap-2 text-sm text-success">

                  <CheckCircle2 className="h-4 w-4" />

                  Faculty details entered.

                </p>

              ) : (

                <p className="mt-3 text-sm text-muted-foreground">
                  Enter your faculty reviewer's name
                  and email address.
                </p>

              )}

              {/* Validation errors */}

              {errors.length > 0 && (

                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                >

                  <p className="text-xs font-semibold text-destructive">
                    Please fix the following:
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-destructive">

                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}

                  </ul>

                </div>

              )}

              {/* Submit button */}

              <button
                type="button"
                className={`${btn} mt-4 w-full`}
                disabled={!editable}
                onClick={submit}
              >

                <Send className="h-4 w-4" />

                {sub.status === "changes_requested"
                  ? "Resubmit for Faculty Review"
                  : "Submit for Faculty Review"}

              </button>

              {!editable && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Status: {statusLabel[sub.status]}.
                </p>
              )}

            </div>

            {/* Submission history */}

            <div className={card}>

              <h3 className="font-bold">History</h3>

              <ol className="mt-3 space-y-3 text-sm">

                {[...sub.feedback]
                  .reverse()
                  .map((f) => (
                    <li key={f.id}>

                      <p className="text-xs text-muted-foreground">
                        {fmtDateTime(f.at)} · {f.by}
                      </p>

                      <p>{f.text}</p>

                    </li>
                  ))}

                {!sub.feedback.length && (
                  <li className="text-muted-foreground">
                    No activity yet.
                  </li>
                )}

              </ol>

            </div>

          </aside>

        </div>
      )}

    </div>
  );
}
