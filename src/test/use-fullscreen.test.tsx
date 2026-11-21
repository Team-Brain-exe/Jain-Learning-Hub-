import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FullscreenGuard } from "@/components/proctor/FullscreenGuard";
import { useFullscreen } from "@/hooks/use-fullscreen";

const root = document.documentElement as unknown as Record<string, unknown>;

function setFullscreenElement(el: Element | null) {
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: el });
  document.dispatchEvent(new Event("fullscreenchange"));
}

describe("useFullscreen", () => {
  beforeEach(() => {
    root["requestFullscreen"] = vi.fn().mockResolvedValue(undefined);
    (document as unknown as Record<string, unknown>)["exitFullscreen"] = vi
      .fn()
      .mockResolvedValue(undefined);
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  });
  afterEach(() => {
    delete root["requestFullscreen"];
  });

  it("tracks fullscreenchange in both directions", () => {
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.supported).toBe(true);
    expect(result.current.isFullscreen).toBe(false);
    act(() => setFullscreenElement(document.documentElement));
    expect(result.current.isFullscreen).toBe(true);
    act(() => setFullscreenElement(null));
    expect(result.current.isFullscreen).toBe(false);
  });

  it("enter requests fullscreen and resolves true; false on rejection", async () => {
    const { result } = renderHook(() => useFullscreen());
    await expect(result.current.enter()).resolves.toBe(true);
    expect(root["requestFullscreen"]).toHaveBeenCalled();
    root["requestFullscreen"] = vi.fn().mockRejectedValue(new Error("denied"));
    await expect(result.current.enter()).resolves.toBe(false);
  });

  it("exit calls document.exitFullscreen", async () => {
    const { result } = renderHook(() => useFullscreen());
    await act(() => result.current.exit());
    expect(document.exitFullscreen).toHaveBeenCalled();
  });

  it("is unsupported without requestFullscreen", async () => {
    delete root["requestFullscreen"];
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.supported).toBe(false);
    await expect(result.current.enter()).resolves.toBe(false);
  });
});

describe("FullscreenGuard", () => {
  it("renders dialog, focuses button, click calls onEnter", () => {
    const onEnter = vi.fn();
    render(<FullscreenGuard open secondsLeft={125} onEnter={onEnter} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Return to fullscreen to continue")).toBeTruthy();
    expect(screen.getByText(/02:05/)).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Enter fullscreen" });
    expect(document.activeElement).toBe(btn);
    fireEvent.click(btn);
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <FullscreenGuard open={false} secondsLeft={5} onEnter={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
