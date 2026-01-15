"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Mail, Lock, ArrowRight, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered")) {
      setRegistered(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        throw new Error("Invalid email or password");
      }

      router.push("/app");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <div className="auth-header">
          <div className="auth-logo">
            <LogIn size={40} className="primary-color" />
          </div>
          <h1 className="gradient-text">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your dashboard</p>
        </div>

        {registered && (
          <div className="auth-success">
            <CheckCircle size={18} />
            Registration successful! Please sign in.
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="auth-link">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: radial-gradient(
            circle at top left,
            #1e1b4b 0%,
            #0f172a 100%
          );
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 2.5rem;
          border-radius: var(--radius);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-logo {
          margin-bottom: 1rem;
          display: flex;
          justify-content: center;
        }
        .primary-color {
          color: var(--primary);
        }
        h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .auth-subtitle {
          color: var(--muted-foreground);
          font-size: 0.875rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .auth-success {
          margin-bottom: 1.5rem;
          padding: 0.75rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid #22c55e;
          color: #86efac;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .auth-error {
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--destructive);
          color: #fca5a5;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--foreground);
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-with-icon :global(svg) {
          position: absolute;
          left: 1rem;
          color: var(--muted-foreground);
        }
        input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          color: white;
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }
        input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }
        .auth-button {
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: var(--primary);
          color: white;
          border-radius: 0.5rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition:
            opacity 0.2s,
            transform 0.1s;
        }
        .auth-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .auth-button:active:not(:disabled) {
          transform: translateY(0);
        }
        .auth-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.875rem;
          color: var(--muted-foreground);
        }
        .auth-link {
          color: var(--primary);
          font-weight: 600;
        }
        .auth-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
