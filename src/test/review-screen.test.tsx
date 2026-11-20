import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewScreen } from "@/components/proctor/ReviewScreen";
import { SubmitDialog } from "@/components/proctor/SubmitDialog";
import { q, quizOf } from "./exam-fixtures";

const quiz = quizOf([q("a"), q("b", { type: "multi" }), q("c"), q("d")]);
const order = ["a", "b", "c", "d"];

describe("ReviewScreen", () => {
  it("lists exactly flagged and unanswered questions; [] is unanswered", () => {
    const onGo = vi.fn();
    render(
      <ReviewScreen
        quiz={quiz}
        order={order}
        answers={{ a: 0, b: [], d: 1 }}
        flagged={["d"]}
        onGo={onGo}
        onBack={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const list = screen.getByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Q2");
    expect(rows[1]).toHaveTextContent("Q3");
    expect(rows[2]).toHaveTextContent("Q4");
    expect(within(list).queryByText(/Q1/)).toBeNull();
    fireEvent.click(within(rows[1]!).getByRole("button", { name: /Go/ }));
    expect(onGo).toHaveBeenCalledWith(2);
  });

  it("fires back and submit", () => {
    const onBack = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ReviewScreen
        quiz={quiz}
        order={order}
        answers={{}}
        flagged={[]}
        onGo={vi.fn()}
        onBack={onBack}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Back to exam/ }));
    fireEvent.click(screen.getByRole("button", { name: "Submit exam" }));
    expect(onBack).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
  });
});

describe("SubmitDialog", () => {
  it("warns about unanswered questions", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<SubmitDialog open unanswered={3} onCancel={onCancel} onConfirm={onConfirm} />);
    expect(screen.getByText("Submit exam?")).toBeInTheDocument();
    expect(
      screen.getByText(/3 questions are unanswered and will be marked wrong/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit now" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep working" }));
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
