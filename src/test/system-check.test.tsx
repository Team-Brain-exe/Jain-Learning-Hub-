import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SystemCheck } from "@/components/proctor/SystemCheck";

describe("SystemCheck", () => {
  it("shows the warn-only note when fullscreen is unsupported (jsdom)", () => {
    render(<SystemCheck singleTab />);
    expect(
      screen.getByText(
        "Fullscreen isn't available on this device, so the exam runs in warn-only mode.",
      ),
    ).toBeInTheDocument();
  });

  it("reflects singleTab in its row", () => {
    const { unmount } = render(<SystemCheck singleTab />);
    const row = screen.getByText("Exam is open in one tab").closest("li")!;
    expect(row).toHaveTextContent("✓ Yes");
    unmount();
    render(<SystemCheck singleTab={false} />);
    expect(screen.getByText("Exam is open in one tab").closest("li")).toHaveTextContent("✕ No");
  });

  it("renders neutral Checking… with no red state before the checks run", async () => {
    const { renderToString } = await import("react-dom/server");
    const html = renderToString(<SystemCheck singleTab />);
    expect(html).toContain("Checking…");
    expect(html).not.toContain("✕");
    expect(html).not.toContain("warn-only");
  });
});
