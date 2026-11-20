import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { platform, submitAttempt } from "@/data/platform";
import { examSessions } from "@/data/proctoring";
import { signInDemo, signOut } from "@/hooks/use-auth";
import { Route as ExamRoute } from "@/routes/learn.$slug.exam";
import { Route as QuizRoute } from "@/routes/learn.$slug.quiz";

// The enrollment hook caches across tests; drive it directly instead.
const learner = vi.hoisted(() => ({ enrolled: [] as string[] }));
vi.mock("@/hooks/use-enrollment", () => ({ useEnrollments: () => learner.enrolled }));

const PY = "python-programming-fundamentals";
const DSA = "data-structures-and-algorithms";

/**
 * Mounts only the two routes under a bare root (the real root renders <html> and stylesheets,
 * which jsdom cannot load). Mirrors how routeTree.gen.ts attaches file routes.
 */
async function renderAt(path: string) {
  const root = createRootRoute({ component: Outlet });
  const quiz = QuizRoute.update({
    id: "/learn/$slug/quiz",
    path: "/learn/$slug/quiz",
    getParentRoute: () => root,
  } as never);
  const exam = ExamRoute.update({
    id: "/learn/$slug/exam",
    path: "/learn/$slug/exam",
    getParentRoute: () => root,
  } as never);
  const router = createRouter({
    routeTree: root.addChildren([quiz, exam]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  return router;
}

describe("proctored quiz entry and exam route", () => {
  beforeEach(() => {
    localStorage.clear();
    platform.reset();
    examSessions.reset();
    signInDemo("u-creator");
    learner.enrolled = [PY, DSA];
  });
  afterEach(() => {
    cleanup();
    signOut();
  });

  it("keeps the non-proctored Python quiz as a question list with Submit answers", async () => {
    await renderAt(`/learn/${PY}/quiz`);
    expect(await screen.findByRole("button", { name: "Submit answers" })).toBeInTheDocument();
    expect(screen.queryByText("Open exam in new tab")).not.toBeInTheDocument();
  });

  it("shows the DSA entry card with a new-tab link instead of questions", async () => {
    await renderAt(`/learn/${DSA}/quiz`);
    const link = await screen.findByRole("link", { name: "Open exam in new tab" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("href", `/learn/${DSA}/exam`);
    expect(screen.getByText("Proctored exam")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit answers" })).not.toBeInTheDocument();
  });

  it("refuses to run a non-proctored quiz as an exam", async () => {
    await renderAt(`/learn/${PY}/exam`);
    expect(await screen.findByText("This assessment isn't a proctored exam")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /quiz/i })).toHaveAttribute(
      "href",
      `/learn/${PY}/quiz`,
    );
    expect(screen.queryByText("Before you begin")).not.toBeInTheDocument();
  });

  it("shows the DSA intro with Start disabled until the rules are acknowledged", async () => {
    await renderAt(`/learn/${DSA}/exam`);
    expect(await screen.findByText("Before you begin")).toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Start proctored exam" });
    expect(start).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(start).toBeEnabled();
  });

  it("asks a learner who is not enrolled to enroll instead of showing the exam", async () => {
    learner.enrolled = [PY];
    await renderAt(`/learn/${DSA}/exam`);
    expect(await screen.findByText("Enroll to take the exam")).toBeInTheDocument();
    expect(screen.queryByText("Before you begin")).not.toBeInTheDocument();
  });

  it("starts the exam into the question view with the top bar and navigator", async () => {
    await renderAt(`/learn/${DSA}/exam`);
    fireEvent.click(await screen.findByRole("checkbox"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start proctored exam" }));
    });
    expect(screen.getAllByText(/Question 1 of \d+/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous question" })).toBeDisabled();
    expect(screen.queryByText("Before you begin")).not.toBeInTheDocument();
  });

  it("marks attempt history rows that recorded counted violations", async () => {
    const user = platform.get().users.find((u) => u.id === "u-creator")!;
    submitAttempt(
      user,
      DSA,
      {},
      {
        violations: [
          { type: "tab_hidden", at: "2026-01-01T00:00:00Z", counted: true },
          { type: "second_tab", at: "2026-01-01T00:00:01Z", counted: false },
        ],
        timeTakenSec: 60,
        autoSubmitted: false,
      },
    );
    await renderAt(`/learn/${DSA}/quiz`);
    expect(await screen.findByText("Attempt history")).toBeInTheDocument();
    expect(screen.getByText("⚠ 1")).toBeInTheDocument();
  });
});
