import { createStore } from "@/lib/create-store";
import { platform, usePlatform, type AppUser } from "@/data/platform";

/**
 * DEMO AUTH — no passwords, no sessions. Replace `signInDemo` / `signOut` with real
 * auth calls (SSO / API) and keep `useAuth()` as the single read point for the UI.
 */
const auth = createStore<{ userId: string | null }>("jfet-auth-v1", () => ({ userId: null }));

export const signInDemo = (userId: string) => auth.set({ userId });
export const signInByEmail = (email: string): AppUser | null => {
  const u = platform.get().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (u) auth.set({ userId: u.id });
  return u ?? null;
};
export const signOut = () => auth.set({ userId: null });

export function useAuth() {
  const { userId } = auth.use();
  const users = usePlatform().users;
  const user = users.find((u) => u.id === userId) ?? null;
  return { user, role: user?.role ?? null, isSignedIn: !!user };
}
