import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConsentForm } from "@/components/consent/ConsentForm";

const submitButton = () => screen.getByRole("button", { name: "Request upload permission" });
const consentBox = () => screen.getByRole("checkbox");

describe("ConsentForm", () => {
  it("keeps submit disabled until the declaration is ticked", () => {
    render(<ConsentForm onSubmit={vi.fn()} />);
    expect(submitButton()).toBeDisabled();
    fireEvent.click(consentBox());
    expect(submitButton()).toBeEnabled();
  });

  it("does not show an error while the user is still typing", () => {
    render(<ConsentForm onSubmit={vi.fn()} />);
    fireEvent.input(screen.getByLabelText("Content title"), { target: { value: "a" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows every required-field message on submit and links it with aria-describedby", async () => {
    const onSubmit = vi.fn();
    render(<ConsentForm onSubmit={onSubmit} />);
    fireEvent.click(consentBox());
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(5));
    expect(onSubmit).not.toHaveBeenCalled();

    const title = screen.getByLabelText("Content title");
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAccessibleDescription("Enter a title (at least 5 characters).");
    expect(screen.getByLabelText("Faculty email", { exact: false })).toHaveAccessibleDescription(
      "Enter a valid faculty email address.",
    );
    expect(screen.getByText("Choose a category.")).toBeInTheDocument();
    expect(screen.getByText("Choose a content format.")).toBeInTheDocument();
    expect(
      screen.getByText("Describe the content and its purpose (at least 30 characters)."),
    ).toBeInTheDocument();
  });

  it("shows the consent message when the box is unticked after touching it", async () => {
    render(<ConsentForm onSubmit={vi.fn()} />);
    fireEvent.click(consentBox());
    fireEvent.click(consentBox());
    fireEvent.blur(consentBox());
    expect(
      await screen.findByText("You must accept the consent declaration to continue."),
    ).toBeInTheDocument();
  });

  it("submits valid values", async () => {
    const onSubmit = vi.fn();
    render(<ConsentForm onSubmit={onSubmit} />);
    fireEvent.input(screen.getByLabelText("Content title"), {
      target: { value: "Intro to Docker" },
    });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Academic" } });
    fireEvent.change(screen.getByLabelText("Content format"), { target: { value: "video" } });
    fireEvent.input(screen.getByLabelText("Description", { exact: false }), {
      target: { value: "A 20 minute beginner walkthrough of containers." },
    });
    fireEvent.input(screen.getByLabelText("Faculty email", { exact: false }), {
      target: { value: "reviewer@demo.jain.edu" },
    });
    fireEvent.click(consentBox());
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      title: "Intro to Docker",
      category: "Academic",
      format: "video",
      facultyEmail: "reviewer@demo.jain.edu",
      consent: true,
    });
  });
});
