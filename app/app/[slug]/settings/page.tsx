"use client";

import { use } from "react";
import {
  Shield,
  Link as LinkIcon,
  Users,
  Bell,
  Code2,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

export default function SettingsOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const settingSections = [
    {
      title: "Security",
      description: "2FA, passwords, and audit logs.",
      icon: Shield,
      href: `/app/${slug}/settings/security`,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Integrations",
      description: "Connect GitHub, Jira, and other tools.",
      icon: LinkIcon,
      href: `/app/${slug}/settings/integrations`,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Members",
      description: "Manage workspace team members.",
      icon: Users,
      href: `/app/${slug}/settings/members`,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Notifications",
      description: "Configure how you receive alerts.",
      icon: Bell,
      href: `/app/${slug}/settings/notifications`,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Developer",
      description: "API keys and webhook settings.",
      icon: Code2,
      href: `/app/${slug}/settings/developer`,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
  ];

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal and workspace preferences.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {settingSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="no-underline group"
          >
            <Card className="hover:border-primary transition-all duration-300 hover:shadow-md cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div
                  className={`p-3 rounded-xl ${section.bg} ${section.color} group-hover:scale-110 transition-transform`}
                >
                  <section.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {section.title}
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
