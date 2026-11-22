const API_BASE_URL = (
  import.meta.env["VITE_API_URL"] || "http://localhost:8000"
).replace(/\/+$/, "");

export const TOKEN_STORAGE_KEY = "jfet-auth-token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: "student" | "faculty" | "admin";
  name: string;
  user_id: string;
}

export interface CurrentUserResponse {
  id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "admin";
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const effectiveToken = token !== undefined ? token : getStoredToken();
  if (effectiveToken) {
    headers.set("Authorization", `Bearer ${effectiveToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data: unknown = await response.json();

      if (data && typeof data === "object" && "detail" in data) {
        const detail = data.detail;
        if (typeof detail === "string") message = detail;
      }
    } catch {
      // Use the default error message.
    }

    if (response.status === 401 && effectiveToken) {
      setStoredToken(null);
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function loginWithPassword(email: string, password: string) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchCurrentUser(token?: string) {
  return apiRequest<CurrentUserResponse>(
    "/api/auth/me",
    { method: "GET" },
    token,
  );
}

export function logoutUser() {
  setStoredToken(null);
}
