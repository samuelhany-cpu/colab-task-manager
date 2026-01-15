"use client";

import { useState, use } from "react";
import {
    Code,
    Key,
    Copy,
    RefreshCw,
    ArrowLeft,
    Terminal,
    ExternalLink,
    ShieldAlert,
    Check,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function DeveloperSettingsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = use(params);
    const [apiKey, setApiKey] = useState("ctm_live_72k8s...9j2x");
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateNewKey = () => {
        setGenerating(true);
        setTimeout(() => {
            setApiKey(`ctm_live_${Math.random().toString(36).substring(2, 12)}...${Math.random().toString(36).substring(2, 6)}`);
            setGenerating(false);
        }, 1000);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText("ctm_live_72k8s0192jxn7s22"); // Example full key
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
            <header className="max-w-5xl mx-auto space-y-4">
                <Link
                    href={`/app/${slug}`}
                    className="inline-flex items-center gap-2 text-xs font-black text-mutedForeground hover:text-primary transition-colors group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    BACK TO DASHBOARD
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Developer Settings</h1>
                        <p className="text-mutedForeground text-lg font-medium">
                            Manage API keys and integration settings for <span className="text-foreground font-bold">{slug}</span>.
                        </p>
                    </div>
                    <Button variant="secondary" className="rounded-xl font-bold gap-2">
                        <ExternalLink size={16} />
                        API Documentation
                    </Button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="md:col-span-2 p-8 md:p-10 border-border/40 shadow-sm bg-card rounded-[2rem] space-y-8">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-primary">
                                <Key size={24} />
                                <h2 className="text-2xl font-black tracking-tight">API Authentication</h2>
                            </div>
                            <p className="text-mutedForeground font-medium">
                                Use this key to authenticate requests to the Colab Task Manager API.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-mutedForeground ml-1">Your API Key</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedForeground/40 group-focus-within:text-primary transition-colors" size={18} />
                                        <Input
                                            value={apiKey}
                                            readOnly
                                            className="pl-12 h-14 bg-muted/20 border-border/50 rounded-xl font-mono text-sm tracking-tighter text-foreground/80 focus:bg-background transition-all"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <Button
                                                onClick={copyToClipboard}
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-lg"
                                            >
                                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={generateNewKey}
                                        disabled={generating}
                                        variant="secondary"
                                        className="h-14 px-6 rounded-xl font-bold gap-2 border-border/40"
                                    >
                                        <RefreshCw className={generating ? "animate-spin" : ""} size={18} />
                                        <span>Regenerate</span>
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <ShieldAlert className="text-amber-500 shrink-0" size={18} />
                                <p className="text-xs font-bold text-amber-700 leading-tight">
                                    Keep your API key secret. Do not share it or commit it to version control.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border/40">
                            <h4 className="font-bold text-sm mb-4">Quick Integration</h4>
                            <pre className="p-5 bg-muted/40 rounded-xl font-mono text-xs text-mutedForeground overflow-x-auto border border-border/30">
                                {`curl -X GET "https://api.colab.ai/v1/projects" \\
  -H "Authorization: Bearer \${YOUR_API_KEY}"`}
                            </pre>
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <Card className="p-8 border-border/40 shadow-sm bg-card rounded-2xl space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Code size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">SDKs & Webhooks</h3>
                                <p className="text-sm text-mutedForeground leading-relaxed">
                                    Configure webhooks or download our official SDKs for Node.js, Python, and Go.
                                </p>
                            </div>
                            <Button variant="ghost" className="w-full justify-start gap-2 font-bold px-0 hover:bg-transparent hover:text-primary">
                                Configure Webhooks
                                <ExternalLink size={14} />
                            </Button>
                        </Card>

                        <Card className="p-8 border-primary/20 bg-primary/5 rounded-2xl space-y-4 border-dashed">
                            <Badge className="bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-tighter">Coming Soon</Badge>
                            <h3 className="text-lg font-extrabold italic">Custom Integrations</h3>
                            <p className="text-xs text-mutedForeground font-medium leading-relaxed">
                                Connect with Slack, GitHub, or Jira in just a few clicks.
                            </p>
                            <Button className="w-full rounded-xl font-bold h-10 text-xs">
                                Join Waitlist
                            </Button>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
