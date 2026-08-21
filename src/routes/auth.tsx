import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAppData";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  ref: z.string().max(16).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,

  head: () => ({
    meta: [
      {
        title: "Sign in — International Digital",
      },
      {
        name: "description",
        content:
          "Access your International Digital wallet, swaps and investment plans.",
      },
      {
        property: "og:title",
        content: "Sign in — International Digital",
      },
      {
        property: "og:description",
        content:
          "Log in or create your International Digital crypto wallet account.",
      },
    ],
  }),

  component: AuthPage,
});

const credentials = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { session, loading } = useSession();

  const [mode, setMode] = useState<"login" | "signup">(
    search.mode ?? "login",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [referral, setReferral] = useState(search.ref ?? "");

  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  /*
   * Redirect authenticated users to the wallet.
   */
  useEffect(() => {
    if (!loading && session) {
      void navigate({
        to: "/wallet",
        replace: true,
      });
    }
  }, [loading, session, navigate]);

  /*
   * Keep search parameters synchronized.
   */
  useEffect(() => {
    if (search.mode) {
      setMode(search.mode);
    }

    if (search.ref) {
      setReferral(search.ref);
    }
  }, [search.mode, search.ref]);

  /*
   * Email/password authentication.
   */
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const parsed = credentials.safeParse({
      email,
      password,
    });

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ??
          "Invalid details",
      );
      return;
    }

    /*
     * Check password confirmation during signup.
     */
    if (mode === "signup") {
      if (!fullName.trim()) {
        toast.error("Please enter your full name");
        return;
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setBusy(true);

    try {
      /*
       * =========================
       * SIGN UP
       * =========================
       */
      if (mode === "signup") {
        const { data, error } =
          await supabase.auth.signUp({
            email: parsed.data.email,
            password: parsed.data.password,

            options: {
              emailRedirectTo:
                `${window.location.origin}/auth`,

              data: {
                full_name: fullName
                  .trim()
                  .slice(0, 80),

                referral_code: referral
                  .trim()
                  .toUpperCase()
                  .slice(0, 12),
              },
            },
          });

        if (error) {
          throw error;
        }

        /*
         * Email confirmation is required.
         */
        if (!data.session) {
          setEmailSent(true);

          toast.success(
            "Check your email to confirm your account",
          );

          return;
        }

        /*
         * Email confirmation is disabled.
         */
        toast.success(
          "Account created successfully",
        );

        void navigate({
          to: "/wallet",
          replace: true,
        });

        return;
      }

      /*
       * =========================
       * LOGIN
       * =========================
       */
      const { error } =
        await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

      if (error) {
        throw error;
      }

      toast.success("Welcome back");

      void navigate({
        to: "/wallet",
        replace: true,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * Switch between login and signup.
   */
  function toggleMode() {
    const nextMode =
      mode === "signup"
        ? "login"
        : "signup";

    setMode(nextMode);
    setEmailSent(false);

    // Reset password visibility
    setShowPassword(false);
    setShowConfirmPassword(false);

    // Reset confirmation password
    setConfirmPassword("");

    void navigate({
      to: "/auth",
      search: {
        mode: nextMode,
        ...(referral
          ? {
              ref: referral,
            }
          : {}),
      },
      replace: true,
    });
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 glow-bg" />

      <div className="relative mx-auto w-full max-w-md px-5 pb-16 pt-12">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient font-display text-sm font-bold text-primary-foreground">
            ID
          </span>

          <span className="font-display text-base font-semibold">
            International Digital
          </span>
        </Link>

        {/* Heading */}
        <h1 className="mt-9 font-display text-2xl font-bold">
          {mode === "signup"
            ? "Create your account"
            : "Welcome back"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Start holding, swapping and investing in minutes."
            : "Sign in to your wallet and investments."}
        </p>

        {/* Email confirmation */}
        {emailSent && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
            <p className="font-medium text-primary">
              Confirm your email
            </p>

            <p className="mt-1 text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">
                {email}
              </span>
              .
              <br />
              Open the email and confirm your
              account before signing in.
            </p>

            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setMode("login");

                void navigate({
                  to: "/auth",
                  search: {
                    mode: "login",
                  },
                  replace: true,
                });
              }}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Back to sign in
            </button>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          {/* Full name */}
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName">
                Full name
              </Label>

              <Input
                id="fullName"
                value={fullName}
                maxLength={80}
                onChange={(event) =>
                  setFullName(
                    event.target.value,
                  )
                }
                placeholder="Ana Silva"
                autoComplete="name"
              />
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email
            </Label>

            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@email.com"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">
              Password
            </Label>

            <div className="relative">
              <Input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="pr-11"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) => !value,
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">
                Password must contain at least 8
                characters.
              </p>
            )}
          </div>

          {/* Confirm password */}
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">
                Confirm password
              </Label>

              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter your password again"
                  minLength={8}
                  required
                  className="pr-11"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (value) => !value,
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Referral */}
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="referral">
                Referral code (optional)
              </Label>

              <Input
                id="referral"
                value={referral}
                maxLength={12}
                onChange={(event) =>
                  setReferral(
                    event.target.value.toUpperCase(),
                  )
                }
                placeholder="ABC12345"
                autoComplete="off"
              />
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={busy}
            className="w-full brand-gradient font-display text-primary-foreground"
          >
            {busy
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        {/* Login / Signup switch */}
        <button
          type="button"
          onClick={toggleMode}
          disabled={busy}
          className="mt-6 w-full text-center text-sm text-muted-foreground disabled:opacity-50"
        >
          {mode === "signup" ? (
            <>
              Already registered?{" "}
              <span className="font-medium text-primary">
                Sign in
              </span>
            </>
          ) : (
            <>
              New here?{" "}
              <span className="font-medium text-primary">
                Create an account
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
