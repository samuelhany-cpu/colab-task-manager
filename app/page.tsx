"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  Globe,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/10 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
              <Layers size={18} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-foreground">
              Colab<span className="text-primary">.</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-mutedForeground">
            <a
              href="#features"
              className="hover:text-primary transition-colors"
            >
              Features
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#about" className="hover:text-primary transition-colors">
              Enterprise
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-bold text-mutedForeground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Button
              asChild
              className="rounded-full px-6 shadow-xl shadow-primary/20"
            >
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-48 pb-32 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none">
            <div className="absolute top-0 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
            <div className="absolute top-48 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />
          </div>

          <div className="max-w-5xl mx-auto flex flex-col items-center text-center space-y-10 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
              <Sparkles size={14} />
              <span>New: AI-Powered Orchestration layer</span>
            </div>

            <h1 className="text-5xl md:text-8xl font-black leading-[1.1] tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
              The{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                fastest
              </span>{" "}
              way to execute together.
            </h1>

            <p className="text-lg md:text-xl text-mutedForeground max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
              Break down silos and accelerate your delivery. Colab brings
              high-intensity project management, real-time sync, and team
              intelligence into one unified experience.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-10 border-t border-border/40 pt-10">
              <Button
                asChild
                size="lg"
                className="h-14 px-10 rounded-2xl gap-3 shadow-2xl shadow-primary/30 text-lg font-black group"
              >
                <Link href="/app">
                  Go to Workspace{" "}
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="h-14 px-10 rounded-2xl text-lg font-bold bg-white border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                Book a Demo
              </Button>
            </div>
          </div>
        </section>
        {/* Product Preview */}
        <section className="px-6 pb-32">
          <div className="max-w-6xl mx-auto relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-[3rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative rounded-[2.5rem] border border-border/50 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-1000">
              <div className="px-6 py-4 bg-muted/40 border-b border-border/50 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="bg-background/80 border border-border/40 px-6 py-1 rounded-full text-[10px] font-black text-mutedForeground tracking-widest uppercase">
                  colab.io/workspace/apollo-mission
                </div>
                <div className="flex gap-1">
                  <div className="w-4 h-1 rounded-full bg-muted" />
                  <div className="w-1 h-1 rounded-full bg-muted" />
                </div>
              </div>
              <div className="flex aspect-video bg-muted/20">
                <div className="w-64 border-r border-border/40 p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="h-2 w-24 bg-primary/20 rounded-full" />
                    <div className="h-2 w-16 bg-muted rounded-full" />
                  </div>
                  <div className="space-y-4 pt-10">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded bg-muted" />
                        <div className="h-2 w-32 bg-muted/60 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-10 grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-6">
                    <div className="h-4 w-64 bg-foreground/10 rounded-full" />
                    <div className="h-32 bg-primary/5 rounded-3xl border border-primary/10" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-muted/40 rounded-2xl" />
                      <div className="h-24 bg-muted/40 rounded-2xl" />
                    </div>
                  </div>
                  <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4">
                    <div className="h-2 w-20 bg-muted rounded-full" />
                    <div className="space-y-2 pt-4">
                      <div className="h-1.5 w-full bg-muted/60 rounded-full" />
                      <div className="h-1.5 w-4/5 bg-muted/60 rounded-full" />
                      <div className="h-1.5 w-3/4 bg-muted/60 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="py-32 bg-muted/30 border-y border-border/40"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-20 space-y-4">
              <Badge
                variant="secondary"
                className="bg-primary text-white border-none rounded-full px-4 h-8 font-black text-[10px] uppercase tracking-widest"
              >
                Toolkit
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                Everything you need
                <br />
                to ship at scale.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                {
                  icon: <Zap size={24} />,
                  title: "Instant Sync",
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                  desc: "Built on high-concurrency protocols for zero-lag collaboration.",
                },
                {
                  icon: <Globe size={24} />,
                  title: "Neural Search",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                  desc: "Find any message, file or task across your entire workspace in ms.",
                },
                {
                  icon: <CheckCircle2 size={24} />,
                  title: "Smart Flow",
                  color: "text-green-500",
                  bg: "bg-green-500/10",
                  desc: "Automated task routing and priority balancing for peak efficiency.",
                },
                {
                  icon: <Shield size={24} />,
                  title: "End-to-End",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10",
                  desc: "Military-grade encryption for all your core intellectual property.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="p-10 rounded-[2.5rem] bg-card border border-border/50 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-start gap-8"
                >
                  <div
                    className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center shadow-inner`}
                  >
                    {feature.icon}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-mutedForeground text-sm font-medium leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-20 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10 opacity-40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-foreground" />
              <span className="text-lg font-black tracking-tighter">
                Colab.
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest">
              &copy; 2026 COLAB TECHNOLOGIES. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
              <a href="#" className="hover:text-primary">
                Twitter
              </a>
              <a href="#" className="hover:text-primary">
                GitHub
              </a>
              <a href="#" className="hover:text-primary">
                Policy
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
