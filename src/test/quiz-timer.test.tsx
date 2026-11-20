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
    const { container, rerender } = render(<QuizTimer secondsLeft={301} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toBeEmptyDOMElement();
    rerender(<QuizTimer secondsLeft={299} />);
    expect(live).toHaveTextContent("5 minutes left");
    expect(live).toHaveClass("sr-only");
  });

  it("does not announce a threshold larger than a short exam at start", () => {
    const { container, rerender } = render(<QuizTimer secondsLeft={240} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toBeEmptyDOMElement();
    rerender(<QuizTimer secondsLeft={239} />);
    expect(live).toBeEmptyDOMElement();
    rerender(<QuizTimer secondsLeft={60} />);
    expect(live).toHaveTextContent("1 minute left");
  });

  it("announces the most urgent threshold passed in one jump", () => {
    const { container, rerender } = render(<QuizTimer secondsLeft={700} />);
    rerender(<QuizTimer secondsLeft={50} />);
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent("1 minute left");
  });

  it("has an empty live region above 10 minutes", () => {
    const { container } = render(<QuizTimer secondsLeft={601} />);
    expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
  });
});
