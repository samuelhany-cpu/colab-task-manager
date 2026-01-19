"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  LayoutGrid,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    emailRef.current = email;

    const BLOCKED_DOMAINS = [
      "example.com",
      "test.com",
      "mailinator.com",
      "yopmail.com",
      "temp-mail.org",
      "tempmail.com",
      "guerrillamail.com",
    ];
    const domain = email.split("@")[1]?.toLowerCase();

    if (BLOCKED_DOMAINS.includes(domain)) {
      setError(
        "This email domain is not allowed for high-deliverability security. Please use a provider like Gmail, Outlook, or your company domain.",
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6 relative overflow-hidden text-foreground">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <Card className="w-full max-w-md p-10 border-border/40 bg-card rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 animate-in zoom-in duration-500">
            <ShieldCheck size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight">Success!</h2>
            <p className="text-mutedForeground font-medium leading-relaxed">
              Your account has been created. We&apos;ve sent a verification link
              to{" "}
              <span className="text-foreground font-bold">
                {emailRef.current}
              </span>
            </p>
          </div>
          <Button
            asChild
            className="w-full h-12 rounded-xl text-lg font-black shadow-xl shadow-primary/20 group"
          >
            <Link href="/login">
              Continue to Login
              <ArrowRight
                size={20}
                className="ml-2 group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6 relative overflow-hidden text-foreground">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />

      <Card className="w-full max-w-4xl p-0 border-border/40 bg-card rounded-[2.5rem] shadow-2xl relative z-10 grid grid-cols-1 md:grid-cols-2 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="p-10 md:p-12 flex flex-col justify-between space-y-12 bg-muted/20 border-r border-border/40">
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <LayoutGrid size={32} />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black tracking-tight leading-tight">
                Build the future,
                <br />
                <span className="text-primary">one task</span> at a time.
              </h1>
              <p className="text-mutedForeground font-medium">
                Join high-intensity teams using Colab to orchestrate their next
                big moves.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {[
              "Bank-grade security protocol",
              "Unlimited workspace access",
              "24/7 Priority orchestration support",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 text-sm font-bold text-mutedForeground"
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck size={14} />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-border/40">
            <p className="text-sm font-medium text-mutedForeground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-bold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="p-10 md:p-12 space-y-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">
              Create Account
            </h2>
            <p className="text-mutedForeground text-sm font-medium">
              Step into your new command center.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-bold animate-in shake duration-300">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-mutedForeground ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedForeground group-focus-within:text-primary transition-colors"
                    size={18}
                  />
                  <Input
                    name="name"
                    required
                    placeholder="John Doe"
                    className="pl-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-all"
                  />
                </div>
              </div>

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
                    name="email"
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="pl-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-mutedForeground ml-1">
                  Password
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedForeground group-focus-within:text-primary transition-colors"
                    size={18}
                  />
                  <Input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="pl-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-all"
                  />
                </div>
              </div>
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
                    Create Account
                    <ArrowRight
                      size={20}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center text-mutedForeground leading-relaxed">
                By registering, you agree to our{" "}
                <Link href="#" className="underline font-bold">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="underline font-bold">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </form>
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
