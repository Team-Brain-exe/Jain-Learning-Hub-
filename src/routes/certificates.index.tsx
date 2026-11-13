import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { bestAttempt, eligibility, getQuiz, requestCertificate, useAllCourses, usePlatform } from "@/data/platform";
import { courseProgress } from "@/data/courses";
import { useAuth } from "@/hooks/use-auth";
import { useLearner } from "@/hooks/use-enrollment";
import { btn, btnOutline, card, Empty, fmtDate, PageHeader, RequireRole } from "@/components/studio/ui";

export const Route = createFileRoute("/certificates/")({
  head: () => ({ meta: [{ title: "Certificates — JAIN FET Learning Hub" }, { name: "description", content: "Your course-completion certificates and eligibility." }] }),
  component: () => <RequireRole roles={["learner", "creator", "reviewer", "admin"]}><Certificates /></RequireRole>,
});

function Certificates() {
  const { user } = useAuth();
  const state = usePlatform();
  const learner = useLearner();
  const courses = useAllCourses().filter((c) => learner.enrolled.includes(c.slug));
  const mine = state.certificates.filter((c) => c.learnerId === user!.id);

  return (
    <div>
      <PageHeader eyebrow="Certificates" title="Your certificates" subtitle="Certificates are issued after the university authorises your completion. Pilot rule: finish every lesson and pass the assessment." />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        <section>
          <h2 className="text-xl font-bold">Eligibility</h2>
          {!courses.length ? <div className="mt-4"><Empty title="No enrolled courses" body="Enroll in a course to start working toward a certificate."><Link to="/courses" className={btn}>Explore Courses</Link></Empty></div> : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {courses.map((c) => {
                const p = courseProgress(c, learner.completed[c.slug]);
                const quiz = getQuiz(c.slug, state);
                const best = bestAttempt(state.attempts, user!.id, c.slug);
                const el = eligibility({ totalLessons: p.total, doneLessons: p.done, hasQuiz: !!quiz, quizPassed: !!best?.passed });
                const cert = mine.find((m) => m.slug === c.slug && m.status !== "rejected");
                return (
                  <div key={c.slug} className={card}>
                    <p className="font-semibold">{c.title}</p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      <li className="flex items-center gap-2">{p.done === p.total ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}Lessons {p.done}/{p.total}</li>
                      {quiz ? <li className="flex items-center gap-2">{best?.passed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}Assessment {best ? `best ${best.score}% (pass ${quiz.passMark}%)` : "not attempted"}</li> : <li className="text-xs text-muted-foreground">No assessment required for this course.</li>}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quiz && !best?.passed && <Link to="/learn/$slug/quiz" params={{ slug: c.slug }} className={btnOutline}>Take assessment</Link>}
                      {cert?.status === "issued" ? <Link to="/certificates/$certId" params={{ certId: cert.id }} className={btn}>View certificate</Link>
                        : cert?.status === "requested" ? <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">Awaiting university authorisation</span>
                        : <button className={btn} disabled={!el.eligible} onClick={() => { const e = requestCertificate(user!, c, best?.score); e ? toast.error(e) : toast.success("Certificate requested", { description: "An administrator will review it." }); }}>Request certificate</button>}
                    </div>
                    {!el.eligible && <p className="mt-2 text-xs text-muted-foreground">{el.reasons.join(" ")}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {mine.some((m) => m.status === "issued") && (
          <section>
            <h2 className="text-xl font-bold">Issued</h2>
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
              {mine.filter((m) => m.status === "issued").map((m) => (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4"><Award className="h-6 w-6 text-primary" /><div className="flex-1"><p className="font-semibold">{m.courseTitle}</p><p className="text-xs text-muted-foreground">{m.id} · {fmtDate(m.issuedAt)}</p></div><Link to="/certificates/$certId" params={{ certId: m.id }} className={btnOutline}>Open</Link></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
