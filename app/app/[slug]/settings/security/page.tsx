"use client";

import { use, useCallback, useEffect, useState } from "react";
import { ShieldCheck, History, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TwoFactorSetup } from "@/components/user/two-factor-setup";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  twoFactorEnabled: boolean;
}

export default function SecuritySettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch profile");
      setProfile(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href={`/app/${slug}/settings`}>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              Security Settings
            </h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Manage your account security and authentication methods.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* 2FA Status */}
        <div className="p-6 bg-card rounded-xl border flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full ${profile?.twoFactorEnabled ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"}`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold px-0">
                Two-Factor Authentication (2FA)
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add an extra layer of security to your account using an
                authenticator app.
              </p>
              <div className="mt-2 text-sm font-medium">
                Status:{" "}
                {profile?.twoFactorEnabled ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-muted-foreground">Disabled</span>
                )}
              </div>
            </div>
          </div>
          {!profile?.twoFactorEnabled && !showSetup && (
            <Button onClick={() => setShowSetup(true)}>Set Up 2FA</Button>
          )}
        </div>

        {showSetup ? (
          <TwoFactorSetup
            onEnabled={() => {
              fetchProfile();
              setShowSetup(false);
            }}
          />
        ) : profile?.twoFactorEnabled ? (
          <div className="p-4 bg-muted/50 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground">
            2FA is active. To disable it, please contact support or use a
            recovery code if implemented.
          </div>
        ) : null}

        {/* Security Audit Logs */}
        <div className="p-6 bg-card rounded-xl border space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-muted rounded-full">
              <History className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold px-0">Security Audit Logs</h3>
              <p className="text-sm text-muted-foreground">
                Track recent security activities on your account.
              </p>
            </div>
          </div>
          <AuditLogViewer />
        </div>
      </div>
    </div>
  );
}
