import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"auth" | "otp">("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      /*
       * Supabase returns a user but, when email confirmation
       * is enabled, the user is not verified yet.
       *
       * Do NOT navigate to the dashboard here.
       */
      if (data.user && !data.session) {
        setStep("otp");
        setMessage(
          `We sent a verification code to ${email.trim()}.`,
        );
        return;
      }

      /*
       * If your Supabase project has email confirmation disabled,
       * Supabase may create a session immediately.
       *
       * In that case you can go directly to the dashboard.
       */
      if (data.session) {
        await navigate({
          to: "/",
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "signup",
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error(
          "Verification succeeded, but no session was created. Please try signing in.",
        );
      }

      setMessage("Email verified successfully.");

      await navigate({
        to: "/",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid or expired verification code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        throw error;
      }

      /*
       * If email confirmation is required, an unverified user
       * normally cannot obtain a valid session.
       */
      if (!data.session) {
        throw new Error(
          "Please verify your email before signing in.",
        );
      }

      await navigate({
        to: "/",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) {
        throw error;
      }

      setMessage("A new verification code has been sent.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend the code.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">
              Verify your email
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Enter the verification code sent to:
            </p>

            <p className="mt-1 font-medium">
              {email}
            </p>

            <form
              onSubmit={handleVerifyOtp}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="otp"
                  className="mb-2 block text-sm font-medium"
                >
                  Verification code
                </label>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    )
                  }
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-lg border px-4 py-3 text-center text-xl tracking-[0.4em] outline-none"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {loading
                  ? "Verifying..."
                  : "Verify email"}
              </button>

              <button
                type="button"
                onClick={resendOtp}
                disabled={loading}
                className="w-full py-2 text-sm font-medium"
              >
                Resend code
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("auth");
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
                className="w-full py-2 text-sm text-gray-500"
              >
                Back
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            {mode === "login"
              ? "Sign in to continue."
              : "Create an account with your email."}
          </p>

          <form
            onSubmit={
              mode === "login"
                ? handleLogin
                : handleSignup
            }
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                className="w-full rounded-lg border px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                className="w-full rounded-lg border px-4 py-3 outline-none"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(
                mode === "login"
                  ? "signup"
                  : "login",
              );
              setError("");
              setMessage("");
            }}
            className="mt-6 w-full text-sm"
          >
            {mode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
