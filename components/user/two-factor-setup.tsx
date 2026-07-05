"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorSetupProps {
  onEnabled: (recoveryCodes: string[]) => void;
}

export function TwoFactorSetup({ onEnabled }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"intro" | "qr" | "verify" | "success">(
    "intro",
  );
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const { toast } = useToast();

  const startSetup = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/2fa");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start setup");

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("qr");
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
  };

  const verifyAndEnable = async () => {
    if (token.length !== 6) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Verification failed");

      setRecoveryCodes(data.recoveryCodes);
      setStep("success");
      onEnabled(data.recoveryCodes);
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
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast({
      title: "Copied",
      description: "Recovery codes copied to clipboard",
    });
  };

  if (step === "intro") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account by requiring a
            verification code from an app when you sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Protects your account from unauthorized access
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              Works with Google Authenticator, Authy, or Microsoft Authenticator
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button onClick={startSetup} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enable 2FA
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === "qr") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Open your authenticator app and scan the code below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {qrCode && (
            <div className="p-4 bg-white rounded-lg border">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium mb-1">Enter code manually:</p>
            <code className="px-2 py-1 bg-muted rounded text-xs font-mono break-all">
              {secret}
            </code>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep("intro")}
            className="flex-1"
          >
            Back
          </Button>
          <Button onClick={() => setStep("verify")} className="flex-1">
            Next
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === "verify") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify Token</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to complete
            setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="000000"
              value={token}
              onChange={(e) =>
                setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="text-center text-2xl tracking-[0.5em] font-mono h-14"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep("qr")}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={verifyAndEnable}
            disabled={token.length !== 6 || isLoading}
            className="flex-1"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verify & Finish
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === "success") {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-500/20 rounded-full">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>2FA Enabled Successfully!</CardTitle>
          </div>
          <CardDescription className="text-green-700/80">
            Your account is now protected with two-factor authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-amber-700">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Save your recovery codes!
              </span>
            </div>
            <p className="text-xs text-amber-600 mb-4">
              If you lose access to your authenticator app, these codes are the
              ONLY way to get back into your account.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {recoveryCodes.map((code) => (
                <code
                  key={code}
                  className="p-2 bg-white/50 border rounded text-[10px] font-mono text-center"
                >
                  {code}
                </code>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyRecoveryCodes}
              className="w-full bg-white/50 text-amber-700 border-amber-500/30"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Copy All Codes
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.reload()} className="w-full">
            Done
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
