"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Lock,
  ArrowRight,
  CheckCircle,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
      } else {
        setVerifying(false);
      }
    };
    checkSession();
  }, [supabase, router]);

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess("Password updated successfully! Redirecting...");
      setTimeout(() => {
        router.replace("/app");
      }, 2000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update password",
      );
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

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
              Set New Password
            </h1>
            <p className="text-mutedForeground font-medium">
              Secure your account with a strong password.
            </p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl text-sm font-bold">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-bold animate-in shake duration-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-mutedForeground ml-1">
                New Password
              </label>
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

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-mutedForeground ml-1">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedForeground group-focus-within:text-primary transition-colors"
                  size={18}
                />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="pl-12 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-all"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !!success}
            className="w-full h-12 rounded-xl text-lg font-black shadow-xl shadow-primary/20 group"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Update Password
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </Button>
        </form>
      </Card>

      <div className="absolute bottom-8 text-center w-full">
        <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground opacity-40">
          &copy; 2026 COLAB TECHNOLOGIES
        </p>
      </div>
    </div>
  );
}
