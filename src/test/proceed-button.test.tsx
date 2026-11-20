import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProceedToUploadButton } from "@/components/consent/ProceedToUploadButton";

describe("ProceedToUploadButton", () => {
  it("renders disabled with 'Request permission from a faculty member first.' when status is undefined", () => {
    const onProceed = vi.fn();
    render(<ProceedToUploadButton status={undefined} onProceed={onProceed} />);

    const button = screen.getByRole("button", { name: /Proceed to Upload/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");

    // Verify hint for locked state
    expect(screen.getByText("Request permission from a faculty member first.")).toBeInTheDocument();

    // Verify click does not fire onProceed
    fireEvent.click(button);
    expect(onProceed).not.toHaveBeenCalled();
  });

  it("renders disabled with 'Waiting for faculty approval.' when status is pending", () => {
    const onProceed = vi.fn();
    render(<ProceedToUploadButton status="pending" onProceed={onProceed} />);

    const button = screen.getByRole("button", { name: /Proceed to Upload/i });
    expect(button).toBeDisabled();
    expect(screen.getByText("Waiting for faculty approval.")).toBeInTheDocument();

    fireEvent.click(button);
    expect(onProceed).not.toHaveBeenCalled();
  });

  it("renders disabled with 'Your request was rejected. Submit a revised request.' when status is rejected", () => {
    const onProceed = vi.fn();
    render(<ProceedToUploadButton status="rejected" onProceed={onProceed} />);

    const button = screen.getByRole("button", { name: /Proceed to Upload/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText("Your request was rejected. Submit a revised request."),
    ).toBeInTheDocument();

    fireEvent.click(button);
    expect(onProceed).not.toHaveBeenCalled();
  });

  it("renders enabled and calls onProceed only when status is approved", () => {
    const onProceed = vi.fn();
    render(<ProceedToUploadButton status="approved" onProceed={onProceed} />);

    const button = screen.getByRole("button", { name: /Proceed to Upload/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it("provides keyboard focusable wrapper with tabIndex and aria-describedby for locked states", () => {
    render(<ProceedToUploadButton status="pending" onProceed={vi.fn()} />);

    const button = screen.getByRole("button", { name: /Proceed to Upload/i });
    const wrapper = button.parentElement!;
    expect(wrapper).toHaveAttribute("tabindex", "0");
    expect(wrapper).toHaveAttribute("aria-describedby");

    const describedById = wrapper.getAttribute("aria-describedby");
    const hintElement = document.getElementById(describedById!);
    expect(hintElement).toHaveTextContent("Waiting for faculty approval.");
  });
});
