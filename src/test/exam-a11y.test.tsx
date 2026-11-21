import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FullscreenGuard } from "@/components/proctor/FullscreenGuard";
import { platform } from "@/data/platform";
import { examSessions, sessionKey } from "@/data/proctoring";
import { signInDemo, signOut } from "@/hooks/use-auth";
import { Route as ExamRoute } from "@/routes/learn.$slug.exam";

const learner = vi.hoisted(() => ({ enrolled: [] as string[] }));
vi.mock("@/hooks/use-enrollment", () => ({ useEnrollments: () => learner.enrolled }));

const DSA = "data-structures-and-algorithms";
const KEY = sessionKey(DSA, "u-creator");

async function startExam() {
  const root = createRootRoute({ component: Outlet });
  const exam = ExamRoute.update({
    id: "/learn/$slug/exam",
    path: "/learn/$slug/exam",
    getParentRoute: () => root,
  } as never);
  const router = createRouter({
    routeTree: root.addChildren([exam]),
    history: createMemoryHistory({ initialEntries: [`/learn/${DSA}/exam`] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  fireEvent.click(await screen.findByRole("checkbox"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Start proctored exam" }));
  });
}

const current = () => {
  const s = examSessions.get()[KEY]!;
  return { qid: s.order[s.current]!, answers: s.answers };
};

describe("exam keyboard shortcuts and focus", () => {
  beforeEach(() => {
    localStorage.clear();
    platform.reset();
    examSessions.reset();
    signInDemo("u-creator");
    learner.enrolled = [DSA];
  });
  afterEach(() => {
    cleanup();
    signOut();
    Reflect.deleteProperty(document, "visibilityState");
  });

  it("control: pressing 2 answers the current question when nothing is open", async () => {
    await startExam();
    fireEvent.keyDown(window, { key: "2" });
    const { qid, answers } = current();
    expect(answers[qid]).toBeDefined();
  });

  it("ignores shortcuts while the violation warning is open", async () => {
    await startExam();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await screen.findByRole("button", { name: "I understand" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "2" });
    const { qid, answers } = current();
    expect(answers[qid]).toBeUndefined();
  });

  it("ignores shortcuts while the submit dialog is open", async () => {
    await startExam();
    fireEvent.click(screen.getAllByRole("button", { name: "Review & submit" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "2" });
    const { qid, answers } = current();
    expect(answers[qid]).toBeUndefined();
  });
});

describe("FullscreenGuard focus", () => {
  afterEach(cleanup);

  it("moves focus to Enter fullscreen when it opens during an active exam", () => {
    const { rerender } = render(
      <>
        <button>Answer</button>
        <FullscreenGuard open={false} secondsLeft={90} onEnter={() => {}} />
      </>,
    );
    screen.getByRole("button", { name: "Answer" }).focus();
    rerender(
      <>
        <button>Answer</button>
        <FullscreenGuard open secondsLeft={90} onEnter={() => {}} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Enter fullscreen" })).toHaveFocus();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });
});
