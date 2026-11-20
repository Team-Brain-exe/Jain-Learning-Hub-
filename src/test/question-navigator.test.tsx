import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionNavigator } from "@/components/proctor/QuestionNavigator";
import { q, quizOf } from "./exam-fixtures";

const quiz = quizOf([q("a", { section: "Part A" }), q("b", { section: "Part A" }), q("c"), q("d")]);
const order = ["a", "b", "c", "d"];

describe("QuestionNavigator", () => {
  it("labels cells and groups by section", () => {
    render(
      <QuestionNavigator
        quiz={quiz}
        order={order}
        answers={{ a: 1, b: [], c: 0 }}
        flagged={["d"]}
        current={2}
        onGo={vi.fn()}
      />,
    );
    expect(screen.getByText("Part A")).toBeInTheDocument();
    expect(screen.getByTestId("section-Questions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 1, answered" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 2" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Question 3, current, answered" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 4, flagged" })).toBeInTheDocument();
    expect(screen.getByText("2 of 4 answered")).toBeInTheDocument();
  });

  it("calls onGo with the order index", () => {
    const onGo = vi.fn();
    render(
      <QuestionNavigator
        quiz={quiz}
        order={order}
        answers={{}}
        flagged={[]}
        current={0}
        onGo={onGo}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Question 4" }));
    expect(onGo).toHaveBeenCalledWith(3);
  });

  it("sheet variant opens with a trigger and review button", () => {
    const onReview = vi.fn();
    render(
      <QuestionNavigator
        variant="sheet"
        quiz={quiz}
        order={order}
        answers={{}}
        flagged={[]}
        current={1}
        onGo={vi.fn()}
        onReview={onReview}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /2 \/ 4/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review & submit" }));
    expect(onReview).toHaveBeenCalled();
  });

  it("sheet variant reports open state and closes after choosing a question", () => {
    const onGo = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <QuestionNavigator
        variant="sheet"
        quiz={quiz}
        order={order}
        answers={{}}
        flagged={[]}
        current={0}
        onGo={onGo}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /1 \/ 4/ }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Question 3" }));
    expect(onGo).toHaveBeenCalledWith(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("button", { name: "Question 3" })).not.toBeInTheDocument();
  });
});
