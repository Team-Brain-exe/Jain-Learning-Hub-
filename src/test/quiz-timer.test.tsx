import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuizTimer } from "@/components/proctor/QuizTimer";

describe("QuizTimer", () => {
  it("renders mm:ss", () => {
    render(<QuizTimer secondsLeft={125} />);
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("renders h:mm:ss at an hour or more", () => {
    render(<QuizTimer secondsLeft={3725} />);
    expect(screen.getByText("1:02:05")).toBeInTheDocument();
  });

  it("uses destructive tone below 60 s", () => {
    const { container } = render(<QuizTimer secondsLeft={59} />);
    expect(container.firstElementChild).toHaveClass("text-destructive");
  });

  it("uses warning tone below 300 s and muted otherwise", () => {
    const warn = render(<QuizTimer secondsLeft={299} />);
    expect(warn.container.firstElementChild).toHaveClass("text-warning");
    const calm = render(<QuizTimer secondsLeft={300} />);
    expect(calm.container.firstElementChild).toHaveClass("bg-muted");
  });

  it("announces thresholds in a polite live region", () => {
    const { container } = render(<QuizTimer secondsLeft={299} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent("5 minutes left");
    expect(live).toHaveClass("sr-only");
  });

  it("has an empty live region above 10 minutes", () => {
    const { container } = render(<QuizTimer secondsLeft={601} />);
    expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
  });
});
