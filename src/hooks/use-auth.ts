import { createStore } from "@/lib/create-store";
import { platform, usePlatform, type AppUser, type Role } from "@/data/platform";
import {
  loginWithPassword,
  fetchCurrentUser,
  getStoredToken,
  setStoredToken,
  type CurrentUserResponse,
  type LoginResponse,
} from "@/lib/api-client";

export interface AuthStoreState {
  userId: string | null;
  token: string | null;
  user: AppUser | null;
}

export function mapBackendRole(backendRole: string, existingUser?: AppUser | null): Role {
  if (backendRole === "faculty") return "reviewer";
  if (backendRole === "admin") return "admin";
  if (existingUser?.role === "creator") return "creator";
  return "learner";
}

function syncUserToPlatform(
  backendUser: { id: string; name: string; email: string; role: string },
): AppUser {
  const currentUsers = platform.get().users;
  const existing = currentUsers.find((u) => u.id === backendUser.id || u.email.toLowerCase() === backendUser.email.toLowerCase());

  const mappedRole = mapBackendRole(backendUser.role, existing);
  const appUser: AppUser = {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    role: mappedRole,
    creatorType: existing?.creatorType ?? (mappedRole === "creator" ? "Student Creator" : undefined),
    department: existing?.department ?? (mappedRole === "reviewer" ? "FET Faculty" : undefined),
    timeMultiplier: existing?.timeMultiplier,
  };

  platform.update((s) => {
    const withoutUser = s.users.filter((u) => u.id !== appUser.id);
    return { ...s, users: [...withoutUser, appUser] };
  });

  return appUser;
}

const auth = createStore<AuthStoreState>("jfet-auth-v1", () => ({
  userId: null,
  token: getStoredToken(),
  user: null,
}));

export const signInDemo = (userId: string) => {
  const user = platform.get().users.find((u) => u.id === userId) ?? null;
  auth.set({ userId, token: null, user });
};

export const signInByEmail = (email: string): AppUser | null => {
  const u = platform.get().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (u) auth.set({ userId: u.id, token: null, user: u });
  return u ?? null;
};

export async function signIn(email: string, password: string): Promise<AppUser> {
  const res: LoginResponse = await loginWithPassword(email, password);
  setStoredToken(res.access_token);

  const appUser = syncUserToPlatform({
    id: res.user_id,
    name: res.name,
    email,
    role: res.role,
  });

  auth.set({
    userId: appUser.id,
    token: res.access_token,
    user: appUser,
  });

  return appUser;
}

export async function initializeAuth(): Promise<AppUser | null> {
  const token = getStoredToken();
  if (!token) {
    if (auth.get().token) {
      auth.set({ userId: null, token: null, user: null });
    }
    return null;
  }

  try {
    const userRes: CurrentUserResponse = await fetchCurrentUser(token);
    const appUser = syncUserToPlatform(userRes);

    auth.set({
      userId: appUser.id,
      token,
      user: appUser,
    });

    return appUser;
  } catch {
    setStoredToken(null);
    auth.set({ userId: null, token: null, user: null });
    return null;
  }
}

export const signOut = () => {
  setStoredToken(null);
  auth.set({ userId: null, token: null, user: null });
};

export function useAuth() {
  const state = auth.use();
  const users = usePlatform().users;
  const user = state.user ?? (state.userId ? users.find((u) => u.id === state.userId) ?? null : null);

  return {
    user,
    role: user?.role ?? null,
    token: state.token,
    isSignedIn: !!user,
  };
}
