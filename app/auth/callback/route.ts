import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/app";
  const { origin } = requestUrl;

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && supabaseUser) {
      // Sync with Prisma
      try {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { supabaseId: supabaseUser.id },
              { email: supabaseUser.email },
            ],
          },
        });

        if (!user) {
          // Create new user if they don't exist
          await prisma.user.create({
            data: {
              supabaseId: supabaseUser.id,
              email: supabaseUser.email,
              name:
                supabaseUser.user_metadata?.full_name ||
                supabaseUser.email?.split("@")[0],
            },
          });
        } else if (!(user as { supabaseId?: string | null }).supabaseId) {
          // Link if supabaseId is missing
          await prisma.user.update({
            where: { id: user.id },
            data: {
              supabaseId: supabaseUser.id,
            },
          });
        }

        return response;
      } catch (syncError: unknown) {
        console.error("Prisma Sync Error:", syncError);
        // Still proceed with the response since the user is authenticated in Supabase
        return response;
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/login?error=Could not authenticate user`,
  );
}
