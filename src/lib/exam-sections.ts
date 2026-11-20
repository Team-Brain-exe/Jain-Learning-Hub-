import type { Quiz, QuizQuestion } from "@/data/platform";

export interface ExamEntry {
  question: QuizQuestion;
  /** Position in the learner's display order. */
  index: number;
}

export interface ExamSectionGroup {
  section: string;
  entries: ExamEntry[];
}

/** Resolves `order` ids to questions, dropping ids the quiz no longer has. */
export function orderedEntries(quiz: Quiz, order: string[]): ExamEntry[] {
  const byId = new Map(quiz.questions.map((qn) => [qn.id, qn]));
  const out: ExamEntry[] = [];
  order.forEach((id, index) => {
    const question = byId.get(id);
    if (question) out.push({ question, index });
  });
  return out;
}

/** Groups entries by `section ?? "Questions"`, keeping first-seen section order. */
export function groupBySection(quiz: Quiz, order: string[]): ExamSectionGroup[] {
  const groups = new Map<string, ExamEntry[]>();
  for (const entry of orderedEntries(quiz, order)) {
    const key = entry.question.section ?? "Questions";
    const list = groups.get(key);
    if (list) list.push(entry);
    else groups.set(key, [entry]);
  }
  return [...groups].map(([section, entries]) => ({ section, entries }));
}
