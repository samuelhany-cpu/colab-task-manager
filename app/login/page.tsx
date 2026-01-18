"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Mail,
  Lock,
  ArrowRight,
  CheckCircle,
  Loader2,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [email, setEmail] = useState("");
  // Removed unused password state
  const [showOtp, setShowOtp] = useState(false);
  const [authMode, setAuthMode] = useState<
    "otp" | "password" | "forgot-password"
  >("otp");

  useEffect(() => {
    if (searchParams.get("registered")) {
      setRegistered(true);
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get("email") as string;
    const passwordValue = formData.get("password") as string;
    setEmail(emailValue);

    try {
      if (authMode === "otp") {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailValue,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setShowOtp(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailValue,
          password: passwordValue,
        });
        if (error) throw error;
        router.push("/app");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const token = formData.get("token") as string;

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) throw error;

      router.push("/app");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid or expired OTP code",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get("email") as string;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });
      if (error) throw error;
      setSuccess("Check your email for the password reset link.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />

      <Card className="w-full max-w-md p-10 border-border/40 bg-card rounded-[2.5rem] shadow-2xl relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <LayoutGrid size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              {showOtp
                ? "Verify Identity"
                : authMode === "forgot-password"
                  ? "Reset Password"
                  : "Welcome Back"}
            </h1>
            <p className="text-mutedForeground font-medium">
              {showOtp
                ? `Enter the code sent to ${email}`
                : authMode === "forgot-password"
                  ? "Enter your email to receive recovery instructions."
                  : "Continue your high-intensity work."}
            </p>
          </div>
        </div>

        {registered && !showOtp && !success && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl text-sm font-bold">
            <CheckCircle size={18} />
            Registration successful! Please sign in.
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl text-sm font-bold">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        <form
          onSubmit={
            showOtp
              ? handleVerifyOtp
              : authMode === "forgot-password"
                ? handleResetPassword
                : handleSignIn
          }
          className="space-y-6"
        >
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-bold animate-in shake duration-300">
              {error}
            </div>
          )}

          {!showOtp && authMode !== "forgot-password" && (
            <div className="flex p-1 bg-muted/50 rounded-xl border border-border/40 mb-2">
              <button
                type="button"
                onClick={() => setAuthMode("otp")}
                className={cn(
                  "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                  authMode === "otp"
                    ? "bg-card text-primary shadow-sm"
                    : "text-mutedForeground hover:text-foreground",
                )}
              >
                Code Link
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("password")}
                className={cn(
                  "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                  authMode === "password"
                    ? "bg-card text-primary shadow-sm"
                    : "text-mutedForeground hover:text-foreground",
                )}
              >
                Password
              </button>
            </div>
          )}

          <div className="space-y-4">
            {!showOtp ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-mutedForeground ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedForeground group-focus-within:text-primary transition-colors"
                      size={18}
                    />
                    <Input
                      key="email-input"
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="john@example.com"
                      defaultValue={email}
                      className="pl-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-all"
                    />
                  </div>
                </div>

                {authMode === "password" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-mutedForeground ml-1">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setAuthMode("forgot-password")}
                        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedForeground group-focus-within:text-primary transition-colors"
                        size={18}
                      />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        className="pl-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-all"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-mutedForeground ml-1">
                  Verification Code
                </label>
                <div className="relative group">
                  <ShieldCheck
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedForeground group-focus-within:text-primary transition-colors"
                    size={18}
                  />
                  <Input
                    key="token-input"
                    id="token"
                    name="token"
                    type="text"
                    required
                    autoFocus
                    placeholder="123456"
                    className="pl-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-all tracking-[0.5em] text-center font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtp(false)}
                  className="text-xs font-bold text-primary hover:underline ml-1"
                >
                  Change email
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-lg font-black shadow-xl shadow-primary/20 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {showOtp
                    ? "Verify Code"
                    : authMode === "forgot-password"
                      ? "Send Reset Link"
                      : authMode === "otp"
                        ? "Send OTP"
                        : "Sign In"}
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </Button>

            {authMode === "forgot-password" && (
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => setAuthMode("password")}
                className="w-full h-12 rounded-xl font-bold text-mutedForeground hover:text-foreground"
              >
                Back to Sign In
              </Button>
            )}
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm font-medium text-mutedForeground">
            New to Colab?{" "}
            <Link
              href="/register"
              className="text-primary font-bold hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </Card>

      <div className="absolute bottom-8 text-center w-full">
        <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground opacity-40">
          &copy; 2026 COLAB TECHNOLOGIES
        </p>
      </div>
    </div>
  );
}
