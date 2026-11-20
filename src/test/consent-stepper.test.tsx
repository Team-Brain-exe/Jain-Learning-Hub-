import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConsentStepper } from "@/components/consent/ConsentStepper";
import { consentSteps } from "@/data/consent-steps";

describe("ConsentStepper", () => {
  it("has exactly 10 consentSteps with unique step numbers 1 to 10", () => {
    expect(consentSteps).toHaveLength(10);
    const stepNumbers = consentSteps.map((s) => s.n);
    expect(new Set(stepNumbers).size).toBe(10);
    expect(stepNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it.each([1, 4, 7, 10])(
    "renders step %i with exactly one item marked aria-current='step'",
    (currentStep) => {
      render(<ConsentStepper currentStep={currentStep} />);

      const currentItems = screen.getAllByRole("listitem").filter((item) => {
        return item.getAttribute("aria-current") === "step";
      });

      expect(currentItems).toHaveLength(1);
      const currentStepObj = consentSteps.find((s) => s.n === currentStep)!;
      expect(currentItems[0]).toHaveTextContent(currentStepObj.title);
    },
  );

  it("renders all 10 step titles and their corresponding actor chips", () => {
    render(<ConsentStepper currentStep={4} />);

    consentSteps.forEach((step) => {
      expect(screen.getByText(step.title)).toBeInTheDocument();
      expect(screen.getByText(step.description)).toBeInTheDocument();
    });

    // Verify actor chips
    expect(screen.getAllByText("Peer (Student)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("System").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Faculty").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI System").length).toBeGreaterThan(0);
  });

  it("marks previous steps as completed with check indicators", () => {
    const { container } = render(<ConsentStepper currentStep={4} />);
    const listItems = screen.getAllByRole("listitem");

    // Steps 1, 2, 3 should be completed
    expect(listItems[0]).toHaveTextContent("Step 1 completed:");
    expect(listItems[1]).toHaveTextContent("Step 2 completed:");
    expect(listItems[2]).toHaveTextContent("Step 3 completed:");

    // Step 4 is current
    expect(listItems[3]).toHaveAttribute("aria-current", "step");
    expect(listItems[3]).toHaveTextContent("Step 4 current:");

    // Step 5 is upcoming
    expect(listItems[4]).not.toHaveAttribute("aria-current");
    expect(listItems[4]).toHaveTextContent("Step 5 upcoming:");
  });
});
