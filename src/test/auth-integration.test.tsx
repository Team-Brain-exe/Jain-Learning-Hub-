import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import {
  signIn,
  signOut,
  initializeAuth,
  mapBackendRole,
  useAuth,
  signInDemo,
} from "@/hooks/use-auth";
import {
  apiRequest,
  loginWithPassword,
  fetchCurrentUser,
  getStoredToken,
  setStoredToken,
  TOKEN_STORAGE_KEY,
  ApiError,
} from "@/lib/api-client";
import { platform, homeFor } from "@/data/platform";
import { RequireRole } from "@/components/studio/ui";

function renderWithRouter(ui: React.ReactElement) {
  const root = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => ui,
  });
  const loginRoute = createRoute({
    getParentRoute: () => root,
    path: "/login",
    component: () => <div>Login Page</div>,
  });
  const router = createRouter({
    routeTree: root.addChildren([indexRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("Phase 1: Auth & API client integration", () => {
  beforeEach(() => {
    localStorage.clear();
    platform.reset();
    signOut();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    signOut();
    vi.restoreAllMocks();
  });

  describe("Token storage & API client", () => {
    it("stores and retrieves JWT token from localStorage", () => {
      expect(getStoredToken()).toBeNull();
      setStoredToken("test-jwt-token-123");
      expect(getStoredToken()).toBe("test-jwt-token-123");
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("test-jwt-token-123");

      setStoredToken(null);
      expect(getStoredToken()).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });

    it("attaches stored bearer token to requests automatically", async () => {
      setStoredToken("bearer-token-abc");

      let capturedHeaders: Headers | undefined;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      await apiRequest<{ status: string }>("/api/test");
      expect(capturedHeaders?.get("Authorization")).toBe("Bearer bearer-token-abc");
    });

    it("clears stored token when receiving a 401 response with active token", async () => {
      setStoredToken("expired-token");

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ detail: "Token expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      });

      await expect(apiRequest("/api/protected")).rejects.toThrow("Token expired");
      expect(getStoredToken()).toBeNull();
    });

    it("extracts detail message from error responses", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ detail: "Invalid email or password" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      });

      try {
        await loginWithPassword("wrong@example.com", "wrongpw");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(401);
        expect((err as ApiError).message).toBe("Invalid email or password");
      }
    });
  });

  describe("Role mapping", () => {
    it("maps backend roles correctly to frontend roles", () => {
      expect(mapBackendRole("student")).toBe("learner");
      expect(mapBackendRole("faculty")).toBe("reviewer");
      expect(mapBackendRole("admin")).toBe("admin");

      // Preserves creator status if user was already a creator
      const creatorUser = {
        id: "student_creator",
        name: "Creator",
        email: "c@jain.edu",
        role: "creator" as const,
      };
      expect(mapBackendRole("student", creatorUser)).toBe("creator");
    });

    it("maps routes correctly for each mapped role", () => {
      expect(homeFor(mapBackendRole("student"))).toBe("/my-learning");
      expect(homeFor(mapBackendRole("faculty"))).toBe("/faculty");
      expect(homeFor(mapBackendRole("admin"))).toBe("/admin");
    });
  });

  describe("Authentication flow with signIn", () => {
    it("successfully signs in student, stores token, and updates user state", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/auth/login")) {
          return new Response(
            JSON.stringify({
              access_token: "jwt-student-token",
              token_type: "bearer",
              role: "student",
              name: "Aarav Sharma",
              user_id: "student_101",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const user = await signIn("student101@example.com", "TestPassword123!");

      expect(user.id).toBe("student_101");
      expect(user.role).toBe("learner");
      expect(user.name).toBe("Aarav Sharma");
      expect(getStoredToken()).toBe("jwt-student-token");

      // Check platform users list contains the signed-in user
      const foundInPlatform = platform.get().users.find((u) => u.id === "student_101");
      expect(foundInPlatform).toBeDefined();
      expect(foundInPlatform?.role).toBe("learner");
    });

    it("successfully signs in faculty and maps to reviewer", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/auth/login")) {
          return new Response(
            JSON.stringify({
              access_token: "jwt-faculty-token",
              token_type: "bearer",
              role: "faculty",
              name: "Dr. Ramesh Rao",
              user_id: "fac_cs_01",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const user = await signIn("ramesh.rao@jainuniversity.ac.in", "TestPassword123!");

      expect(user.id).toBe("fac_cs_01");
      expect(user.role).toBe("reviewer");
      expect(user.name).toBe("Dr. Ramesh Rao");
      expect(homeFor(user.role)).toBe("/faculty");
    });

    it("handles 403 unverified faculty accounts properly", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(
          JSON.stringify({ detail: "Faculty account is not verified" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      });

      await expect(
        signIn("unverified@jain.ac.in", "TestPassword123!"),
      ).rejects.toThrow("Faculty account is not verified");

      expect(getStoredToken()).toBeNull();
    });

    it("handles 401 invalid credentials without falling back to demo accounts", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(
          JSON.stringify({ detail: "Invalid email or password" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      });

      await expect(
        signIn("learner@demo.jain.edu", "WrongPassword!"),
      ).rejects.toThrow("Invalid email or password");

      expect(getStoredToken()).toBeNull();
    });
  });

  describe("Session restoration and logout", () => {
    it("restores active session via initializeAuth using GET /api/auth/me", async () => {
      setStoredToken("valid-active-token");

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/auth/me")) {
          return new Response(
            JSON.stringify({
              id: "student_101",
              name: "Aarav Sharma",
              email: "student101@example.com",
              role: "student",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const user = await initializeAuth();
      expect(user).not.toBeNull();
      expect(user?.id).toBe("student_101");
      expect(user?.role).toBe("learner");
      expect(getStoredToken()).toBe("valid-active-token");
    });

    it("clears token and signs out on expired token during initializeAuth", async () => {
      setStoredToken("expired-token");

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(
          JSON.stringify({ detail: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      });

      const user = await initializeAuth();
      expect(user).toBeNull();
      expect(getStoredToken()).toBeNull();
    });

    it("signOut clears token and auth state completely", async () => {
      setStoredToken("active-token");
      signInDemo("u-learner");

      signOut();

      expect(getStoredToken()).toBeNull();
    });
  });

  describe("Role-based route access (RequireRole component)", () => {
    function DummyProtectedComponent() {
      return <div>Protected Content Visible</div>;
    }

    it("blocks unauthenticated users with 'Sign in required'", async () => {
      await act(async () => {
        renderWithRouter(
          <RequireRole roles={["admin"]}>
            <DummyProtectedComponent />
          </RequireRole>,
        );
      });

      expect(screen.getByText("Sign in required")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content Visible")).not.toBeInTheDocument();
    });

    it("blocks unauthorized roles with role mismatch message", async () => {
      signInDemo("u-learner"); // Role: learner

      await act(async () => {
        renderWithRouter(
          <RequireRole roles={["admin"]}>
            <DummyProtectedComponent />
          </RequireRole>,
        );
      });

      expect(screen.getByText("You don't have access to this page")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content Visible")).not.toBeInTheDocument();
    });

    it("allows authorized users to view protected content", async () => {
      signInDemo("u-admin"); // Role: admin

      await act(async () => {
        renderWithRouter(
          <RequireRole roles={["admin"]}>
            <DummyProtectedComponent />
          </RequireRole>,
        );
      });

      expect(screen.getByText("Protected Content Visible")).toBeInTheDocument();
      expect(screen.queryByText("Sign in required")).not.toBeInTheDocument();
    });
  });
});
