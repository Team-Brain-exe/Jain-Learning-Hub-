import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PermissionListSkeleton } from "@/components/consent/PermissionListSkeleton";
import { PermissionsEmpty } from "@/components/consent/PermissionsEmpty";
import { useMounted } from "@/hooks/use-mounted";

describe("PermissionListSkeleton", () => {
  it("renders 3 busy placeholder rows with a screen-reader message", () => {
    const { container } = render(<PermissionListSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByText("Loading your requests…")).toHaveClass("sr-only");
  });
});

describe("PermissionsEmpty", () => {
  it("shows the copy and calls onRequest", () => {
    const onRequest = vi.fn();
    render(<PermissionsEmpty onRequest={onRequest} />);
    expect(screen.getByText("No upload requests yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request upload permission" }));
    expect(onRequest).toHaveBeenCalledOnce();
  });
});

describe("useMounted", () => {
  it("is true after mount", () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });
});
