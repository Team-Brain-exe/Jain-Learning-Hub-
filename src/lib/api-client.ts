const API_BASE_URL = (
  import.meta.env["VITE_API_URL"] || "http://localhost:8000"
).replace(/\/+$/, "");

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

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
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

export function fetchCurrentUser(token: string) {
  return apiRequest<CurrentUserResponse>(
    "/api/auth/me",
    { method: "GET" },
    token,
  );
}
