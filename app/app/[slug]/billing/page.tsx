"use client";

import { use } from "react";
import {
    Zap,
    Check,
    ArrowLeft,
    CreditCard,
    ShieldCheck,
    HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLANS = [
    {
        name: "Free",
        price: "$0",
        description: "Perfect for hobbyists and side projects.",
        features: ["Up to 5 team members", "3 active projects", "Basic task management", "Community support"],
        cta: "Current Plan",
        current: true,
    },
    {
        name: "Pro",
        price: "$19",
        period: "/mo",
        description: "Advanced features for growing teams.",
        features: [
            "Unlimited team members",
            "Unlimited projects",
            "Priority API access",
            "Advanced reporting",
            "Priority email support",
            "Custom task types",
        ],
        cta: "Upgrade to Pro",
        popular: true,
    },
    {
        name: "Enterprise",
        price: "Custom",
        description: "Scalable solutions for large organizations.",
        features: [
            "SAML SSO",
            "Dedicated Account Manager",
            "Custom data retention",
            "Audit logs",
            "24/7 Phone support",
            "White-label options",
        ],
        cta: "Contact Sales",
    },
];

export default function BillingPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = use(params);

    return (
        <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
            <header className="max-w-6xl mx-auto space-y-4">
                <Link
                    href={`/app/${slug}`}
                    className="inline-flex items-center gap-2 text-xs font-black text-mutedForeground hover:text-primary transition-colors group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    BACK TO DASHBOARD
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/60">Choose Your Plan</h1>
                        <p className="text-mutedForeground text-lg font-medium">
                            Scale your workspace as your team grows.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none px-4 py-1.5 font-bold flex gap-2 items-center">
                            <CreditCard size={14} />
                            Billing Cycle: Monthly
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PLANS.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`relative p-10 flex flex-col rounded-[2.5rem] border-border/40 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${plan.popular ? 'border-primary ring-4 ring-primary/5 shadow-xl shadow-primary/5' : ''
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-10 -translate-y-1/2">
                                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest px-4 py-1 shadow-lg shadow-primary/30">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <div className="space-y-4 mb-8">
                                <h3 className="text-xl font-black tracking-tight">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                                    {plan.period && <span className="text-mutedForeground font-bold text-lg">{plan.period}</span>}
                                </div>
                                <p className="text-sm text-mutedForeground font-medium leading-relaxed min-h-[40px]">
                                    {plan.description}
                                </p>
                            </div>

                            <div className="space-y-4 mb-10 flex-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-mutedForeground">What&apos;s Included</p>
                                <ul className="space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-sm font-medium text-foreground/80">
                                            <div className="mt-1 w-5 h-5 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                                                <Check size={12} className="text-primary" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button
                                variant={plan.current ? "secondary" : plan.popular ? "primary" : "ghost"}
                                disabled={plan.current}
                                className={`w-full h-14 rounded-2xl font-black text-sm tracking-wide transition-all ${plan.popular ? 'shadow-lg shadow-primary/20 hover:scale-[1.02]' : plan.current ? 'opacity-70' : 'border border-border/60 hover:bg-muted'
                                    }`}
                            >
                                {plan.current && <Check size={18} className="mr-2" />}
                                {plan.cta}
                            </Button>
                        </Card>
                    ))}
                </div>

                {/* FAQ/Trust Footer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 border-t border-border/40">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                            <ShieldCheck size={24} />
                            <h4 className="font-bold">Secure Payments</h4>
                        </div>
                        <p className="text-xs text-mutedForeground leading-relaxed">
                            All transactions are protected by 256-bit SSL encryption and processed securely via Stripe.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                            <Zap size={24} />
                            <h4 className="font-bold">Instant Activation</h4>
                        </div>
                        <p className="text-xs text-mutedForeground leading-relaxed">
                            Upgraded features are available immediately across all your devices once payment is confirmed.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                            <HelpCircle size={24} />
                            <h4 className="font-bold">Help & Support</h4>
                        </div>
                        <p className="text-xs text-mutedForeground leading-relaxed">
                            Have questions? Our support team is available 24/7 to help you choose the right plan.
                            <Link href="#" className="text-primary font-bold ml-1 hover:underline">Chat with us</Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
