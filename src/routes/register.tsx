import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { JgiLogo } from "@/components/layout/Brand";
import { ApiError, apiRequest } from "@/lib/api-client";
import { signIn } from "@/hooks/use-auth";
import { homeFor } from "@/data/platform";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [{ title: "Create Account — JAIN FET Learning Hub" }],
  }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const field =
    "mt-1.5 h-11 w-full rounded-md border border-border bg-card px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 12 || password.length > 128) {
      toast.error("Password must contain 12 to 128 characters.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const user = await signIn(email.trim(), password);
      toast.success("Account created successfully!");
      navigate({ to: homeFor(user.role) });
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="flex items-center gap-3">
          <JgiLogo className="h-12 w-12" />
          <div>
            <p className="font-bold text-primary">JAIN FET Learning Hub</p>
            <p className="text-xs text-muted-foreground">
              Faculty of Engineering and Technology
            </p>
          </div>
        </div>

        <h1 className="mt-8 text-2xl font-bold">Create Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register as a student to start learning.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold">
            Full Name
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={100}
              required
              autoComplete="name"
              placeholder="Your full name"
            />
          </label>

          <label className="block text-sm font-semibold">
            Email
            <input
              className={field}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="Your university email"
            />
          </label>

          <label className="block text-sm font-semibold">
            Password
            <input
              className={field}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              placeholder="At least 12 characters"
            />
          </label>

          <label className="block text-sm font-semibold">
            Confirm Password
            <input
              className={field}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Re-enter your password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Faculty accounts require separate verification.
        </p>
      </div>
    </div>
  );
}
