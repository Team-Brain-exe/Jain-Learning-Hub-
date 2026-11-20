import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SecondTabBlocker } from "@/components/proctor/SecondTabBlocker";
import { ViolationWarning } from "@/components/proctor/ViolationWarning";

// Radix preventDefaults an Escape keydown itself when it dismisses, so the DOM event cannot tell
// whether our `onEscapeKeyDown` is wired. Capture the prop the component passes instead.
const captured = vi.hoisted(() => ({ escape: undefined as undefined | ((e: Event) => void) }));
vi.mock("@/components/ui/alert-dialog", async (orig) => {
  const actual = await orig<typeof import("@/components/ui/alert-dialog")>();
  const Content = React.forwardRef<HTMLDivElement, Record<string, unknown>>((props, ref) => {
    captured.escape = props.onEscapeKeyDown as typeof captured.escape;
    return <actual.AlertDialogContent ref={ref} {...props} />;
  });
  Content.displayName = "CapturingContent";
  return { ...actual, AlertDialogContent: Content };
});

const escapeIsBlocked = () => {
  const e = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
  captured.escape?.(e);
  return e.defaultPrevented;
};

const w = (last: boolean) => ({
  n: 2,
  max: 3,
  type: "tab_hidden" as const,
  at: "2026-01-01T10:14:32.000Z",
  last,
});

describe("ViolationWarning", () => {
  it("renders nothing when warning is null", () => {
    render(<ViolationWarning warning={null} onAcknowledge={() => {}} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("renders the title, label and recorded text", () => {
    render(<ViolationWarning warning={w(false)} onAcknowledge={() => {}} />);
    expect(screen.getByText("Warning 2 of 3")).toBeInTheDocument();
    expect(screen.getByText(/You left the exam tab\./)).toBeInTheDocument();
    expect(screen.getByText(/This has been recorded\./)).toBeInTheDocument();
    expect(screen.getByText(/After 3 warnings/)).toBeInTheDocument();
  });

  it("renders the last-warning variant", () => {
    render(<ViolationWarning warning={w(true)} onAcknowledge={() => {}} />);
    expect(screen.getByText("Warning 2 of 3: last warning")).toBeInTheDocument();
    expect(screen.getByText("One more violation will submit your attempt.")).toBeInTheDocument();
  });

  it("stays open on Escape", () => {
    render(<ViolationWarning warning={w(false)} onAcknowledge={() => {}} />);
    expect(escapeIsBlocked()).toBe(true);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("focuses I understand and acknowledges on click", () => {
    const onAck = vi.fn();
    render(<ViolationWarning warning={w(false)} onAcknowledge={onAck} />);
    const btn = screen.getByRole("button", { name: "I understand" });
    expect(btn).toHaveFocus();
    fireEvent.click(btn);
    expect(onAck).toHaveBeenCalledTimes(1);
  });
});

describe("SecondTabBlocker", () => {
  it("renders nothing when closed", () => {
    render(<SecondTabBlocker open={false} onTakeOver={() => {}} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("prevents Escape from dismissing", () => {
    render(<SecondTabBlocker open onTakeOver={() => {}} />);
    expect(escapeIsBlocked()).toBe(true);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("focuses Use this tab and calls onTakeOver", () => {
    const onTakeOver = vi.fn();
    render(<SecondTabBlocker open onTakeOver={onTakeOver} />);
    expect(screen.getByText("This exam is open in another tab")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Use this tab" });
    expect(btn).toHaveFocus();
    fireEvent.click(btn);
    expect(onTakeOver).toHaveBeenCalledTimes(1);
  });
});
