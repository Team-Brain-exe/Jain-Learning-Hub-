import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionView } from "@/components/proctor/QuestionView";
import { useExamShortcuts } from "@/hooks/use-exam-shortcuts";
import { q } from "./exam-fixtures";

const base = () => ({
  index: 0,
  total: 5,
  optionOrder: [2, 0, 1, 3],
  answer: undefined,
  flagged: false,
  onAnswer: vi.fn(),
  onFlag: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
});

describe("QuestionView", () => {
  it("maps the first displayed option to its original index", () => {
    const p = base();
    render(<QuestionView question={q("a")} {...p} />);
    fireEvent.click(screen.getByRole("radio", { name: /Gamma/ }));
    expect(p.onAnswer).toHaveBeenCalledWith(2);
  });

  it("displays options in optionOrder", () => {
    render(<QuestionView question={q("a")} {...base()} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAccessibleName(/Gamma/);
    expect(radios[1]).toHaveAccessibleName(/Alpha/);
  });

  it("accumulates and removes multi answers as sorted original indices", () => {
    const p = base();
    const question = q("m", { type: "multi" });
    const { rerender } = render(<QuestionView question={question} {...p} />);
    expect(screen.getByText("Select all that apply")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Gamma/ }));
    expect(p.onAnswer).toHaveBeenLastCalledWith([2]);
    rerender(<QuestionView question={question} {...p} answer={[2]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Alpha/ }));
    expect(p.onAnswer).toHaveBeenLastCalledWith([0, 2]);
    rerender(<QuestionView question={question} {...p} answer={[0, 2]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Gamma/ }));
    expect(p.onAnswer).toHaveBeenLastCalledWith([0]);
    rerender(<QuestionView question={question} {...p} answer={[0]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Alpha/ }));
    expect(p.onAnswer).toHaveBeenLastCalledWith(undefined);
  });

  it("clears, flags, and navigates", () => {
    const p = base();
    render(<QuestionView question={q("a")} {...p} answer={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear answer" }));
    expect(p.onAnswer).toHaveBeenCalledWith(undefined);
    const flag = screen.getByRole("button", { name: /Flag for review/ });
    expect(flag).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(flag);
    expect(p.onFlag).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Previous/ }));
    fireEvent.click(screen.getByRole("button", { name: /Save & next/ }));
    expect(p.onPrev).toHaveBeenCalled();
    expect(p.onNext).toHaveBeenCalled();
  });

  it("shows Flagged when flagged and select-none text", () => {
    render(<QuestionView question={q("a")} {...base()} flagged />);
    expect(screen.getByRole("button", { name: /Flagged/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Prompt a")).toHaveClass("select-none");
  });

  it("readOnly disables inputs, hides flag/clear, keeps navigation", () => {
    render(<QuestionView question={q("a")} {...base()} readOnly />);
    expect(screen.getByRole("button", { name: /Previous|Prev/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save & next/ })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")[0]).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Flag/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear answer" })).toBeNull();
  });
});

describe("useExamShortcuts", () => {
  const setup = (enabled = true) => {
    const h = { onPick: vi.fn(), onPrev: vi.fn(), onNext: vi.fn(), onFlag: vi.fn() };
    renderHook(() => useExamShortcuts({ enabled, optionCount: 4, ...h }));
    return h;
  };

  it("maps keys", () => {
    const h = setup();
    fireEvent.keyDown(window, { key: "3" });
    expect(h.onPick).toHaveBeenCalledWith(2);
    fireEvent.keyDown(window, { key: "f" });
    expect(h.onFlag).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(h.onPrev).toHaveBeenCalled();
    expect(h.onNext).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "5" });
    expect(h.onPick).toHaveBeenCalledTimes(1);
  });

  it("still works when a radio or checkbox has focus, and stops native radio arrows", () => {
    const h = setup();
    for (const type of ["radio", "checkbox"]) {
      const input = document.createElement("input");
      input.type = type;
      document.body.appendChild(input);
      input.focus();
      fireEvent.keyDown(input, { key: "2" });
      fireEvent.keyDown(input, { key: "f" });
      input.remove();
    }
    expect(h.onPick).toHaveBeenCalledTimes(2);
    expect(h.onFlag).toHaveBeenCalledTimes(2);
    const radio = document.createElement("input");
    radio.type = "radio";
    document.body.appendChild(radio);
    const notCancelled = fireEvent.keyDown(radio, { key: "ArrowRight" });
    radio.remove();
    expect(notCancelled).toBe(false);
    expect(h.onNext).toHaveBeenCalledTimes(1);
  });

  it("cancels repeated arrows on a focused radio without navigating", () => {
    const h = setup();
    const radio = document.createElement("input");
    radio.type = "radio";
    document.body.appendChild(radio);
    const ev = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    radio.dispatchEvent(ev);
    radio.remove();
    expect(ev.defaultPrevented).toBe(true);
    expect(h.onNext).not.toHaveBeenCalled();
  });

  it("ignores key repeats", () => {
    const h = setup();
    fireEvent.keyDown(window, { key: "f", repeat: true });
    fireEvent.keyDown(window, { key: "ArrowRight", repeat: true });
    fireEvent.keyDown(window, { key: "1", repeat: true });
    expect(h.onFlag).not.toHaveBeenCalled();
    expect(h.onNext).not.toHaveBeenCalled();
    expect(h.onPick).not.toHaveBeenCalled();
  });

  it("ignores when disabled, with modifiers, or in inputs", () => {
    const off = setup(false);
    fireEvent.keyDown(window, { key: "1" });
    expect(off.onPick).not.toHaveBeenCalled();
    const h = setup();
    fireEvent.keyDown(window, { key: "1", ctrlKey: true });
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "2" });
    input.remove();
    expect(h.onPick).not.toHaveBeenCalled();
    expect(h.onFlag).not.toHaveBeenCalled();
  });
});
