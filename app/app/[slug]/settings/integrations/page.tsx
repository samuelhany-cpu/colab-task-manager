"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationSettings } from "@/components/settings/integration-settings";
import NextLink from "next/link";

export default function IntegrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <NextLink href={`/app/${slug}/settings`}>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </NextLink>
            <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Connect Colab with your favorite external tools to streamline your
            workflow.
          </p>
        </div>
      </div>

      <IntegrationSettings />
    </div>
  );
}
