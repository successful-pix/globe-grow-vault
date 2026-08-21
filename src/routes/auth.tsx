import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [fullName, setFullName] = useState("");
  const [referral, setReferral] = useState(search.ref ?? "");

  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  /*
   * If already authenticated, go to wallet.
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
   * Keep the selected mode synchronized with the URL.
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

    setBusy(true);

    try {
      /*
       * SIGN UP
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
         * If email confirmation is enabled,
         * Supabase won't return an active session.
         */
        if (!data.session) {
          setEmailSent(true);

          toast.success(
            "Check your email to confirm your account",
          );

          return;
        }

        /*
         * If email confirmation is disabled,
         * the user can be sent directly to wallet.
         */
        toast.success("Account created successfully");

        void navigate({
          to: "/wallet",
          replace: true,
        });

        return;
      }

      /*
       * LOGIN
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
   * GOOGLE OAUTH
   *
   * Uses Supabase directly.
   *
   * The browser will automatically redirect
   * to Google. After authentication Google
   * returns to Supabase, and Supabase sends
   * the user back to /auth.
   */
  async function handleGoogle() {
    setBusy(true);

    try {
      const redirectTo =
        `${window.location.origin}/auth`;

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",

          options: {
            redirectTo,

            queryParams: {
              access_type: "offline",
              prompt: "select_account",
            },
          },
        });

      if (error) {
        throw error;
      }

      /*
       * Supabase handles the redirect.
       * Do not navigate manually here.
       */
    } catch (error) {
      setBusy(false);

      toast.error(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please try again.",
      );
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

    void navigate({
      to: "/auth",
      search: {
        mode: nextMode,
        ...(referral
          ? { ref: referral }
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
              . Open it to activate your wallet,
              then sign in.
            </p>

            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
              }}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Back to sign in
            </button>
          </div>
        )}

        {/* Authentication form */}
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

            <Input
              id="password"
              type="password"
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
              required
              minLength={8}
            />
          </div>

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

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />

          <span>or</span>

          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={handleGoogle}
          className="w-full"
        >
          <svg
            className="mr-2 h-4 w-4"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.24Z"
            />

            <path
              fill="#34A853"
              d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.5Z"
            />

            <path
              fill="#FBBC05"
              d="M6.54 13.59a5.86 5.86 0 0 1 0-3.18V7.89H3.3a9.74 9.74 0 0 0 0 8.22l3.24-2.52Z"
            />

            <path
              fill="#EA4335"
              d="M12 6.38c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.5 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.7 5.39l3.24 2.52C7.31 8.1 9.46 6.38 12 6.38Z"
            />
          </svg>

    

        {/* Switch mode */}
        <button
          type="button"
          onClick={toggleMode}
          disabled={busy}
          className="mt-6 w-full text-center text-sm text-muted-foreground disabled:opacity-50"
        >
          {mode === "signup" ? (
            <>
              Already registered?{" "}
              <span className="text-primary">
                Sign in
              </span>
            </>
          ) : (
            <>
              New here?{" "}
              <span className="text-primary">
                Create an account
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
