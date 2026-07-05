import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-handler";
import { NextResponse } from "next/server";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

/**
 * GET: Initiate GitHub OAuth or handle callback
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const action = searchParams.get("action"); // 'connect'

  try {
    const user = await requireUser();

    // 1. Handle Redirect to GitHub
    if (action === "connect") {
      if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        return NextResponse.json(
          {
            error:
              "GitHub integration is not configured on the server. Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to your .env file.",
          },
          { status: 500 },
        );
      }
      const redirectUri = encodeURIComponent(
        process.env.GITHUB_CALLBACK_URL ||
          `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/github`,
      );
      const githubUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo,user`;
      return NextResponse.redirect(githubUrl);
    }

    // 2. Handle Callback from GitHub
    if (code) {
      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
          }),
        },
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(tokenData.error_description || "GitHub OAuth failed");
      }

      // Fetch user info to get external ID
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      const githubUser = await userResponse.json();

      // Upsert integration
      await prisma.integration.upsert({
        where: { id: "github-" + user.id }, // Simple composite ID or use unique constraint
        create: {
          id: "github-" + user.id,
          userId: user.id,
          type: "GITHUB",
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          externalId: String(githubUser.id),
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        },
      });

      // Redirect back to settings
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const workspaceSlug =
        req.headers.get("referer")?.split("/app/")[1]?.split("/")[0] ||
        "default";
      return NextResponse.redirect(
        `${baseUrl}/app/${workspaceSlug}/settings/integrations?success=true`,
      );
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
