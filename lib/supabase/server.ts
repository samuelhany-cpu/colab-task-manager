import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();
          return allCookies;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("getCurrentUser: Supabase getUser error:", error.message);
  }

  if (!supabaseUser) {
    return null;
  }

  const { prisma } = await import("@/lib/prisma");

  // 1. Try finding by supabaseId first
  let user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (!user && supabaseUser.email) {
    // 2. Fallback to email lookup
    user = await prisma.user.findUnique({
      where: { email: supabaseUser.email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: supabaseUser.id },
      });
    }
  }

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email || "",
          name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.email?.split("@")[0] ||
            "Unknown User",
        },
      });
    } catch (syncError) {
      console.error("getCurrentUser: Fail-safe creation failed:", syncError);
      return null;
    }
  }

  return user;
}
