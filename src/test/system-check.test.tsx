import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SystemCheck } from "@/components/proctor/SystemCheck";

describe("SystemCheck", () => {
  it("shows the warn-only note when fullscreen is unsupported (jsdom)", () => {
    render(<SystemCheck />);
    expect(
      screen.getByText(
        "Fullscreen isn't available on this device, so the exam runs in warn-only mode.",
      ),
    ).toBeInTheDocument();
  });

  it("has no one-tab row (it cannot be known before the exam starts)", () => {
    render(<SystemCheck />);
    expect(screen.queryByText("Exam is open in one tab")).not.toBeInTheDocument();
    expect(screen.getByText("Fullscreen supported")).toBeInTheDocument();
  });

  it("omits the fullscreen row and warn-only note when fullscreen is not required", () => {
    render(<SystemCheck requireFullscreen={false} />);
    expect(screen.queryByText("Fullscreen supported")).not.toBeInTheDocument();
    expect(screen.queryByText(/warn-only/)).not.toBeInTheDocument();
    expect(screen.getByText("Screen size is enough")).toBeInTheDocument();
  });

  it("renders neutral Checking… with no red state before the checks run", async () => {
    const { renderToString } = await import("react-dom/server");
    const html = renderToString(<SystemCheck />);
    expect(html).toContain("Checking…");
    expect(html).not.toContain("✕");
    expect(html).not.toContain("warn-only");
  });
});
