import type { AiFinding, AiReport, Submission } from "@/data/platform";

/**
 * Rule-based pre-check that produces the structured report the reviewer UI expects.
 * It ASSISTS reviewers — it never approves or publishes anything.
 * To use a real model later, keep the AiReport shape and call your API from `runAiCheck`.
 */
const words = (t: string) => t.toLowerCase().match(/[a-z]{4,}/g) ?? [];

export function runAiCheck(x: Submission): AiReport {
  const f: AiFinding[] = [];
  const add = (severity: AiFinding["severity"], area: string, message: string, suggestion: string) =>
    f.push({ id: `f${f.length + 1}`, severity, area, message, suggestion });
  const lessons = x.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m.title })));

  if (x.description.trim().length < 120) add("medium", "Metadata", "Course description is short.", "Explain who the course is for, what is covered and how learners are assessed.");
  if (x.outcomes.filter(Boolean).length < 3) add("high", "Outcomes", "Fewer than three learning outcomes.", "Add measurable outcomes starting with action verbs (e.g. “Implement…”).");
  if (!x.prerequisites.filter(Boolean).length) add("medium", "Metadata", "No prerequisites listed.", "State required background or write “None”.");
  if (x.modules.length < 2) add("medium", "Structure", "Course has a single module.", "Group lessons into at least two logical modules.");

  const seen = new Map<string, number>();
  lessons.forEach((l) => seen.set(l.title.trim().toLowerCase(), (seen.get(l.title.trim().toLowerCase()) ?? 0) + 1));
  seen.forEach((n, t) => n > 1 && add("medium", "Structure", `Lesson title “${t}” appears ${n} times.`, "Merge duplicate lessons or give them distinct titles."));

  lessons.forEach((l) => {
    if (l.minutes < 3) add("low", "Content depth", `“${l.title}” is only ${l.minutes} min — possibly thin.`, "Expand the lesson or merge it with a related one.");
    if (!l.description.trim()) add("medium", "Content", `“${l.title}” has no description.`, "Summarise what the learner will see and do.");
    if (l.kind === "video" && !l.transcript.trim()) add("medium", "Accessibility", `“${l.title}” has no transcript.`, "Add a transcript (and captions) so the lesson is accessible and reviewable.");
    if (l.kind === "video" && !l.videoUrl.trim()) add("high", "Content", `“${l.title}” has no video URL.`, "Provide the hosted video link.");
    if (!l.resources.length) add("low", "Resources", `“${l.title}” has no supporting resources.`, "Attach slides, a worksheet or further reading.");
  });

  // Outcome ↔ content alignment: an outcome with no vocabulary overlap is flagged as a possible gap.
  const corpus = new Set(words([x.title, ...lessons.flatMap((l) => [l.title, l.description, l.transcript])].join(" ")));
  x.outcomes.filter(Boolean).forEach((o) => {
    const key = words(o).filter((w) => !["that", "with", "using", "from", "this", "your", "will", "able", "learn"].includes(w));
    if (key.length && !key.some((w) => corpus.has(w))) add("high", "Alignment", `Outcome “${o}” is not reflected in any lesson.`, "Add a lesson covering this outcome or reword the outcome.");
  });

  if (!x.quiz?.questions.length) add("medium", "Assessment", "No assessment questions.", "Add quiz questions that test each learning outcome.");
  else if (x.quiz.questions.length < x.outcomes.filter(Boolean).length) add("low", "Assessment", "Fewer quiz questions than learning outcomes.", "Cover every outcome with at least one question.");
  x.quiz?.questions.forEach((q, i) => { if (!q.explanation.trim()) add("low", "Assessment", `Quiz question ${i + 1} has no explanation.`, "Add a short explanation of the correct answer."); });

  const weight = { high: 12, medium: 5, low: 2 };
  const score = Math.max(0, 100 - f.reduce((n, i) => n + weight[i.severity], 0));
  const high = f.filter((i) => i.severity === "high").length;
  return {
    generatedAt: new Date().toISOString(), provider: "local-rules", version: "rules-1.0", score,
    summary: f.length ? `${f.length} finding(s): ${high} high severity. A human reviewer makes the final decision.` : "No issues detected by the automated checks. A human reviewer makes the final decision.",
    findings: f.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity])),
  };
}
